// Single implementation kept below
import { chatCompletions, isAzureConfigured } from './azureOpenAI';

export type MCQAiItem = {
  id: string; // unique per row (e.g., `${sheet}:${index}`)
  questionText: string;
  options: string[]; // A..E length <= 5
  providedAnswerRaw?: string; // e.g., "A, C" or "?" etc.
};

export type MCQAiResult = {
  id: string;
  status: 'ok' | 'error';
  correctAnswers?: number[]; // indices in options
  noAnswer?: boolean;
  optionExplanations?: string[]; // same length as options
  globalExplanation?: string;
  error?: string;
};

// Nouveau prompt enrichi (FR) pour correction de QCM médicaux avec style étudiant + RAG éventuel.
// IMPORTANT: la sortie DOIT rester du JSON strict pour préserver la compatibilité côté serveur.
// Les explications par option doivent suivre les règles de style demandées (connecteur varié, citation directe si disponible, raisonnement concis).
const DEFAULT_SYSTEM_PROMPT = `Tu aides des étudiants en médecine à corriger des QCM.
STYLE & TON:
- Écris comme un excellent étudiant de dernière année qui explique rapidement à des camarades (pas de ton professoral ni de formules d'introduction / conclusion globales).
- Chaque option reçoit 1 à 2 phrases le plus souvent, mais peut être plus longue si nécessaire pour justifier correctement. Pas de limitation artificielle.
- Varie systématiquement les connecteurs initiaux: "Oui", "Exact", "Effectivement", "Au contraire", "Non, en fait", "Plutôt", "Pas vraiment", "Correct", "Faux", "Juste"…

CITATIONS / SOURCES:
- Si un contexte ou des extraits de cours ("sources") sont inclus dans le texte de la question ou dans une future version via un champ context (non garanti ici), tu peux reprendre UNE phrase entière pertinente entre guillemets sans écrire "selon la source".
- Si aucune information ne supporte directement l'option, raisonne brièvement.
- Si l'information manque totalement, tu peux marquer l'option comme incertaine mais alors renvoie status="error" pour l'item (rare). Préfère néanmoins décider vrai/faux sur la base des connaissances médicales standard.

OBJECTIF PAR ITEM:
1. Déterminer les options correctes (indices dans correctAnswers).
2. Si aucune option correcte: noAnswer=true et correctAnswers=[].
3. Produire pour CHAQUE option une explication courte commençant par un connecteur varié ET justifiant pourquoi VRAI ou FAUX (ou mécanisme, épidémiologie, cause/conséquence, chiffre si typique disponible).
4. Fournir globalExplanation synthétisant en 1 à 2 phrases le point clé ou la logique commune (optionnel si déjà tout clair, mais préférable).

FORMAT JSON STRICT (aucun texte hors JSON):
{
  "results": [
    {
      "id": "<id fourni>",
      "status": "ok" | "error",
      "correctAnswers": [0,2],
      "noAnswer": false,
      "optionExplanations": [
        "Connecteur + justification option A",
        "Connecteur + justification option B",
        "..."
      ],
      "globalExplanation": "Synthèse finale concise",
      "error": "<présente uniquement si status=error>"
    }
  ]
}

CONTRAINTES:
- Ne fournis JAMAIS plus d'explications que d'options (longueur exacte = nombre d'options reçues).
- Aucune clé supplémentaire.
- Pas de markdown.
- Pas d'introduction ni conclusion générale.
- Si incertitude majeure empêchant décision fiable pour ≥1 option: status="error" et message dans error (sinon status="ok").
- Évite les répétitions exactes d'un même connecteur sur deux options consécutives si possible.

RAPPEL: Réponds uniquement avec le JSON.`;

function buildUserPrompt(items: MCQAiItem[]) {
  return JSON.stringify({
    task: 'analyze_mcq_batch',
    items: items.map(i => ({ id: i.id, questionText: i.questionText, options: i.options, providedAnswerRaw: i.providedAnswerRaw || null }))
  });
}

