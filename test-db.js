const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function redactUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return '[unparseable DATABASE_URL]';
  }
}

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log('🔗 Testing database connection...');
  if (dbUrl) console.log('DB:', redactUrl(dbUrl));
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    const [{ now }] = await prisma.$queryRaw`SELECT NOW() as now`;
    console.log('✅ Connection OK. NOW() =', now);

    // List public tables (no dependency on Prisma models)
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 50`;
    const tableNames = tables.map((t) => t.table_name);
    console.log('📋 Public tables:', tableNames.length ? tableNames.join(', ') : '(none)');

    // Check for RAG tables
    const hasRagIndex = tableNames.includes('rag_index');
    const hasRagChunks = tableNames.includes('rag_chunks');
    console.log(`🔎 rag_index: ${hasRagIndex ? 'present' : 'missing'}`);
    console.log(`🔎 rag_chunks: ${hasRagChunks ? 'present' : 'missing'}`);

  } catch (error) {
    console.error('❌ Database connection failed:', error?.message || error);
    console.log('\n💡 Checks:');
    console.log('- DATABASE_URL points to Azure and includes sslmode=require');
    console.log('- Azure firewall allows your IP');
    console.log('- Try: npx prisma generate');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
