import { NextRequest, NextResponse } from 'next/server';
import { read, utils, write } from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requireMaintainerOrAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';
import { canonicalizeHeader, extractImageUrlAndCleanText, isExplicitNoAnswer, parseMCQOptions } from '@/lib/importUtils';

// Types for structured validation results
type SheetName = 'qcm' | 'qroc' | 'cas_qcm' | 'cas_qroc';
type GoodRow = { sheet: SheetName; row: number; data: Record<string, any> };
type BadRow = { sheet: SheetName; row: number; reason: string; original: Record<string, any> };

const sheets: SheetName[] = ['qcm', 'qroc', 'cas_qcm', 'cas_qroc'];

function dedupKey(row: Record<string, any>): string {
  // Build a strict composite key using all known columns so duplicates match exact full rows
  const orderedKeys = Object.keys(row).sort();
  return orderedKeys.map(k => `${k}=${String(row[k] ?? '').trim()}`).join('|');
}

async function validateWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer);

  const present = new Map<string, string>();
  const normalizeSheet = (name: string) => String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  for (const actual of Object.keys(workbook.Sheets)) present.set(normalizeSheet(actual), actual);
  const aliases: Record<SheetName, string[]> = {
    qcm: ['qcm','questions qcm'],
    qroc: ['qroc','croq','questions qroc','questions croq'],
    cas_qcm: ['cas qcm','cas-qcm','cas_qcm','cas clinique qcm','cas clinic qcm'],
    cas_qroc: ['cas qroc','cas-qroc','cas_qroc','cas clinique qroc','cas clinic qroc','cas croq','cas clinic croq']
  };

  const good: GoodRow[] = [];
  const bad: BadRow[] = [];

  for (const sheet of sheets) {
    let actualName: string | undefined;
    for (const a of aliases[sheet]) {
      const n = normalizeSheet(a);
      if (present.has(n)) { actualName = present.get(n)!; break; }
    }
    if (!actualName) continue;
  const ws = workbook.Sheets[actualName];
    const rows = utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) continue;
    const headerRaw = (rows[0] as string[]).map(h => String(h ?? ''));
    const header = headerRaw.map(canonicalizeHeader);
  // Track duplicates within this sheet only
  const seenInThisSheet = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const raw = rows[i] as unknown[];
      if (!raw || raw.length === 0) continue;
      const record: Record<string, any> = {};
      header.forEach((h, idx) => { record[h] = String((raw as any[])[idx] ?? '').trim(); });

      // Basic required fields
      const qText = sheet === 'cas_qcm' || sheet === 'cas_qroc' ? (record['texte de question'] || record['texte de la question']) : record['texte de la question'];
      if (!record['matiere'] || !record['cours'] || !qText) {
        bad.push({ sheet, row: i + 1, reason: 'Missing core fields (matiere/cours/question)', original: record });
        continue;
      }

      // Clean text and capture images
      const { cleanedText, mediaUrl, mediaType } = extractImageUrlAndCleanText(String(qText));
      record['texte de la question'] = cleanedText; // normalize
      if (!record['image'] && mediaUrl) { record['image'] = mediaUrl; record['image_type'] = mediaType; }

      // MCQ rules (stricter): require valid letters A–E and forbid explicit no-answer; require explanation
      const hasAnyExplanation = () => {
        const base = String(record['explication'] || '').trim();
        if (base) return true;
        const letters = ['a','b','c','d','e'];
        return letters.some(l => String(record[`explication ${l}`] || '').trim());
      };
      if (sheet === 'qcm' || sheet === 'cas_qcm') {
        const { options, correctAnswers } = parseMCQOptions(record);
        const explicitNoAns = isExplicitNoAnswer(record['reponse']);
        if (options.length === 0) {
          bad.push({ sheet, row: i + 1, reason: 'MCQ missing options', original: record });
          continue;
        }
        if (explicitNoAns) {
          bad.push({ sheet, row: i + 1, reason: 'MCQ answer cannot be "?" or "Pas de réponse"', original: record });
          continue;
        }
        if (correctAnswers.length === 0) {
          bad.push({ sheet, row: i + 1, reason: 'MCQ missing correct answers (use A–E letters)', original: record });
          continue;
        }
        if (!hasAnyExplanation()) {
          bad.push({ sheet, row: i + 1, reason: 'MCQ missing explanation (global or per-option)', original: record });
          continue;
        }
        record['__parsed_options'] = options;
        record['__parsed_correctAnswers'] = correctAnswers;
      }

      if (sheet === 'qroc' || sheet === 'cas_qroc') {
        if (!record['reponse']) {
          bad.push({ sheet, row: i + 1, reason: 'QROC missing answer', original: record });
          continue;
        }
        const base = String(record['explication'] || '').trim();
        if (!base) {
          bad.push({ sheet, row: i + 1, reason: 'QROC missing explanation', original: record });
          continue;
        }
      }

      // Sheet-level dedup only
      const key = dedupKey(record);
      if (seenInThisSheet.has(key)) {
        bad.push({ sheet, row: i + 1, reason: 'Duplicate row in same sheet (exact match)', original: record });
        continue;
      }
      seenInThisSheet.add(key);

      good.push({ sheet, row: i + 1, data: record });
    }
  }

  return { good, bad };
}

export const POST = requireMaintainerOrAdmin(async (request: AuthenticatedRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.name?.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'Only .xlsx supported' }, { status: 400 });
  const { good, bad } = await validateWorkbook(file);
  return NextResponse.json({ goodCount: good.length, badCount: bad.length, good, bad });
});

export const GET = requireMaintainerOrAdmin(async (request: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode'); // good|bad
  const payload = searchParams.get('payload');
  if (!payload) return NextResponse.json({ error: 'payload required' }, { status: 400 });
  const parsed = JSON.parse(payload);
  if (mode !== 'good' && mode !== 'bad') return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  const rows = (mode === 'good' ? parsed.good : parsed.bad) || [];
  const header = mode === 'good'
    ? ['sheet','row','matiere','cours','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','image']
    : ['sheet','row','reason','matiere','cours','question n','texte de la question','reponse','option a','option b','option c','option d','option e','explication','image'];
  const dataObjects = rows.map((r: any) => {
    const rec = mode === 'good' ? r.data : r.original;
    const base: any = {
      sheet: r.sheet,
      row: r.row,
      ...(mode === 'bad' ? { reason: r.reason } : {}),
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
      explication: rec['explication'] ?? '',
      image: rec['image'] ?? ''
    };
    return base;
  });

  const ws = utils.json_to_sheet(dataObjects, { header });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, mode === 'good' ? 'Valide' : 'Erreurs');
  const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="validation_${mode}.xlsx"`
    }
  });
});
