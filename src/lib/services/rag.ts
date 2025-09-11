import { embedTexts, getAzureEmbeddingConfigFromEnv, chatCompletions } from './azureOpenAI';

export type DocChunk = {
  id: string;
  text: string;
  meta?: Record<string, any>;
};

export type VectorIndex = {
  dim: number;
  ids: string[];
  vectors: Float32Array[];
  meta: Record<string, any>[];
};

export async function buildIndex(chunks: DocChunk[]): Promise<VectorIndex> {
  const cfg = getAzureEmbeddingConfigFromEnv();
  if (!cfg) throw new Error('Azure embeddings not configured');
  const texts = chunks.map(c => c.text);
  const vecs = await embedTexts(texts, cfg);
  const f32 = vecs.map(v => Float32Array.from(v));
  const dim = f32[0]?.length || 0;
  return {
    dim,
    ids: chunks.map(c => c.id),
    vectors: f32,
    meta: chunks.map(c => c.meta || {}),
  };
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na)*Math.sqrt(nb) || 1;
  return dot / denom;
}

export async function search(index: VectorIndex, query: string, k = 8): Promise<{ id: string; text: string; meta: any; score: number }[]> {
  const qv = (await embedTexts([query]))[0];
  const q = Float32Array.from(qv);
  const scored: { i: number; s: number }[] = [];
  for (let i = 0; i < index.vectors.length; i++) {
    const s = cosine(q, index.vectors[i]);
    scored.push({ i, s });
  }
  scored.sort((a,b) => b.s - a.s);
  const top = scored.slice(0, k);
  return top.map(({ i, s }) => ({ id: index.ids[i], text: '', meta: index.meta[i], score: s }));
}

export async function mcqAnalyzeWithContext({ context, question }: { context: string; question: string }): Promise<string> {
  const prompt = `Vous êtes un expert médical analysant des questions à choix multiples. Utilisez UNIQUEMENT le texte médical fourni pour évaluer chaque option.

Contexte médical:
${context}

Question: ${question}

Instructions:
1. Pour CHAQUE option (A, B, C, D, E), déterminez si elle est VRAIE ou FAUSSE basé UNIQUEMENT sur le contexte fourni
2. Fournissez une justification spécifique du texte pour chaque option
3. Citez les phrases exactes du contexte qui soutiennent votre analyse
4. Si l'information n'est pas disponible, indiquez "Non mentionné dans le texte fourni"
5. À la fin, listez les options CORRECTES

Format de réponse:
Option A: [VRAI/FAUX] - [Justification avec citations exactes]
Option B: [VRAI/FAUX] - [Justification avec citations exactes]
Option C: [VRAI/FAUX] - [Justification avec citations exactes]
Option D: [VRAI/FAUX] - [Justification avec citations exactes]
Option E: [VRAI/FAUX] - [Justification avec citations exactes]

RÉPONSES CORRECTES: [Lister les options correctes]

Analyse:`;
  const content = await chatCompletions([
    { role: 'system', content: 'Tu es un assistant d’analyse médicale concis et rigoureux.' },
    { role: 'user', content: prompt },
  ]);
  return content;
}
