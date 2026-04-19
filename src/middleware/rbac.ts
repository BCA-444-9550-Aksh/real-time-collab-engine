import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { UserRole } from '../types';
import { Collaborator } from '../models/Collaborator';
import { AppError } from './errorHandler';

/**
 * RBAC Middleware — System Role Check
 *
 * Checks the global system-level role on req.user.
 * Use this for admin-only operations (e.g., user management).
 *
 * Usage: router.get('/admin/users', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthenticated', 401, 'UNAUTHENTICATED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

/**
 * RBAC Middleware — Document-Level Permission Check
 *
 * Checks the Collaborator collection for this user's role on a specific document.
 * Falls through if the user is the document owner (owners have implicit admin access).
 *
 * Usage: router.patch('/:id', authenticate, requireDocRole('admin', 'editor'), handler)
 *
 * The document owner is checked in the controller against doc.ownerId.
 * This middleware checks the Collaborator record.
 */
export function requireDocRole(...roles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError('Unauthenticated', 401, 'UNAUTHENTICATED'));
    }

    const docId = req.params['id'];

    if (!docId || !Types.ObjectId.isValid(docId)) {
      return next(new AppError('Invalid document ID', 400, 'INVALID_ID'));
    }

    try {
      const collab = await Collaborator.findOne({
        docId: new Types.ObjectId(docId),
        userId: new Types.ObjectId(req.user.id),
      }).lean();

      // Owner access is granted by the controller, not here
      // If the user is a collaborator, check their role
      if (collab) {
        if (!roles.includes(collab.role as UserRole)) {
          return next(
            new AppError(
              `Insufficient document permissions. Required: ${roles.join(' or ')}`,
              403,
              'DOC_PERMISSION_DENIED'
            )
          );
        }
        // Attach doc role to request for downstream use
        (req as Request & { docRole?: string }).docRole = collab.role;
        return next();
      }

      // Not a collaborator — will be handled by the controller
      // (controller checks if user is owner; if not, rejects)
      next();
    } catch (err) {
      next(err);
    }
  };
}
