import { NextResponse } from 'next/server';
import { requireMaintainerOrAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { analyzeMcqInChunks } from '@/lib/services/aiImport';
import { isAzureConfigured, chatCompletions } from '@/lib/services/azureOpenAI';
import { canonicalizeHeader } from '@/lib/importUtils';
import { read, utils, write } from 'xlsx';

type SheetName = 'qcm' | 'cas_qcm' | 'qroc' | 'cas_qroc';

type AiStats = {
  totalRows: number;
  mcqRows: number;
  processedBatches: number;
  totalBatches: number;
  logs: string[];
  fixedCount?: number;
  errorCount?: number;
  reasonCounts?: Record<string, number>;
  errorsPreview?: Array<{ sheet: string; row: number; reason: string; question?: string; questionNumber?: number | null }>;
};

type AiSession = {
  id: string;
  progress: number; // 0..100
  message: string;
  logs: string[];
  phase: 'queued' | 'running' | 'complete' | 'error';
  error?: string;
  stats: AiStats;
  createdAt: number;
  lastUpdated: number;
  // Owner and file metadata for background resume
  userId?: string;
  fileName?: string;
  resultBuffer?: ArrayBuffer; // XLSX bytes
};

const globalAny = globalThis as any;
if (!globalAny.__activeAiSessions) {
  globalAny.__activeAiSessions = new Map<string, AiSession>();
}
const activeAiSessions: Map<string, AiSession> = globalAny.__activeAiSessions;

const SESSION_TTL_MS = 30 * 60 * 1000;
if (!(global as any).__aiCleanerStarted) {
  (global as any).__aiCleanerStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [id, s] of activeAiSessions.entries()) {
      const done = s.phase === 'complete' || s.phase === 'error';
      if (done && now - s.lastUpdated > SESSION_TTL_MS) activeAiSessions.delete(id);
    }
  }, 5 * 60 * 1000).unref?.();
}

function updateSession(id: string, patch: Partial<AiSession>, log?: string) {
  const s = activeAiSessions.get(id);
  if (!s) return;
  const logs = log ? [...s.logs, log] : s.logs;
  activeAiSessions.set(id, { ...s, ...patch, logs, lastUpdated: Date.now() });
}

function normalizeSheetName(name: string) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mapSheetName(s: string): SheetName | null {
  const n = normalizeSheetName(s);
  if (n === 'qcm' || n === 'questions qcm') return 'qcm';
  if (n === 'qroc' || n === 'croq' || n === 'questions qroc' || n === 'questions croq') return 'qroc';
  if (n === 'cas qcm' || n === 'cas-qcm' || n === 'cas_qcm' || n === 'cas clinic qcm' || n === 'cas clinique qcm') return 'cas_qcm';
  if (n === 'cas qroc' || n === 'cas-qroc' || n === 'cas_qroc' || n === 'cas clinic qroc' || n === 'cas clinique qroc' || n === 'cas croq' || n === 'cas clinic croq') return 'cas_qroc';
  return null;
}

