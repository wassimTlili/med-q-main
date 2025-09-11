import { NextResponse } from 'next/server';
import { requireMaintainerOrAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { analyzeMcqInChunks } from '@/lib/services/aiImport';
import { isAzureConfigured } from '@/lib/services/azureOpenAI';
import { canonicalizeHeader, parseMCQOptions } from '@/lib/importUtils';
import { read, utils } from 'xlsx';

type SheetName = 'qcm' | 'cas_qcm' | 'qroc' | 'cas_qroc';

export const POST = requireMaintainerOrAdmin(async (request: AuthenticatedRequest) => {
  if (!isAzureConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
  // Support both JSON and multipart (file) payloads
  const contentType = request.headers.get('content-type') || '';
  let rows: Array<{ sheet: SheetName; row: number; original: Record<string, any> }> = [];
  let instructions: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    instructions = typeof form.get('instructions') === 'string' ? String(form.get('instructions')) : undefined;
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
    // Parse workbook; can be a "bad" export with a single sheet (Erreurs) or a normal workbook with qcm/cas_qcm etc.
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const sheetNames = Object.keys(workbook.Sheets);
    const pushRow = (sheet: SheetName, rowIndex: number, record: Record<string, any>) => {
      rows.push({ sheet, row: rowIndex, original: record });
    };
    const normalizeSheet = (name: string) => String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const mapSheetName = (s: string): SheetName | null => {
      const n = normalizeSheet(s);
      if (n === 'qcm' || n === 'questions qcm') return 'qcm';
      if (n === 'qroc' || n === 'croq' || n === 'questions qroc' || n === 'questions croq') return 'qroc';
      if (n === 'cas qcm' || n === 'cas-qcm' || n === 'cas_qcm' || n === 'cas clinic qcm' || n === 'cas clinique qcm') return 'cas_qcm';
      if (n === 'cas qroc' || n === 'cas-qroc' || n === 'cas_qroc' || n === 'cas clinic qroc' || n === 'cas clinique qroc' || n === 'cas croq' || n === 'cas clinic croq') return 'cas_qroc';
      return null;
    };
    for (const s of sheetNames) {
      const ws = workbook.Sheets[s];
      const data = utils.sheet_to_json(ws, { header: 1 });
      if (data.length < 2) continue;
      const headerRaw = (data[0] as string[]).map(h => String(h ?? ''));
      const header = headerRaw.map(canonicalizeHeader);
      const canonicalName = mapSheetName(s);
      const isErrorExport = !canonicalName && header.includes('sheet');
      if (isErrorExport) {
        // Read each row and use 'sheet' column to decide target sheet
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const record: Record<string, any> = {};
          header.forEach((h, idx) => { record[h] = String((row as any[])[idx] ?? '').trim(); });
          const target = mapSheetName(String(record['sheet'] || '')) || 'qcm';
          pushRow(target, i + 1, record);
        }
      } else if (canonicalName) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          const record: Record<string, any> = {};
          header.forEach((h, idx) => { record[h] = String((row as any[])[idx] ?? '').trim(); });
          pushRow(canonicalName, i + 1, record);
        }
      }
    }
    if (!rows.length) return NextResponse.json({ error: 'No rows found in file' }, { status: 400 });
  } else {
    const body = await request.json();
    const inputRows = body?.rows as Array<{ sheet: SheetName; row: number; original: Record<string, any> }> | undefined;
    instructions = typeof body?.instructions === 'string' && body.instructions.trim() ? String(body.instructions) : undefined;
    if (!inputRows || !Array.isArray(inputRows)) return NextResponse.json({ error: 'rows required' }, { status: 400 });
    rows = inputRows;
  }

  // Prepare MCQ items for AI (qcm and cas_qcm only)
  const mcqRows = rows.filter(r => r.sheet === 'qcm' || r.sheet === 'cas_qcm');
  console.info(`[AI] Validation AI request: totalRows=${rows.length}, mcqRows=${mcqRows.length}${instructions && instructions.trim() ? ', customInstructions=true' : ''}`);
  const items = mcqRows.map((r, idx) => {
    const record = r.original;
    const qText = String(record['texte de la question'] || '').trim();
    const options: string[] = [];
    for (let i = 0; i < 5; i++) {
      const key = `option ${String.fromCharCode(97 + i)}`;
      const v = record[key];
      const s = v == null ? '' : String(v).trim();
      if (s) options.push(s);
    }
    return { id: `${idx}`, questionText: qText, options, providedAnswerRaw: String(record['reponse'] || '').trim() };
  });
  const startedAt = Date.now();
  const resultMap = await analyzeMcqInChunks(items, {
    batchSize: 50,
    concurrency: 4,
    systemPrompt: instructions,
    onBatch: ({ index, total }) => {
      console.info(`[AI] Processing batch ${index}/${total} (batchSize=50, concurrency=4)`);
    }
  });
  console.info(`[AI] Validation AI completed: items=${items.length}, durationMs=${Date.now() - startedAt}`);

  // Merge AI outputs back
  const fixed = rows.map(r => {
    if (r.sheet === 'qcm' || r.sheet === 'cas_qcm') {
      const idx = mcqRows.indexOf(r as any);
      const ai = resultMap.get(String(idx));
      const record = { ...r.original };
      if (ai && ai.status === 'ok') {
        if (Array.isArray(ai.correctAnswers) && ai.correctAnswers.length) {
          const letters = ai.correctAnswers.map((n: number) => String.fromCharCode(65 + n));
          record['reponse'] = letters.join(', ');
        } else if (ai.noAnswer) {
          record['reponse'] = '?';
        }
        if (Array.isArray(ai.optionExplanations) && ai.optionExplanations.length) {
          const merged = (ai.globalExplanation ? ai.globalExplanation + '\n\n' : '') + 'Explications (IA):\n' + ai.optionExplanations.map((e: string, j: number) => `(${String.fromCharCode(65 + j)}) ${e}`).join('\n');
          const base = String(record['explication'] || '').trim();
          record['explication'] = base ? base + '\n\n' + merged : merged;
          // Also fill per-option explanation columns
          const letters = ['a','b','c','d','e'] as const;
          for (let j = 0; j < Math.min(letters.length, ai.optionExplanations.length); j++) {
            record[`explication ${letters[j]}`] = String(ai.optionExplanations[j] || '').trim();
          }
        }
      }
      return { ...r, fixed: record };
    }
    // For QROC and cas_qroc we currently just pass-through (future: LLM could normalize answers/explanations)
    return { ...r, fixed: r.original };
  });
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  if (format === 'xlsx') {
    // Build workbook with four sheets and fixed rows
    const bySheet: Record<SheetName, any[]> = { qcm: [], qroc: [], cas_qcm: [], cas_qroc: [] } as any;
    for (const r of fixed) {
      const rec = (r as any).fixed || (r as any).original || {};
      const s: SheetName = (r as any).sheet;
      const obj: any = {
        matiere: rec['matiere'] ?? '',
        cours: rec['cours'] ?? '',
        'question n': rec['question n'] ?? '',
        'texte de la question': rec['texte de la question'] ?? '',
        reponse: rec['reponse'] ?? '',
        'option a': rec['option a'] ?? '',
        'option b': rec['option b'] ?? '',
        'option c': rec['option c'] ?? '',
        'option d': rec['option d'] ?? '',
        'option e': rec['option e'] ?? '',
        explication: rec['explication'] ?? ''
      };
      bySheet[s].push(obj);
    }
  const header = ['matiere','cours','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','explication a','explication b','explication c','explication d','explication e'];
    const wb = utils.book_new();
    (['qcm','qroc','cas_qcm','cas_qroc'] as SheetName[]).forEach(s => {
      const arr = bySheet[s];
      if (arr && arr.length) {
        const ws = utils.json_to_sheet(arr, { header });
        utils.book_append_sheet(wb, ws, s);
      }
    });
    const buffer = (await import('xlsx')).write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ai_fixed.xlsx"'
      }
    });
  }

  return NextResponse.json({ fixedCount: fixed.length, fixed });
});
