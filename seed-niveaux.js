const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding niveaux...');

  const niveaux = [
    { name: 'PCEM1', order: 1 },
    { name: 'PCEM2', order: 2 },
    { name: 'DCEM1 : Semestre Cardio / Infectieux', order: 3 },
    { name: 'DCEM2 : Pediatrie / Chirurgie', order: 4 },
    { name: 'DCEM3 : Gynécologie / Aigue', order: 5 },
  ];

  for (const niveau of niveaux) {
    const created = await prisma.niveau.upsert({
      where: { name: niveau.name },
      update: {},
      create: niveau,
    });
    console.log(`✅ ${created.name}`);
  }

  console.log('✅ Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
