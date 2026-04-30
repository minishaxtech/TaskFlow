// src/middleware/auth.js
const jwt  = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Verifies JWT bearer token and attaches req.user (full User row from DB).
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Checks whether the authenticated user has ADMIN role in a given project.
 * Requires authenticate() to have run first.
 * Reads projectId from req.params.projectId.
 */
async function requireProjectAdmin(req, res, next) {
  try {
    const { projectId } = req.params;
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }
    if (membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required for this action' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Checks that the authenticated user is at least a member of a project.
 */
async function requireProjectMember(req, res, next) {
  try {
    const { projectId } = req.params;
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, requireProjectAdmin, requireProjectMember };
