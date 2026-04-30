// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { name: 'Minisha Bharadwaj', email: 'admin@demo.com', passwordHash },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@demo.com' },
    update: {},
    create: { name: 'Shubham Chaudhury', email: 'member@demo.com', passwordHash },
  });

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Demo Project',
      description: 'A seeded project for testing',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
        ],
      },
    },
  });

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Set up repository',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: admin.id,
      },
      {
        title: 'Design database schema',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
      },
      {
        title: 'Build REST API',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        projectId: project.id,
        creatorId: admin.id,
      },
      {
        title: 'Write tests',
        status: 'TODO',
        priority: 'LOW',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
      },
    ],
  });

  console.log('Seed complete. Login: admin@demo.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
