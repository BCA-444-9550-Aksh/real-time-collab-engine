import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Message } from '../models/Message';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as docService from '../services/document.service';

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Document-scoped chat message history
 */

/**
 * @swagger
 * /api/docs/{id}/messages:
 *   get:
 *     summary: Fetch chat messages for a document (cursor-based pagination)
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *         description: Number of messages per page
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: ISO timestamp — fetch messages created BEFORE this timestamp
 *     responses:
 *       200:
 *         description: Paginated message list, newest first
 *       403:
 *         description: Access denied
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const docId = req.params['id']!;
  await docService.assertDocAccess(docId, req.user!.id);

  const limit = Math.min(Number(req.query['limit']) || 20, 100);
  const cursor = req.query['cursor'] as string | undefined;

  const query: Record<string, unknown> = { docId: new Types.ObjectId(docId) };
  if (cursor) {
    // Cursor = ISO timestamp; return messages older than cursor
    query['createdAt'] = { $lt: new Date(cursor) };
  }

  const messages = await Message.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Send the oldest message's timestamp as next cursor
  const nextCursor =
    messages.length === limit
      ? (messages[messages.length - 1] as { createdAt: Date }).createdAt.toISOString()
      : null;

  res.json(
    success(messages, undefined, {
      limit,
      nextCursor,
      hasMore: nextCursor !== null,
    })
  );
});
