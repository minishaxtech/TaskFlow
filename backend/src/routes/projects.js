// src/routes/projects.js
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const projectSelect = {
  id: true, name: true, description: true, createdAt: true,
  owner: { select: { id: true, name: true, email: true } },
  _count: { select: { tasks: true, members: true } },
};

// ── GET /api/projects ────────────────────────────────────────────────────────
// Returns all projects the authenticated user is a member of.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      select: projectSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ projects });
  } catch (err) { next(err); }
});

// ── POST /api/projects ───────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  [body('name').trim().notEmpty().withMessage('Project name required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { name, description } = req.body;

      const project = await prisma.project.create({
        data: {
          name, description,
          ownerId: req.user.id,
          members: { create: { userId: req.user.id, role: 'ADMIN' } },
        },
        select: projectSelect,
      });

      res.status(201).json({ project });
    } catch (err) { next(err); }
  }
);

// ── GET /api/projects/:projectId ─────────────────────────────────────────────
router.get('/:projectId', authenticate, requireProjectMember, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: {
        ...projectSelect,
        members: {
          select: {
            role: true, joinedAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project, membership: req.membership });
  } catch (err) { next(err); }
});

// ── PATCH /api/projects/:projectId ───────────────────────────────────────────
router.patch('/:projectId', authenticate, requireProjectAdmin, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
      select: projectSelect,
    });
    res.json({ project });
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:projectId ──────────────────────────────────────────
router.delete('/:projectId', authenticate, requireProjectAdmin, async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

// ── POST /api/projects/:projectId/members ─────────────────────────────────────
// Admin only: invite a user by email.
router.post(
  '/:projectId/members',
  authenticate, requireProjectAdmin,
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

      const { email, role = 'MEMBER' } = req.body;
      const invitee = await prisma.user.findUnique({ where: { email } });
      if (!invitee) return res.status(404).json({ error: 'User not found' });

      const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.params.projectId, userId: invitee.id } },
      });
      if (existing) return res.status(409).json({ error: 'User already a member' });

      const member = await prisma.projectMember.create({
        data: { projectId: req.params.projectId, userId: invitee.id, role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      res.status(201).json({ member });
    } catch (err) { next(err); }
  }
);

// ── DELETE /api/projects/:projectId/members/:userId ───────────────────────────
router.delete(
  '/:projectId/members/:userId',
  authenticate, requireProjectAdmin,
  async (req, res, next) => {
    try {
      const { projectId, userId } = req.params;
      // Cannot remove project owner
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project?.ownerId === userId) {
        return res.status(400).json({ error: 'Cannot remove project owner' });
      }

      await prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });
      res.json({ message: 'Member removed' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
