// src/routes/dashboard.js
const router = require('express').Router();
const prisma  = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// ── GET /api/dashboard ────────────────────────────────────────────────────────
// Returns a summary view: stats + overdue tasks + tasks assigned to current user.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now    = new Date();

    // Projects the user belongs to
    const memberProjectIds = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    }).then(rows => rows.map(r => r.projectId));

    const [
      totalProjects,
      totalTasks,
      tasksByStatus,
      overdueTasks,
      myTasks,
    ] = await Promise.all([
      prisma.project.count({ where: { id: { in: memberProjectIds } } }),

      prisma.task.count({ where: { projectId: { in: memberProjectIds } } }),

      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: memberProjectIds } },
        _count: { status: true },
      }),

      prisma.task.findMany({
        where: {
          projectId: { in: memberProjectIds },
          dueDate: { lt: now },
          status: { not: 'DONE' },
        },
        select: {
          id: true, title: true, dueDate: true, status: true, priority: true,
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      prisma.task.findMany({
        where: { assigneeId: userId, status: { not: 'DONE' } },
        select: {
          id: true, title: true, dueDate: true, status: true, priority: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    tasksByStatus.forEach(({ status, _count }) => {
      statusMap[status] = _count.status;
    });

    res.json({
      stats: {
        totalProjects,
        totalTasks,
        todo:       statusMap.TODO,
        inProgress: statusMap.IN_PROGRESS,
        done:       statusMap.DONE,
        overdue:    overdueTasks.length,
      },
      overdueTasks,
      myTasks,
    });
  } catch (err) { next(err); }
});

module.exports = router;
