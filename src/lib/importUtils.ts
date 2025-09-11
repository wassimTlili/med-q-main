// Common helpers for import/validation flows

// Normalize and canonicalize header labels
const normalizeHeader = (h: string): string =>
  String(h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s]/g, ' ') // punctuation to spaces
    .replace(/\s+/g, ' ') // collapse
    .trim();

const headerAliases: Record<string, string> = {
  // canonical keys
  'matiere': 'matiere',
  'cours': 'cours',
  'question n': 'question n',
  'question no': 'question n',
  'question n°': 'question n',
  'source': 'source',
  'texte de la question': 'texte de la question',
  'texte question': 'texte de la question',
  'texte de question': 'texte de la question',
  'texte du cas': 'texte du cas',
  'texte cas': 'texte du cas',
  'option a': 'option a',
  'option b': 'option b',
  'option c': 'option c',
  'option d': 'option d',
  'option e': 'option e',
  'reponse': 'reponse',
  'reponse(s)': 'reponse',
  'cas n': 'cas n',
  'cas no': 'cas n',
  'cas n°': 'cas n',
  // optional columns
  'explication': 'explication',
  'explication de la reponse': 'explication',
  'explication de la réponse': 'explication',
  'explication reponse': 'explication',
  'explanation': 'explication',
  'correction': 'explication',
  // per-option explanations
  'explication a': 'explication a',
  'explication b': 'explication b',
  'explication c': 'explication c',
  'explication d': 'explication d',
  'explication e': 'explication e',
  'niveau': 'niveau',
  'level': 'niveau',
  'semestre': 'semestre',
  'semester': 'semestre',
  'rappel': 'rappel',
  'rappel du cours': 'rappel',
  'rappel cours': 'rappel',
  'course reminder': 'rappel',
  'rappel_cours': 'rappel',
  // explicit media/image columns
  'image': 'image',
  'image url': 'image',
  'image_url': 'image',
  'media': 'image',
  'media url': 'image',
  'media_url': 'image',
  'illustration': 'image',
  'illustration url': 'image'
};

export const canonicalizeHeader = (h: string): string => {
  const n = normalizeHeader(h);
  return headerAliases[n] ?? n;
};

// Extract a first image URL (if present) from within text and return cleaned text
export function extractImageUrlAndCleanText(text: string): { cleanedText: string; mediaUrl: string | null; mediaType: string | null } {
  const imageUrlRegex = /(https?:\/\/[^(\s)]+?\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico))(?:[)\s.,;:!?]|$)/i;
  let cleanedText = text;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  const match = text.match(imageUrlRegex);
  if (match) {
    mediaUrl = match[1];
    cleanedText = text.replace(match[0], ' ').trim();
    const extension = mediaUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg': mediaType = 'image/jpeg'; break;
      case 'png': mediaType = 'image/png'; break;
      case 'gif': mediaType = 'image/gif'; break;
      case 'webp': mediaType = 'image/webp'; break;
      case 'svg': mediaType = 'image/svg+xml'; break;
      case 'bmp': mediaType = 'image/bmp'; break;
      case 'tiff': mediaType = 'image/tiff'; break;
      case 'ico': mediaType = 'image/x-icon'; break;
      default: mediaType = 'image';
    }
  }
  return { cleanedText, mediaUrl, mediaType };
}

export function isExplicitNoAnswer(raw?: string | null): boolean {
  if (!raw) return false;
  const s = String(raw).trim().toLowerCase();
  return s === '?' || /^pas\s*de\s*r[ée]ponse$/.test(s);
}

// Parse MCQ options and map answers like "A, C" to numeric indices as strings
export function parseMCQOptions(rowData: Record<string, unknown>): { options: string[]; correctAnswers: string[] } {
  const options: string[] = [];
  const correctAnswers: string[] = [];

  for (let i = 0; i < 5; i++) {
    const optionKey = `option ${String.fromCharCode(97 + i)}`; // a..e
    const v = rowData[optionKey];
    const s = v == null ? '' : String(v).trim();
    if (s) options.push(s);
  }

  const raw = rowData['reponse'];
  if (raw) {
    const upper = String(raw).trim().toUpperCase();
    const tokens = upper.split(/[;,\s]+/).filter(Boolean);
    tokens.forEach(tok => {
      const ch = tok.trim()[0];
      if (!/^[A-E]$/.test(ch)) return;
      const idx = ch.charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) correctAnswers.push(String(idx));
    });
  }

  return { options, correctAnswers };
}
