import { chatCompletions, getAzureConfigFromEnv, listDeployments } from '@/lib/services/azureOpenAI';

async function main() {
  const cfg = getAzureConfigFromEnv();
  if (!cfg) {
    console.error('Azure not configured. Check AZURE_OPENAI_API_KEY, AZURE_OPENAI_TARGET, AZURE_OPENAI_CHAT_DEPLOYMENT.');
    process.exit(1);
  }
  console.log('Endpoint:', cfg.endpoint);
  console.log('Deployment:', cfg.deployment);
  console.log('API Version:', cfg.apiVersion);
  try {
    const deps = await listDeployments(cfg);
    console.log('Available deployments:', deps.map(d => `${d.name}${d.model ? ` (${d.model})` : ''}`).join(', ') || '(none)');
  } catch (e: any) {
    console.warn('Could not list deployments:', e?.message || e);
  }
  try {
    const res = await chatCompletions([
      { role: 'system', content: 'You are a JSON echo bot. Answer only with {"ok":true}.' },
      { role: 'user', content: 'ping' }
    ], cfg);
    console.log('Success. Raw content:', res);
    process.exit(0);
  } catch (e: any) {
    console.error('Azure test failed:', e?.message || e);
    process.exit(2);
  }
}

main();