// Clean up a free-form source/session string:
// - strip any () and [] characters
// - remove surrounding quotes/brackets once
// - collapse whitespace and commas
// - clear if it becomes only a bare niveau without year/session
function cleanSource(raw?: string | null): string {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^\s*[\[(\"']\s*/, '').replace(/\s*[\])\"']\s*$/, '');
  s = s.replace(/[\[\]()]/g, ''); // drop bracket chars anywhere
  s = s.replace(/\s*,\s*/g, ', '); // normalize commas
  s = s.replace(/\s+/g, ' ').trim();
  const onlyNiveau = /^(PCEM\s*\d|DCEM\s*\d|NIVEAU\s*\d)$/i.test(s) || /^(PCEM\d|DCEM\d)$/i.test(s);
  const hasYearOrSession = /(19|20)\d{2}|session|rattrapage|principal/i.test(s);
  if (!hasYearOrSession && onlyNiveau) return '';
  return s;
}

async function runAiSession(file: File, instructions: string | undefined, aiId: string) {
  try {
    updateSession(aiId, { phase: 'running', message: 'Lecture du fichier…', progress: 5 }, '📖 Lecture du fichier…');
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);

    // Validate workbook has sheets
    const sheetNames = Object.keys(workbook.Sheets || {});
    if (!sheetNames.length) {
      throw new Error(
        'Workbook vide. Assurez-vous que le fichier contient au moins une feuille nommée: "qcm", "qroc", "cas qcm" ou "cas qroc" (insensible à la casse).'
      );
    }

    // Gather rows and MCQ items
    const rows: Array<{ sheet: SheetName; row: number; original: Record<string, any> }> = [];
    let recognizedSheetCount = 0;
    for (const s of Object.keys(workbook.Sheets)) {
      const ws = workbook.Sheets[s];
      const data = utils.sheet_to_json(ws, { header: 1 });
      if (data.length < 2) continue;
      const headerRaw = (data[0] as string[]).map(h => String(h ?? ''));
      const header = headerRaw.map(canonicalizeHeader);
      const canonicalName = mapSheetName(s);
      const isErrorExport = !canonicalName && header.includes('sheet');
      if (isErrorExport) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const record: Record<string, any> = {};
          header.forEach((h, idx) => { record[h] = String((row as any[])[idx] ?? '').trim(); });
          const target = mapSheetName(String(record['sheet'] || '')) || 'qcm';
          rows.push({ sheet: target, row: i + 1, original: record });
        }
      } else if (canonicalName) {
        recognizedSheetCount++;
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const record: Record<string, any> = {};
          header.forEach((h, idx) => { record[h] = String((row as any[])[idx] ?? '').trim(); });
          rows.push({ sheet: canonicalName, row: i + 1, original: record });
        }
      }
    }

    // If nothing parsed, guide user to proper sheet names
    if (rows.length === 0) {
      if (recognizedSheetCount === 0) {
        throw new Error(
          `Aucune feuille reconnue. Renommez vos onglets en: "qcm", "qroc", "cas qcm" ou "cas qroc" (insensible à la casse). Feuilles trouvées: ${sheetNames.join(', ')}`
        );
      } else {
        throw new Error(
          'Feuilles reconnues mais sans lignes de données (seulement l’en-tête). Ajoutez des questions sous l’en-tête puis réessayez.'
        );
      }
    }

  const mcqRows = rows.filter(r => r.sheet === 'qcm' || r.sheet === 'cas_qcm');
  // RAG disabled by default. Enable only if explicitly requested via env.
  const ENABLE_RAG = String(process.env.ENABLE_RAG || '').toLowerCase() === 'true';
  // Keep a small quoted sentence from RAG context (first strong snippet) to surface in explanations (only when RAG is enabled)
  const ragQuoteByIdx = new Map<number, string>();
    // Optional RAG enrichment (supports per (niveau,matiere) via RAG_INDEX_MAP JSON)
  const ragIndexIdGlobal = ENABLE_RAG ? (process.env.RAG_INDEX_ID || '') : '';
    let ragIndexMap: Record<string, string> = {};
    try {
      if (process.env.RAG_INDEX_MAP) ragIndexMap = JSON.parse(process.env.RAG_INDEX_MAP);
    } catch {
      // ignore parse errors
    }
    const hasMap = Object.keys(ragIndexMap).length > 0;
    // Canonicalization helpers so lookups don't fail due to accents/case/stars/trailing numbers
    const normalizeNiveau = (s?: string|null) => {
      const v = String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return v.replace(/[^a-z0-9]+/g, ' ').trim(); // e.g., "Dcem2" -> "dcem2"
    };
    const normalizeMatiere = (s?: string|null) => {
      let v = String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // drop accents
        .replace(/[\*\[\](){}]/g, ' '); // drop stars/brackets
      // Remove trailing level numbers like " 1", " 2*", etc., which often appear in exports
      v = v.replace(/\b\d+\*?\s*$/g, '');
      return v.replace(/[^a-z0-9]+/g, ' ').trim();
    };
    const normKeyFromPair = (niveau?: string|null, matiere?: string|null) => {
      const n = normalizeNiveau(niveau);
      const m = normalizeMatiere(matiere);
      return n && m ? `${n}|${m}` : (m ? `|${m}` : (n ? `${n}|` : ''));
    };
    const normKeyFromRawKey = (k: string) => {
      const [nv, mt] = String(k || '').split('|');
      return normKeyFromPair(nv ?? '', mt ?? '');
    };
    // Build a normalized view of the mapping
    const ragIndexMapNorm: Record<string, string> = {};
  if (hasMap) {
      for (const [k, v] of Object.entries(ragIndexMap)) {
        const nk = normKeyFromRawKey(k);
        if (nk) ragIndexMapNorm[nk] = v;
      }
    }
    function pickIndex(niveau: string|undefined|null, matiere: string|undefined|null): string|undefined {
      if (!hasMap) return ragIndexIdGlobal || undefined;
      const exact = ragIndexMapNorm[normKeyFromPair(niveau, matiere)];
      if (exact) return exact;
      // fallback: matiere only key stored as |<matiere>
      const byMat = ragIndexMapNorm[`|${normalizeMatiere(matiere)}`];
      if (byMat) return byMat;
      // last resort: niveau-only mapping if provided as "<niveau>|"
      const byNiv = ragIndexMapNorm[`${normalizeNiveau(niveau)}|`];
      if (byNiv) return byNiv;
      return ragIndexIdGlobal || undefined;
    }
    // Extract niveau/matiere with fallbacks from various columns or the source path
    function extractNiveauMatiere(rec: Record<string, any>): { niveau?: string; matiere?: string } {
      let niveauVal: string | undefined = rec['niveau'] || rec['niveau '] || rec['level'] || rec['Niveau'] || rec['NIVEAU'];
      let matiereVal: string | undefined = rec['matiere'] || rec['matiere '] || rec['matière'] || rec['Matiere'] || rec['MATIERE'] || rec['matière '];
      const sourceRaw: string = String(rec['source'] ?? '').trim();
      const coursRaw: string = String(rec['cours'] ?? '').trim();
      if (!niveauVal && sourceRaw) {
        const m = sourceRaw.match(/\b(PCEM\s*\d|DCEM\s*\d)\b/i);
        if (m) niveauVal = m[1].toUpperCase().replace(/\s+/g, ''); // e.g., DCEM 3 -> DCEM3
      }
      if (!matiereVal && coursRaw) {
        matiereVal = coursRaw;
      }
      if (!matiereVal && sourceRaw && /\//.test(sourceRaw)) {
        const parts = sourceRaw.split(/[\\/]+/).filter(Boolean);
        // Heuristic: if parts[0] looks like niveau, take parts[1] as matiere
        if (parts.length >= 2 && /^(PCEM\d|DCEM\d)$/i.test(parts[0])) {
          matiereVal = parts[1];
          if (!niveauVal) niveauVal = parts[0].toUpperCase();
        }
      }
      // If still nothing for matiere and niveau exists, default matiere to niveau (consistent with ingestion rule)
      if (!matiereVal && niveauVal) matiereVal = niveauVal;
      return { niveau: niveauVal, matiere: matiereVal };
    }
  const items = await Promise.all(mcqRows.map(async (r, idx) => {
  const rec = r.original;
      const { niveau: niveauFromRec, matiere: matiereFromRec } = extractNiveauMatiere(rec);
      const opts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const v = rec[`option ${String.fromCharCode(97 + i)}`];
        const s = v == null ? '' : String(v).trim();
        if (s) opts.push(s);
      }
      let questionText = String(rec['texte de la question'] || '').trim();
      const niveauVal = niveauFromRec;
      const matiereVal = matiereFromRec;
  const chosenIndex = ENABLE_RAG ? pickIndex(niveauVal, matiereVal) : undefined;
  // If RAG is enabled and an index is available, enrich the question with context; otherwise skip.
  if (ENABLE_RAG && chosenIndex && questionText) {
        try {
          // Use notebook approach: search for question + each option independently
          const searchQueries = [questionText];
          
          // Add each option as separate search query (notebook logic)
          for (let i = 0; i < opts.length; i++) {
            if (opts[i]) {
              searchQueries.push(opts[i]);
            }
          }
          
          // Search with higher k like notebook (k=10)
          const { searchIndex } = await import('@/lib/services/ragDb');
          const allResults = await Promise.all(
            searchQueries.map(query => searchIndex(chosenIndex!, query, 10))
          );
          
          // Combine and deduplicate results
          const seenChunks = new Set<string>();
          const combinedResults: Array<{ text: string; score: number }> = [];
          
          for (const results of allResults) {
            if (results?.length) {
              for (const result of results) {
                const text = (result.text || '').trim();
                if (text && !seenChunks.has(text)) {
                  seenChunks.add(text);
                  combinedResults.push({ text, score: result.score || 0 });
                }
              }
            }
          }
          
          // Sort by score and take top chunks
          combinedResults.sort((a, b) => b.score - a.score);
          const topResults = combinedResults.slice(0, 8); // More chunks like notebook
          
          if (topResults.length) {
            // Build context with more generous token limit (notebook style)
            let acc = '';
            let firstSnippet: string | null = null;
            
            for (const result of topResults) {
              const snippet = result.text.replace(/\s+/g,' ').trim();
              if (!snippet) continue;
              
              // More generous limit (notebook uses more context)
              if ((acc + snippet).length > 2500) break;
              acc += (acc ? '\n\n' : '') + `• ${snippet}`;
              
              if (!firstSnippet && snippet) {
                // Keep a longer, more complete sentence (notebook style)
                const sentences = snippet.match(/[^.!?]*[.!?]/g);
                if (sentences && sentences[0]) {
                  firstSnippet = sentences[0].trim();
                } else {
                  // Fallback to punctuation boundary
                  const m = snippet.match(/^(.{1,400}?[\.\!\?])(\s|$)/);
                  firstSnippet = (m ? m[1] : snippet.slice(0, 300)).trim();
                }
              }
            }
            
            if (acc) {
              const metaLine = [niveauVal?`niveau=${niveauVal}`:null, matiereVal?`matiere=${matiereVal}`:null].filter(Boolean).join(' ');
              questionText = `CONTEXTE (extraits cours${metaLine?` | ${metaLine}`:''}):\n${acc}\n\nQUESTION:\n${questionText}`;
              if (firstSnippet) {
                ragQuoteByIdx.set(idx, firstSnippet);
              }
            }
          }
        } catch (e) {
          // Non bloquant: on ignore en cas d'erreur RAG
          console.warn(`RAG search failed for question ${idx}:`, e);
        }
      }
      return { id: `${idx}`, questionText, options: opts, providedAnswerRaw: String(rec['reponse'] || '').trim() };
    }));

    updateSession(aiId, {
      message: 'Analyse IA…',
      progress: 10,
      stats: { totalRows: rows.length, mcqRows: items.length, processedBatches: 0, totalBatches: Math.ceil(items.length / 50), logs: [] }
  }, `🧠 Démarrage IA: ${items.length} questions MCQ${hasMap ? ' (RAG map)' : (ragIndexIdGlobal ? ' (RAG)' : '')}`);

    const t0 = Date.now();
    let processed = 0;
    const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 100);
    const CONCURRENCY = Number(process.env.AI_CONCURRENCY || 6);
    const resultMap = await analyzeMcqInChunks(items, {
      batchSize: BATCH_SIZE,
      concurrency: CONCURRENCY,
      systemPrompt: instructions,
      onBatch: ({ index, total }) => {
        processed = index;
        const p = 10 + Math.floor((index / total) * 75);
        updateSession(
          aiId,
          { message: `Traitement lot ${index}/${total}…`, progress: Math.min(85, p), stats: { ...activeAiSessions.get(aiId)!.stats, processedBatches: index, totalBatches: total } },
          `📦 Lot ${index}/${total} (batch=${BATCH_SIZE}, conc=${CONCURRENCY})`
        );
      }
    });

    // Also analyze QROC/CAS_QROC to generate missing explanations
    const qrocRows = rows.filter(r => r.sheet === 'qroc' || r.sheet === 'cas_qroc');
    type QrocItem = { id: string; questionText: string; answerText?: string; caseText?: string };
    const qrocItems: QrocItem[] = qrocRows.map((r, idx) => ({
      id: String(idx),
      questionText: String(r.original['texte de la question'] || '').trim(),
      answerText: String(r.original['reponse'] || '').trim(),
      caseText: String(r.original['texte du cas'] || '').trim() || undefined
    }));

  const qrocSystemPrompt = `Tu aides des étudiants en médecine. Pour chaque question QROC:
1. Si la réponse est vide: status="error" et error="Réponse manquante" (pas d'explication).
2. Sinon, génère UNE explication concise (1-3 phrases) style étudiant (pas d'intro/conclusion globales), éventuellement plus longue si un mécanisme doit être clarifié.
3. Pas de ton professoral; utilise un style naturel.
4. Si la réponse semble incorrecte ou incohérente, status="error" avec une courte explication dans error au lieu d'une explication normale.
5. Sortie JSON STRICT uniquement (le mot JSON est présent pour contrainte Azure).
Format:
{
  "results": [ { "id": "<id>", "status": "ok" | "error", "explanation": "...", "error": "..." } ]
}`;

    async function analyzeQrocBatch(batch: QrocItem[]): Promise<Map<string, { status: 'ok'|'error'; explanation?: string; error?: string }>> {
      if (!batch.length) return new Map();
      const user = JSON.stringify({ task: 'qroc_explanations', items: batch });
      const content = await chatCompletions([
        { role: 'system', content: qrocSystemPrompt },
        { role: 'user', content: user }
      ]);
      let parsed: any = null;
      try { parsed = JSON.parse(content); } catch { parsed = { results: [] }; }
      const out = new Map<string, { status: 'ok'|'error'; explanation?: string; error?: string }>();
      const arr = Array.isArray(parsed?.results) ? parsed.results : [];
      for (const r of arr) {
        const id = String(r?.id ?? '');
        const st = r?.status === 'ok' ? 'ok' : 'error';
        out.set(id, { status: st, explanation: typeof r?.explanation === 'string' ? r.explanation : undefined, error: typeof r?.error === 'string' ? r.error : undefined });
      }
      return out;
    }

    async function analyzeQrocInChunks(items: QrocItem[], batchSize = 10): Promise<Map<string, { status: 'ok'|'error'; explanation?: string; error?: string }>> {
      const map = new Map<string, { status: 'ok'|'error'; explanation?: string; error?: string }>();
      let batchIndex = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        batchIndex++;
        const batch = items.slice(i, i + batchSize);
        try {
          const res = await analyzeQrocBatch(batch);
          res.forEach((v, k) => map.set(k, v));
          updateSession(aiId, { message: `Traitement QROC ${batchIndex}/${Math.ceil(items.length / batchSize)}…`, progress: Math.min(90, 80 + Math.floor((i + batch.length) / Math.max(1, items.length) * 10)) }, `🧾 Lot QROC ${batchIndex}/${Math.ceil(items.length / batchSize)}`);
        } catch (e: any) {
          batch.forEach(b => map.set(b.id, { status: 'error', error: e?.message || 'Erreur IA QROC' }));
        }
      }
      return map;
    }

    const qrocResultMap = await analyzeQrocInChunks(qrocItems);

    updateSession(aiId, { message: 'Fusion des résultats…', progress: 90 }, '🧩 Fusion des résultats…');

    // Merge back with classification and reasons
    const letters = ['a','b','c','d','e'] as const;
  // Collect ALL rows (fixed or not) so output sheet counts match input counts
  const correctedBySheet: Record<SheetName, any[]> = { qcm: [], qroc: [], cas_qcm: [], cas_qroc: [] } as any;
    const errorsRows: Array<any> = [];
    let fixedCount = 0;
    let errorCount = 0;

    for (const r of rows) {
      const s: SheetName = r.sheet;
      const rec = { ...r.original } as any;
      let fixed = false;
      let reason: string | undefined;

  if (s === 'qcm' || s === 'cas_qcm') {
        const idx = mcqRows.indexOf(r as any);
        const ai = resultMap.get(String(idx));
        // Ensure options exist
        const options: string[] = [];
        for (let i = 0; i < 5; i++) {
          const key = `option ${String.fromCharCode(97 + i)}`;
          const val = rec[key];
          const v = val == null ? '' : String(val).trim();
          if (v) options.push(v);
        }
        if (!options.length) {
          reason = 'MCQ sans options';
        } else if (!ai) {
          reason = 'Résultat IA manquant';
        } else if (ai.status === 'error') {
          reason = `IA: ${ai.error || 'erreur'}`;
        } else {
          // status ok
          let changed = false;
          if (Array.isArray(ai.correctAnswers) && ai.correctAnswers.length) {
            const lettersAns = ai.correctAnswers.map((n: number) => String.fromCharCode(65 + n)).join(', ');
            if (lettersAns && lettersAns !== String(rec['reponse'] || '').trim()) {
              rec['reponse'] = lettersAns;
              changed = true;
            }
          } else if (ai.noAnswer) {
            if (String(rec['reponse'] || '').trim() !== '?') {
              rec['reponse'] = '?';
              changed = true;
            }
          }
          // Add explanations
          const base = String(rec['explication'] || '').trim();
          // If we had a RAG quote for this item, prepend a citation line once
          const ragQuote = ENABLE_RAG ? ragQuoteByIdx.get(idx) : undefined;
          // Build a small markdown block with Question/Options/Réponse(s) if not already present
          const questionMd = `Question:\n${String(rec['texte de la question'] || '').trim()}`;
          const optionsMd = options.length ? ('\n\nOptions:\n' + options.map((opt, j) => `- (${String.fromCharCode(65 + j)}) ${opt}`).join('\n')) : '';
          const reponseMd = `\n\nRéponse(s): ${String(rec['reponse'] || '').trim() || '?'}`;
          const qaMdBlock = `${questionMd}${optionsMd}${reponseMd}\n\n`;
          const hasQaMd = /\bOptions:\n- \(A\)/.test(base) || /^Question:/m.test(base);
          if (Array.isArray(ai.optionExplanations) && ai.optionExplanations.length) {
            const header = ai.globalExplanation ? ai.globalExplanation + '\n\n' : '';
            const merged = (hasQaMd ? '' : qaMdBlock) + header + 'Explications (IA):\n' + ai.optionExplanations.map((e: string, j: number) => `- (${String.fromCharCode(65 + j)}) ${e}`).join('\n');
            const newExp = base ? base + '\n\n' + merged : merged;
            if (newExp !== base) { rec['explication'] = newExp; changed = true; }
            for (let j = 0; j < Math.min(letters.length, ai.optionExplanations.length); j++) {
              const key = `explication ${letters[j]}`;
              const val = String(ai.optionExplanations[j] || '').trim();
              if (val && val !== String(rec[key] || '').trim()) { rec[key] = val; changed = true; }
            }
          } else if (ai.globalExplanation) {
            const quoteBlock = ragQuote ? `Citation du cours: \"${ragQuote}\"` : '';
            const merged = (hasQaMd ? '' : qaMdBlock) + (quoteBlock ? quoteBlock + '\n\n' : '') + String(ai.globalExplanation).trim();
            if (merged && !base.includes(merged)) { rec['explication'] = base ? base + '\n\n' + merged : merged; changed = true; }
          } else if (ragQuote && !base.includes('Citation du cours:')) {
            // Fallback: surface the citation line even if AI didn't provide explanations
            const merged = (hasQaMd ? '' : qaMdBlock) + `Citation du cours: \"${ragQuote}\"`;
            rec['explication'] = base ? base + '\n\n' + merged : merged;
            changed = true;
          }
          if (!changed) {
            reason = 'Aucun changement proposé par l’IA';
          } else {
            fixed = true;
          }
        }
      } else {
        // QROC / CAS QROC: try to fill missing explanation
        const idx = qrocRows.indexOf(r as any);
        const ai = qrocResultMap.get(String(idx));
        const hasAnswer = String(rec['reponse'] || '').trim().length > 0;
        const baseExp = String(rec['explication'] || '').trim();
        if (!hasAnswer) {
          reason = 'Réponse manquante';
        } else if (baseExp) {
          reason = 'Déjà expliqué';
        } else if (!ai) {
          reason = 'Résultat IA manquant';
        } else if (ai.status === 'error' || !ai.explanation) {
          reason = ai.error ? `IA: ${ai.error}` : 'IA: pas d’explication';
        } else {
          rec['explication'] = String(ai.explanation).trim();
          fixed = true;
        }
      }

      // Compute niveau/matiere for output as well
      const { niveau: outNiveau, matiere: outMatiere } = ((): { niveau?: string; matiere?: string } => {
        // reuse lightweight logic without redeclaring helpers at top-level
        let niveauVal: string | undefined = rec['niveau'] || rec['niveau '] || rec['level'] || rec['Niveau'] || rec['NIVEAU'];
        let matiereVal: string | undefined = rec['matiere'] || rec['matiere '] || rec['matière'] || rec['Matiere'] || rec['MATIERE'] || rec['matière '];
        const sourceRaw: string = String(rec['source'] ?? '').trim();
        const coursRaw: string = String(rec['cours'] ?? '').trim();
        if (!niveauVal && sourceRaw) {
          const m = sourceRaw.match(/\b(PCEM\s*\d|DCEM\s*\d)\b/i);
          if (m) niveauVal = m[1].toUpperCase().replace(/\s+/g, '');
        }
        if (!matiereVal && coursRaw) matiereVal = coursRaw;
        if (!matiereVal && sourceRaw && /\//.test(sourceRaw)) {
          const parts = sourceRaw.split(/[\\/]+/).filter(Boolean);
          if (parts.length >= 2 && /^(PCEM\d|DCEM\d)$/i.test(parts[0])) {
            matiereVal = parts[1];
            if (!niveauVal) niveauVal = parts[0].toUpperCase();
          }
        }
        if (!matiereVal && niveauVal) matiereVal = niveauVal;
        return { niveau: niveauVal, matiere: matiereVal };
      })();

      const obj: any = {
        niveau: outNiveau ?? '',
        matiere: outMatiere ?? '',
        cours: rec['cours'] ?? '',
        source: cleanSource(rec['source'] ?? ''),
        'question n': rec['question n'] ?? '',
        'texte de la question': rec['texte de la question'] ?? '',
        reponse: rec['reponse'] ?? '',
        'option a': rec['option a'] ?? '',
        'option b': rec['option b'] ?? '',
        'option c': rec['option c'] ?? '',
        'option d': rec['option d'] ?? '',
        'option e': rec['option e'] ?? '',
        explication: rec['explication'] ?? '',
        'explication a': rec['explication a'] ?? '',
        'explication b': rec['explication b'] ?? '',
        'explication c': rec['explication c'] ?? '',
        'explication d': rec['explication d'] ?? '',
        'explication e': rec['explication e'] ?? '',
        ai_status: fixed ? 'fixed' : 'unfixed',
        ai_reason: fixed ? '' : (reason || 'Non corrigé')
      };
      correctedBySheet[s].push(obj);
      if (fixed) {
        fixedCount++;
      } else {
        errorCount++;
  errorsRows.push({
          sheet: s,
          row: r.row,
            reason: reason || 'Non corrigé',
      niveau: outNiveau ?? '',
            matiere: rec['matiere'] ?? '',
            cours: rec['cours'] ?? '',
            source: cleanSource(rec['source'] ?? ''),
            'question n': rec['question n'] ?? '',
            'texte de la question': rec['texte de la question'] ?? '',
            reponse: rec['reponse'] ?? '',
            'option a': rec['option a'] ?? '',
            'option b': rec['option b'] ?? '',
            'option c': rec['option c'] ?? '',
            'option d': rec['option d'] ?? '',
            'option e': rec['option e'] ?? '',
            explication: rec['explication'] ?? ''
        });
      }
    }

    // Build workbook: per-type corrected sheets + Erreurs sheet
    const header = ['niveau','matiere','cours','source','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','explication a','explication b','explication c','explication d','explication e'];
    const wb = utils.book_new();
    (['qcm','qroc','cas_qcm','cas_qroc'] as SheetName[]).forEach(s => {
      const arr = correctedBySheet[s];
      if (arr && arr.length) {
        const ws = utils.json_to_sheet(arr, { header });
        utils.book_append_sheet(wb, ws, s);
      }
    });
    if (errorsRows.length) {
      const errHeader = ['sheet','row','reason','niveau','matiere','cours','source','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication'];
      const wsErr = utils.json_to_sheet(errorsRows, { header: errHeader });
      utils.book_append_sheet(wb, wsErr, 'Erreurs');
    }
    const xbuf = write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as ArrayBuffer;

    const reasonCounts: Record<string, number> = {};
    for (const er of errorsRows) {
      const r = String(er.reason || 'Non corrigé');
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
    // Prepare preview of first 50 errors for UI
    const errorsPreview = errorsRows.slice(0, 50).map(er => ({
      sheet: String(er.sheet),
      row: Number(er.row),
      reason: String(er.reason || ''),
      question: typeof er['texte de la question'] === 'string' ? String(er['texte de la question']).slice(0, 120) : undefined,
      questionNumber: (() => { const v = (er as any)['question n']; const n = Number.parseInt(String(v ?? '')); return Number.isFinite(n) ? n : null; })()
    }));

    // Log top reasons (up to 3)
    const topReasons = Object.entries(reasonCounts).sort((a,b) => b[1]-a[1]).slice(0,3);
    if (topReasons.length) {
      const summary = topReasons.map(([k,v]) => `${k}: ${v}`).join(' • ');
      updateSession(aiId, {}, `📊 Motifs principaux: ${summary}`);
    }
    updateSession(
      aiId,
      {
        resultBuffer: xbuf,
        phase: 'complete',
        progress: 100,
        message: 'IA terminée',
  stats: { ...activeAiSessions.get(aiId)!.stats, fixedCount, errorCount, reasonCounts, errorsPreview }
      },
      `✅ Corrigés: ${fixedCount} • ❌ Restent en erreur: ${errorCount}`
    );
  } catch (e: any) {
    updateSession(aiId, { phase: 'error', error: e?.message || 'Erreur IA', message: 'Erreur IA', progress: 100 }, `❌ Erreur: ${e?.message || 'Erreur IA'}`);
  }
}

