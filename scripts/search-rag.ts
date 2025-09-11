import { searchIndex } from '@/lib/services/ragDb';

async function main() {
  const indexId = process.argv[2];
  const query = process.argv.slice(3).join(' ').trim();
  if (!indexId || !query) {
    console.error('Usage: tsx scripts/search-rag.ts <indexId> <query...>');
    process.exit(1);
  }
  const results = await searchIndex(indexId, query, 8);
  for (const r of results) {
    console.log(`score=${r.score.toFixed(4)} page=${r.page ?? '-'} ord=${r.ord ?? '-'} id=${r.id}`);
    console.log(r.text);
    console.log('---');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
