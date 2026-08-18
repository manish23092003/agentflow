import { config } from '../config.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchAgent } from '../agent/ResearchAgent.js';
import { TavilySearchProvider } from './providers/TavilySearchProvider.js';

async function main() {
  if (!config.tavilyApiKey) {
    console.error('ERROR: TAVILY_API_KEY is not set in .env');
    process.exit(1);
  }

  const repository = new ResearchRepository();
  const provider = new TavilySearchProvider();
  const agent = new ResearchAgent(repository, provider);

  console.log('1. Creating ResearchSession...');
  const session = await repository.createSession(
    'test-user',
    'Research the impact of AI on hiring in the Indian IT industry in 2026.',
    200000
  );

  console.log(`Session Created: ID = ${session.id}, Status = ${session.status}`);
  
  console.log('2. Running Free Research Phase...');
  await agent.runFreeResearchPhase(session.id);

  console.log('3. Fetching final session state...');
  const finalSession = await repository.getSession(session.id);
  const citations = await repository['db'].citation.findMany({
    where: { researchSessionId: session.id }
  });

  console.log(`Final Status: ${finalSession?.status}`);
  console.log(`Citations Persisted: ${citations.length}`);
  for (const c of citations) {
    console.log(` - ${c.title} (${c.url})`);
  }

  console.log('Manual Verification Complete.');
}

main().catch(console.error);