async function postHandler(request: AuthenticatedRequest) {
  if (!isAzureConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
  const form = await request.formData();
  const file = form.get('file') as File | null;
  const instructions = typeof form.get('instructions') === 'string' ? String(form.get('instructions')) : undefined;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  const aiId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();
  const sess: AiSession = {
    id: aiId,
    progress: 0,
    message: 'En file d\'attente…',
    logs: [],
    phase: 'queued',
  stats: { totalRows: 0, mcqRows: 0, processedBatches: 0, totalBatches: 0, logs: [], fixedCount: 0, errorCount: 0, reasonCounts: {} },
    createdAt: now,
  lastUpdated: now,
  userId: request.user?.userId,
  fileName: file.name,
  };
  activeAiSessions.set(aiId, sess);
  // Start background
  runAiSession(file, instructions, aiId).catch(() => {});
  return NextResponse.json({ aiId });
}

async function getHandler(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url);
  const aiId = searchParams.get('aiId');
  const action = searchParams.get('action');
  // List all user jobs for background resume
  if (action === 'list') {
    const userId = request.user?.userId;
    const items = Array.from(activeAiSessions.values())
      .filter(s => !userId || s.userId === userId)
      .map(s => ({ id: s.id, phase: s.phase, progress: s.progress, message: s.message, createdAt: s.createdAt, lastUpdated: s.lastUpdated, fileName: s.fileName }))
      .sort((a,b) => b.createdAt - a.createdAt)
      .slice(0, 5);
    return NextResponse.json({ jobs: items });
  }

  if (!aiId) return NextResponse.json({ error: 'aiId required' }, { status: 400 });
  const sess = activeAiSessions.get(aiId);
  if (!sess) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/event-stream')) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;
        let timer: ReturnType<typeof setInterval> | null = null;

        const safeSend = (data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Sink likely closed by client; stop sending
            closed = true;
            if (timer) { clearInterval(timer); timer = null; }
            try { controller.close(); } catch {}
          }
        };

        // Send initial snapshot
        safeSend({ ...sess, resultBuffer: undefined });

        // Periodically send updates until complete or client disconnects
        timer = setInterval(() => {
          const s = activeAiSessions.get(aiId);
          if (!s) {
            if (timer) { clearInterval(timer); timer = null; }
            closed = true;
            try { controller.close(); } catch {}
            return;
          }
          safeSend({ ...s, resultBuffer: undefined });
          if (s.phase === 'complete' || s.phase === 'error') {
            if (timer) { clearInterval(timer); timer = null; }
            closed = true;
            try { controller.close(); } catch {}
          }
        }, 800);
      },
      cancel() {
        // Client disconnected; ensure interval cleared
        // No direct access to timer here if we make it outer, so rely on GC if already cleared
      }
    });
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  }

  if (action === 'download') {
    if (!sess.resultBuffer) return NextResponse.json({ error: 'no result' }, { status: 400 });
    return new NextResponse(sess.resultBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ai_fixed_${aiId}.xlsx"`
      }
    });
  }

  return NextResponse.json({ ...sess, resultBuffer: undefined });
}

export const POST = requireMaintainerOrAdmin(postHandler);
export const GET = requireMaintainerOrAdmin(getHandler);

export async function OPTIONS() { return new NextResponse(null, { status: 200 }); }