export async function analyzeMcqBatch(items: MCQAiItem[], systemPrompt?: string): Promise<MCQAiResult[]> {
  if (!isAzureConfigured()) {
    // If not configured, return error results so caller can fallback
    return items.map(i => ({ id: i.id, status: 'error', error: 'Azure OpenAI not configured' }));
  }
  const sys = systemPrompt || process.env.AI_IMPORT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
  const user = buildUserPrompt(items);
  console.info(`[AI] analyzeMcqBatch: size=${items.length}${systemPrompt ? ', customPrompt=true' : ''}`);
  const content = await chatCompletions([
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ]);
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // If model returns non-JSON, mark all as error
    return items.map(i => ({ id: i.id, status: 'error', error: 'Non-JSON response from AI' }));
  }
  const results: MCQAiResult[] = [];
  const byId = new Map<string, MCQAiResult>();
  const arr = Array.isArray(parsed?.results) ? parsed.results : [];
  for (const r of arr) {
    const id = String(r?.id ?? '');
    const res: MCQAiResult = {
      id,
      status: r?.status === 'ok' ? 'ok' : 'error',
      correctAnswers: Array.isArray(r?.correctAnswers) ? r.correctAnswers.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x)) : undefined,
      noAnswer: !!r?.noAnswer,
      optionExplanations: Array.isArray(r?.optionExplanations) ? r.optionExplanations.map((s: any) => String(s)) : undefined,
      globalExplanation: typeof r?.globalExplanation === 'string' ? r.globalExplanation : undefined,
      error: typeof r?.error === 'string' ? r.error : undefined
    };
    byId.set(id, res);
    results.push(res);
  }
  // Ensure every item has a result
  for (const it of items) {
    if (!byId.has(it.id)) {
      results.push({ id: it.id, status: 'error', error: 'Missing result for item' });
    }
  }
  return results;
}

export async function analyzeMcqInChunks(items: MCQAiItem[], options?: { batchSize?: number; concurrency?: number; systemPrompt?: string; onBatch?: (info: { index: number; total: number }) => void; }): Promise<Map<string, MCQAiResult>> {
  const batchSize = options?.batchSize ?? 50;
  const concurrency = options?.concurrency ?? 4;
  const systemPrompt = options?.systemPrompt;
  console.info(`[AI] analyzeMcqInChunks: items=${items.length}, batchSize=${batchSize}, concurrency=${concurrency}${systemPrompt ? ', customPrompt=true' : ''}`);
  const results = new Map<string, MCQAiResult>();
  let i = 0;
  const batches: MCQAiItem[][] = [];
  while (i < items.length) {
    batches.push(items.slice(i, i + batchSize));
    i += batchSize;
  }
  console.info(`[AI] analyzeMcqInChunks: totalBatches=${batches.length}`);
  let idx = 0;
  async function runBatch(bIndex: number) {
    const batch = batches[bIndex];
    if (!batch) return;
    const t0 = Date.now();
    options?.onBatch?.({ index: bIndex + 1, total: batches.length });
    try {
      const res = await analyzeMcqBatch(batch, systemPrompt);
      for (const r of res) results.set(r.id, r);
      console.info(`[AI] Batch ${bIndex + 1}/${batches.length} done in ${Date.now() - t0}ms, size=${batch.length}`);
    } catch (e: any) {
      for (const it of batch) {
        results.set(it.id, { id: it.id, status: 'error', error: e?.message || 'AI batch error' });
      }
      console.info(`[AI] Batch ${bIndex + 1}/${batches.length} failed in ${Date.now() - t0}ms: ${e?.message || 'error'}`);
    }
  }
  const runners: Promise<void>[] = [];
  for (let c = 0; c < Math.min(concurrency, batches.length); c++) {
    console.info(`[AI] Starting worker ${c + 1}/${Math.min(concurrency, batches.length)}`);
    runners.push((async function loop() {
      while (true) {
        const myIndex = idx++;
        if (myIndex >= batches.length) break;
        await runBatch(myIndex);
      }
    })());
  }
  const started = Date.now();
  await Promise.all(runners);
  console.info(`[AI] analyzeMcqInChunks completed in ${Date.now() - started}ms`);
  return results;
}
