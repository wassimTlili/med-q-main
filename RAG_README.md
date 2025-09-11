# RAG (Retrieval Augmented Generation) Pipeline

This document describes how PDFs are ingested (by *niveau* / *matiere* / *cours*), chunked, embedded, indexed, and then queried to augment AI answers.

---
## 1. Concepts
| Term | Meaning |
|------|---------|
| Index | Logical collection of embedded text chunks (vector store) |
| Chunk | A slice of PDF text (≈800 chars, 150 overlap) with metadata |
| Metadata | `{ source, niveau, matiere, cours }` values carried per chunk |
| Embedding | Vector representation of a chunk (Azure OpenAI embedding model) |
| Search | Cosine similarity between query embedding and stored chunk embeddings |

---
## 2. Data Flow
1. Admin provides PDF URL (public or signed) + niveau/matiere/cours labels.
2. Backend downloads the PDF and extracts page text (`extractPdfTextPerPage`).
3. Text pages are split into overlapping chunks (`splitIntoChunks`).
4. Each chunk is embedded via Azure OpenAI (`embedTexts`).
5. Chunks (text + embedding + metadata) are stored in `ragIndex` / `ragChunk` tables.
6. A search query is embedded and compared (cosine similarity) to return top-k chunks.
7. Chunks are passed to the AI layer (future: context injection for answer generation / explanations).

---
## 3. Ingestion Endpoints & Scripts
### API Endpoint
`POST /api/rag/build`
```json
{
  "pdfUrl": "https://cdn.example.com/DCEM3/Travail_2024.pdf",
  "indexName": "DCEM3-Travail-2024",
  "niveau": "DCEM3",
  "matiere": "Travail",
  "cours": "Travail 2024",
  "chunkSize": 800,
  "chunkOverlap": 150
}
```
Response:
```json
{
  "indexId": "<uuid>",
  "name": "DCEM3-Travail-2024",
  "pages": 42,
  "chunks": 613,
  "meta": { "source": "...pdf", "niveau": "DCEM3", "matiere": "Travail", "cours": "Travail 2024" }
}
```
### CLI Script (single PDF)
```bash
# Using tsx
npx tsx scripts/build-rag-from-pdf.ts ./local/Travail_2024.pdf DCEM3-Travail-2024
```
Adds chunks with only `source` meta; (niveau/matiere/cours) currently added through the API route. You can adapt the script similarly if needed.

### Planned Batch Script (suggested)
Accept a CSV listing: `niveau,matiere,cours,pdfUrl` → iterate calling the build endpoint.

---
## 4. Querying
`POST /api/rag/search`:
```json
{ "indexId": "<uuid>", "query": "physiologie travail hypoxie", "k": 8 }
```
Returns:
```json
{
  "results": [
    {
      "id": "chunk-id",
      "text": "...context snippet...",
      "page": 12,
      "ord": 3,
      "meta": { "source": "...", "niveau": "DCEM3", "matiere": "Travail", "cours": "Travail 2024" },
      "score": 0.8423
    }
  ]
}
```

---
## 5. Table Schema (Simplified)
| Table | Fields (selected) |
|-------|-------------------|
| ragIndex | id (uuid), name (nullable) |
| ragChunk | id, indexId (FK), text, page, ord, meta (JSON), embedding (vector) |

Meta JSON holds `{ source, niveau, matiere, cours }`.

---
## 6. Chunking Strategy
Default: `chunkSize=800`, `chunkOverlap=150`.
Rationale: Overlap preserves continuity of medical concepts; size balances token cost & recall.
Adjust per PDF via request body.

---
## 7. Index Strategy by Niveau
Two recommended patterns:
| Pattern | When to Use | Pros | Cons |
|---------|-------------|------|------|
| One index per (niveau + matiere) | Many cours per matiere; queries usually scoped to a matiere | Smaller search set | More indexes overall |
| One index per (niveau + matiere + cours) | Queries are lecture-specific | Precise context | Might fragment related context |

Choose based on UI filtering. Easiest: create index per (niveau + matiere); store `cours` in meta to optionally highlight the source.

---
## 8. Operational Guidelines
| Task | Step |
|------|------|
| Ingest new PDF | Call `/api/rag/build` with proper labels |
| Rebuild after PDF update | Recreate a new index (immutable approach) then switch references |
| Delete obsolete index | Implement a delete endpoint (future) or clean manually via DB |
| Monitor quality | Periodically search representative queries and verify top chunks relevance |

---
## 9. Performance & Limits
- Embedding throughput limited by Azure OpenAI rate limits; batch size inside `embedTexts` should be kept moderate (≈ 16–32) (not yet exposed—can be tuned later).
- Memory: All chunks of one index currently loaded during search (simple design). For very large corpora, implement approximate search or DB-side vector filtering.

---
## 10. Future Enhancements (Roadmap)
| Feature | Value |
|---------|-------|
| Batch ingestion (CSV) | Bulk build all niveaux at once |
| Meta filters in search | Query subset (e.g., only a given matiere) inside one large index |
| Hybrid BM25 + Vector | Better recall on rare terms |
| Embedding caching | Avoid re-embedding identical text across editions |
| Context assembly | Automatically build prompt context for AI explanations |
| Index deletion endpoint | Lifecycle management |

---
## 11. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| `relation ... rag_` error | Missing migrations | Run `prisma migrate deploy` / dev migrate |
| 400 `pdfUrl is required` | Missing body field | Include pdfUrl in JSON |
| Few/no chunks | PDF extraction produced little text | Validate PDF is text-based (not scanned) |
| Slow ingestion | Large PDF or rate limiting | Reduce chunkSize or ingest off-peak |

---
## 12. Quick Examples
### A. Build index for DCEM3 Travail
```bash
curl -X POST http://localhost:3000/api/rag/build \
  -H "Content-Type: application/json" \
  -d '{
    "pdfUrl": "https://cdn.example.com/DCEM3/Travail_2024.pdf",
    "indexName": "DCEM3-Travail",
    "niveau": "DCEM3",
    "matiere": "Travail",
    "cours": "Travail 2024"
  }'
```
### B. Search
```bash
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{ "indexId": "<uuid>", "query": "physiologie ergonomie travail" }'
```

---
## 13. Security Notes
- Only allow authenticated/authorized maintainers to call build endpoint (add auth wrapper if exposing in UI).
- Validate `pdfUrl` (restrict to trusted domains) to avoid SSRF if necessary.

---
## 14. Summary
You can now import lecture PDFs by niveau with rich metadata. Each chunk is searchable by semantic similarity. This RAG layer is ready for integrating contextual answers or AI-assisted explanations.
