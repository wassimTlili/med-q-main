# AI + RAG Pipeline Overview

This document explains how the platform ingests course PDFs, builds Retrieval-Augmented Generation (RAG) indices, and uses them to ground AI corrections for QCM / case questions.

---
## 1. High-Level Flow

1. You place PDFs under `PDFs/<NIVEAU>/[<MATIERE>/]file.pdf`.
2. Run `npm run rag:ingest-pdfs` to:
   - Parse each PDF into pages.
   - Split text into overlapping semantic chunks.
   - Embed each chunk with Azure OpenAI embeddings (batched + retries).
   - Store: `rag_index` (one per PDF) and many `rag_chunks` with `{ niveau, matiere, source }` metadata.
3. During AI correction (`/api/validation/ai-progress`), each question:
   - Extracts its text & options.
   - Selects the right index using `RAG_INDEX_MAP` or fallback `RAG_INDEX_ID`.
   - Performs semantic search (vector cosine) for top chunks (default k=4).
   - Prepends a condensed context block to the question.
4. AI (Azure OpenAI Chat) receives system + user prompt (French medical correction style) and returns structured JSON.
5. Stream (SSE) incremental progress back to the UI while persisting results row by row.

---
## 2. Repository Components

| Area | File / Script | Purpose |
|------|---------------|---------|
| PDF Ingestion | `scripts/ingest-pdfs-niveau.ts` | Batch ingest all PDFs (niveau + optional matiere) |
| PDF Parsing | `src/lib/pdfExtract.ts` | Uses `pdfjs-dist` (with polyfills) to extract page text |
| RAG Storage | `prisma/schema.prisma` (`rag_index`, `rag_chunks`) | Persist indices + embedded chunks |
| RAG Service | `src/lib/services/ragDb.ts` | Create index, batch embed with retry, cosine search |
| Azure OpenAI Client | `src/lib/services/azureOpenAI.ts` | Chat + embedding REST wrappers with error hints |
| AI Correction | `src/app/api/validation/ai-progress/route.ts` | Streams corrections with optional RAG context |

---
## 3. Folder Structure for PDFs

```
PDFs/
  DCEM3/
    Infectiologie/
      sepsis.pdf
    Urologie/
      rein.pdf
  PCEM2/
    cardio_intro.pdf   (no matiere folder -> matiere defaults to PCEM2)
```

Rules:
- Top folder = `niveau`.
- Optional second folder = `matiere`.
- If no matiere folder, we set `matiere = niveau` internally.
- Index name pattern: `<niveau>__<matiere>__<filename-no-ext>` (or `<niveau>__<filename-no-ext>` without subfolder).

---
## 4. Ingestion Details

Command:
```
npm run rag:ingest-pdfs
```
Environment overrides (optional):
- `CHUNK_SIZE` (default 800 chars)
- `CHUNK_OVERLAP` (default 300 chars, increased for better context continuity)
- `EMBEDDING_BATCH_SIZE` (default 64)
- `EMBEDDING_RETRY_ATTEMPTS` (default 5)
- `EMBEDDING_RETRY_BASE_MS` (default 500)

Process per PDF:
1. Extract pages -> plain text with medical-friendly cleaning.
2. Split each page into overlapping chunks using medical-aware separators (`\n\n`, `\n`, `. `, ` `).
3. Batch embed chunks (exponential backoff on transient 503/timeouts).
4. Store each chunk row with metadata: `{ source, niveau, matiere }`.

**Note**: Updated to use notebook-style chunking with larger overlap (300 vs 150) and medical text cleaning for better context preservation.

---
## 5. Environment Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | No trailing slash needed (normalized) |
| `AZURE_OPENAI_API_KEY` | API key | Required for both chat & embeddings |
| `AZURE_OPENAI_DEPLOYMENT` / `AZURE_OPENAI_CHAT_DEPLOYMENT` | Chat model deployment name | Must match Azure deployment (NOT raw model name) |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding deployment name | Must exist or ingestion fails 404/503 |
| `RAG_INDEX_ID` | Single fallback index id | Use when you want a global context only |
| `RAG_INDEX_MAP` | JSON mapping for granular routing | Keys: `"<niveau>|<matiere>"` or `"|<matiere>"` |
| `CHUNK_SIZE` | Override chunk size | Larger = fewer, bigger chunks (risk of dilution) |
| `CHUNK_OVERLAP` | Overlap between chunks | Helps avoid context cutoff |
| `EMBEDDING_BATCH_SIZE` | Batch size for embeddings | Lower if hitting rate limits |
| `EMBEDDING_RETRY_ATTEMPTS` | Max retries for transient errors | Combine with backoff |
| `EMBEDDING_RETRY_BASE_MS` | Base delay for exponential backoff | Jitter added |

RAG resolution order per question: `RAG_INDEX_MAP["niveau|matiere"]` -> `RAG_INDEX_MAP["|matiere"]` -> `RAG_INDEX_ID` -> none.

---
## 6. Retrieval During AI Correction

1. Incoming worksheet rows filtered to MCQ variants.
2. For each question row:
   - Determine `niveau`, `matiere` from columns (multiple header spellings supported, incl. `matière`).
   - Select index id using mapping strategy above.
   - If index found: 
     * Search with question text AND each option independently (notebook approach)
     * Retrieve k=10 chunks per search, combine and deduplicate
     * Score and rank all retrieved chunks, take top 8
   - Compress chunk text (normalize whitespace, length cap up to 2500 chars) and prepend:
     ```
     CONTEXTE (extraits cours | niveau=DCEM3 matiere=Infectiologie):
     <chunk1>

     <chunk2>
     ...

     QUESTION:
     <original question text>
     ```
