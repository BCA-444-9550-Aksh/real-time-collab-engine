import { Request, Response } from 'express';
import * as opService from '../services/operation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { validate } from '../middleware/validate';
import * as docService from '../services/document.service';

/**
 * @swagger
 * tags:
 *   name: Versions
 *   description: Document version history and rollback
 */

/**
 * @swagger
 * /api/docs/{id}/history:
 *   get:
 *     summary: Get version history for a document
 *     tags: [Versions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of version snapshots (without content blob)
 *       403:
 *         description: Access denied
 */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const docId = req.params['id']!;
  await docService.assertDocAccess(docId, req.user!.id);

  const history = await opService.getVersionHistory(docId);
  res.json(success(history));
});

/**
 * @swagger
 * /api/docs/{id}/rollback:
 *   post:
 *     summary: Rollback document to a specific version (owner/admin only)
 *     tags: [Versions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [versionNumber]
 *             properties:
 *               versionNumber: { type: integer, example: 50 }
 *     responses:
 *       200:
 *         description: Document rolled back, returns new content
 *       400:
 *         description: Invalid version number
 *       403:
 *         description: Insufficient permissions
 */
export const rollback = asyncHandler(async (req: Request, res: Response) => {
  const docId = req.params['id']!;
  const { versionNumber } = req.body as { versionNumber: number };

  // Only owner/admin can rollback
  await docService.assertDocWriteAccess(docId, req.user!.id);

  const content = await opService.rollbackToVersion(docId, versionNumber);
  res.json(success({ content, versionNumber }, 'Document rolled back successfully'));
});
