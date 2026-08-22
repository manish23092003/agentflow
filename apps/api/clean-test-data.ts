import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_GOALS = [
  'Analyze the current state of electric vehicle adoption in Southeast Asia',
  'Summarize recent advances in quantum computing and enterprise applications',
  'Compare leading LLM providers for privacy compliance',
  'Research supply chain resilience strategies in semiconductor manufacturing',
  'Analyze market trends for sustainable packaging materials',
];

async function run() {
  const sessions = await prisma.researchSession.findMany();
  let updatedCount = 0;
  for (const session of sessions) {
    if (session.goal.toLowerCase().includes('test') || session.goal.length < 15) {
      const newGoal = MOCK_GOALS[updatedCount % MOCK_GOALS.length];
      await prisma.researchSession.update({
        where: { id: session.id },
        data: { goal: newGoal }
      });
      console.log(`Updated session ${session.id}: ${session.goal} -> ${newGoal}`);
      updatedCount++;
    }
  }
  console.log(`Done. Updated ${updatedCount} sessions.`);
  await prisma.$disconnect();
}

run().catch(console.error);