3. Call Azure Chat with system prompt (French medical correction style) + user payload.
4. Parse JSON response; stream incremental events to client.

**Note**: Retrieval strategy updated to match notebook logic - searches question + options independently with higher retrieval count (k=10) for better context coverage.

---
## 7. AI Output Schema (Simplified)

Each item returned roughly includes:
```json
{
  "id": "<row-index>",
  "status": "ok" | "error",
  "answer": ["A"],
  "explication": "Raisonnement détaillé...",
  "corrections": [
    { "option": "A", "isCorrect": true,  "justification": "..." },
    { "option": "B", "isCorrect": false, "justification": "..." }
  ],
  "pitfalls": ["Confusion entre ..."],
  "confidence": 0.87,
  "reasoning_style": "systematic"
}
```
(Exact structure governed by current system prompt in `aiImport` + validation route logic.)

---
## 8. Database Schema (RAG Part)

- `rag_index`: one row per ingested PDF (id, name, created_at)
- `rag_chunks`: many rows per index
  - Fields: `text`, `embedding` (vector as float array), `meta` JSON (`{"niveau":"DCEM3","matiere":"Infectiologie","source":"DCEM3/Infectiologie/sepsis.pdf"}`)
  - Indexed by `index_id`

Deletion / reset:
```sql
TRUNCATE TABLE rag_chunks;                 -- clear chunks only
TRUNCATE TABLE rag_chunks, rag_index CASCADE; -- full reset
```

---
## 9. Error Handling & Resilience

| Scenario | Cause | Behavior | Fix |
|----------|-------|----------|-----|
| 404 DeploymentNotFound | Wrong Azure deployment name | Throws early with guidance | Create deployment / correct name |
| 503 InternalServerError | Azure transient load | Automatic batched retry with backoff | Reduce batch size / wait |
| Embedding count mismatch | Partial response anomaly | Aborts batch | Retry ingestion |
| Empty retrieval | Wrong index id or not ingested yet | Skips context silently | Re-run ingestion / mapping |

---
## 10. Performance Tuning

| Goal | Adjustment |
|------|------------|
| Faster ingestion under rate limits | Lower `EMBEDDING_BATCH_SIZE` (e.g. 32) |
| Reduce token usage in chat | Keep K (top chunks) small (4) & chunk size tuned |
| Better recall for broad topics | Slightly larger `CHUNK_SIZE` (900–1000) |
| Reduce duplication | Lower overlap (e.g. 120) but watch for semantic cuts |

---
## 11. Adding New PDFs

1. Drop the file(s) into the correct `PDFs/<NIVEAU>/[<MATIERE>/]` folder.
2. (Optionally) clear old chunks if you want a clean slate.
3. Run ingestion: `npm run rag:ingest-pdfs`.
4. Copy printed index id(s) into `RAG_INDEX_MAP` or set as `RAG_INDEX_ID`.
5. Trigger AI correction job; verify context lines appear.

> Important: Do not commit the `PDFs/` directory to git. These files are large and unnecessary for deployments. The repo now ignores `PDFs/` via `.gitignore`.

If you accidentally committed PDFs in the past, you'll need to rewrite git history to remove them and force-push:

```
# Option A: Use git filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path PDFs/ --invert-paths

# Option B: If filter-repo isn't available, use BFG Repo-Cleaner
# Download BFG jar, then:
java -jar bfg.jar --delete-folders PDFs --delete-files '*.pdf' --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Finally force-push the cleaned history
git push --force
```

---
## 12. Updating Mapping

Example `.env.local` snippet:
```
RAG_INDEX_MAP={"DCEM3|Infectiologie":"1f2c...","DCEM3|Urologie":"9ab3...","|Cardiologie":"c77d..."}
```
Remove keys to disable their retrieval. A global `RAG_INDEX_ID` acts as broad fallback.

---
## 13. Security & Hygiene

- Never commit real API keys; use `.env.local` (gitignored) for secrets.
- Rotate keys if exposed in logs.
- Validate that ingestion logs don't leak PHI or restricted content.

---
## 14. Troubleshooting Quick Table

| Symptom | Quick Check |
|---------|-------------|
| 0 chunks after run | Did embeddings 404? Check embedding deployment env var |
| Very slow ingestion | Lower batch size; check Azure region latency |
| No CONTEXTE in AI prompt | Mapping not found; log `process.env.RAG_INDEX_MAP` value |
| Frequent 503 | Increase retries or pause between ingest runs |

---
## 15. Future Enhancements (Roadmap)

- Multi-index hybrid search (aggregate top N across mapped indices).
- Semantic dedupe (hashing normalized chunk text).
- Automatic matiere detection via LLM or keyword taxonomy.
- Periodic index compaction (merge small adjacent chunks).
- Usage metrics (token + embedding cost dashboard).
- Vector similarity filtering by metadata (niveau/matiere) without per-index isolation.

---
## 16. Minimal End‑to‑End Checklist

1. Set Azure env vars (`AZURE_OPENAI_*`).
2. Ensure embedding deployment exists.
3. Add PDFs under correct folders.
4. Run `npm run rag:ingest-pdfs` (note created index IDs).
5. Set `RAG_INDEX_MAP` or `RAG_INDEX_ID`.
6. Launch AI correction job – confirm context injection.
7. Review outputs, adjust chunk or batch sizes if needed.

---
Questions or need automation next (e.g. auto map builder)? Just ask.
