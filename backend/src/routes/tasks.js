// src/routes/tasks.js
const router = require('express').Router({ mergeParams: true });
const { body, query, validationResult } = require('express-validator');
const prisma  = require('../lib/prisma');
const { authenticate, requireProjectMember, requireProjectAdmin } = require('../middleware/auth');

const VALID_STATUSES  = ['TODO', 'IN_PROGRESS', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const taskSelect = {
  id: true, title: true, description: true,
  status: true, priority: true, dueDate: true,
  createdAt: true, updatedAt: true,
  assignee: { select: { id: true, name: true, email: true } },
  creator:  { select: { id: true, name: true, email: true } },
};

// All task routes require project membership
const memberGuard = [authenticate, requireProjectMember];

// ── GET /api/projects/:projectId/tasks ────────────────────────────────────────
router.get('/:projectId/tasks', ...memberGuard, [
  query('status').optional().isIn(VALID_STATUSES),
  query('priority').optional().isIn(VALID_PRIORITIES),
  query('assigneeId').optional().isString(),
], async (req, res, next) => {
  try {
    const { status, priority, assigneeId } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.params.projectId,
        ...(status     && { status }),
        ...(priority   && { priority }),
        ...(assigneeId && { assigneeId }),
      },
      select: taskSelect,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ tasks });
  } catch (err) { next(err); }
});

// ── POST /api/projects/:projectId/tasks ───────────────────────────────────────
router.post('/:projectId/tasks', ...memberGuard, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('status').optional().isIn(VALID_STATUSES),
  body('priority').optional().isIn(VALID_PRIORITIES),
  body('dueDate').optional().isISO8601().toDate(),
  body('assigneeId').optional().isString(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    // If assigneeId provided, ensure they're a project member
    if (assigneeId) {
      const m = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.params.projectId, userId: assigneeId } },
      });
      if (!m) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const task = await prisma.task.create({
      data: {
        title, description,
        status:    status   || 'TODO',
        priority:  priority || 'MEDIUM',
        dueDate,
        projectId: req.params.projectId,
        creatorId: req.user.id,
        assigneeId,
      },
      select: taskSelect,
    });

    res.status(201).json({ task });
  } catch (err) { next(err); }
});

// ── PATCH /api/projects/:projectId/tasks/:taskId ──────────────────────────────
// Members can update any task; no extra admin check needed here (requirements don't specify).
router.patch('/:projectId/tasks/:taskId', ...memberGuard, [
  body('status').optional().isIn(VALID_STATUSES),
  body('priority').optional().isIn(VALID_PRIORITIES),
  body('dueDate').optional().isISO8601().toDate(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    // Validate the task belongs to this project
    const existing = await prisma.task.findFirst({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status      && { status }),
        ...(priority    && { priority }),
        ...(dueDate     !== undefined && { dueDate }),
        ...(assigneeId  !== undefined && { assigneeId }),
      },
      select: taskSelect,
    });

    res.json({ task });
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:projectId/tasks/:taskId ─────────────────────────────
// Admin or creator can delete.
router.delete('/:projectId/tasks/:taskId', authenticate, requireProjectMember, async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAdmin   = req.membership.role === 'ADMIN';
    const isCreator = task.creatorId === req.user.id;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
