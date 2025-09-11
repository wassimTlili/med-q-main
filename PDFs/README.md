# PDFs Repository Structure (Niveau + Optional Matiere)

Organize course PDFs by academic level ("niveau") with optional subject subfolders ("matiere"). These feed the RAG indices used to ground AI explanations.

Example trees:

Simple (no matiere folders):
PDFs/
  PCEM2/
    epispadias_travail.pdf

With matiere folders:
PDFs/
  PCEM2/
    Urologie/
      epispadias_travail.pdf
    Pédiatrie/
      rein_enfant.pdf
  DCEM3/
    Infectiologie/
      sepsis_urgent.pdf

Rules:
- Top-level directory under `PDFs/` = niveau (PCEM1, PCEM2, DCEM3, DFASM1...).
- Optional second-level folder = matiere (discipline). If absent, matiere is set equal to the niveau for indexing consistency.
- Index name pattern: `<niveau>__<matiere>__<filename-no-ext>` (or `<niveau>__<filename-no-ext>` when no matiere folder).
- Stored chunk metadata: `{ source, niveau, matiere }` (always populated; matiere = niveau if no folder).

Batch ingestion:
1. Organize PDFs as shown.
2. Run: `npm run rag:ingest-pdfs`
3. Script prints created index IDs with niveau & matiere.
4. Configure retrieval:
   - Simple: set `RAG_INDEX_ID=<one index id>` (all questions use same index), OR
   - Granular: set `RAG_INDEX_MAP` JSON, e.g. `{"DCEM3|Infectiologie":"idx_dcem3_infectio","|Urologie":"idx_global_uro"}`.
     Resolution order per question: exact `niveau|matiere` -> `|matiere` -> `RAG_INDEX_ID` -> none.

Re‑ingesting the same PDF will create a new index (no dedupe yet). Delete obsolete rows manually if needed.

Future (optional) improvements: append mode, chunk dedupe via hashing, automatic matiere inference, index compaction, specialty mapping.
