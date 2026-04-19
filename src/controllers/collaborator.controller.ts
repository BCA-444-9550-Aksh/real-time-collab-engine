import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Collaborator } from '../models/Collaborator';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';
import * as docService from '../services/document.service';

/**
 * @swagger
 * tags:
 *   name: Collaborators
 *   description: Manage document collaborators and their roles
 */

/**
 * @swagger
 * /api/docs/{id}/collaborators:
 *   post:
 *     summary: Add a collaborator to a document (owner/admin only)
 *     tags: [Collaborators]
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
 *             required: [email, role]
 *             properties:
 *               email: { type: string }
 *               role: { type: string, enum: [admin, editor, viewer] }
 *     responses:
 *       201:
 *         description: Collaborator added
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already a collaborator
 */
export const addCollaborator = asyncHandler(async (req: Request, res: Response) => {
  const docId = req.params['id']!;
  const { email, role } = req.body;

  const targetUser = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  if (!targetUser) {
    throw new AppError(`No user found with email ${email}`, 404, 'NOT_FOUND');
  }
  const userId = targetUser._id.toString();

  const doc = await docService.getDocumentById(docId);
  const isOwner = (doc as { ownerId: Types.ObjectId }).ownerId.toString() === req.user!.id;

  // Owners cannot be invited as collaborators
  if (userId === (doc as { ownerId: Types.ObjectId }).ownerId.toString()) {
    throw new AppError('The owner is already a collaborator', 400, 'BAD_REQUEST');
  }

  if (!isOwner) {
    // Check if requester is admin collaborator
    const requesterCollab = await Collaborator.findOne({
      docId: new Types.ObjectId(docId),
      userId: new Types.ObjectId(req.user!.id),
    }).lean();
    if (!requesterCollab || requesterCollab.role !== 'admin') {
      throw new AppError('Only the owner or an admin can add collaborators', 403, 'FORBIDDEN');
    }
  }

  const collab = await Collaborator.findOneAndUpdate(
    { docId: new Types.ObjectId(docId), userId: new Types.ObjectId(userId) },
    { role },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('userId', 'name email').lean() as any;

  res.status(201).json(success({
    userId: collab.userId._id,
    name: collab.userId.name,
    email: collab.userId.email,
    role: collab.role
  }, 'Collaborator added'));
});

/**
 * @swagger
 * /api/docs/{id}/collaborators:
 *   get:
 *     summary: List all collaborators of a document
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of collaborators with roles
 */
export const listCollaborators = asyncHandler(async (req: Request, res: Response) => {
  const docId = req.params['id']!;
  await docService.assertDocAccess(docId, req.user!.id);

  const collabs = await Collaborator.find({ docId: new Types.ObjectId(docId) })
    .populate('userId', 'name email')
    .lean() as any[];

  const formattedCollabs = collabs.map(c => ({
    userId: c.userId._id,
    name: c.userId.name,
    email: c.userId.email,
    role: c.role
  }));

  res.json(success(formattedCollabs));
});

/**
 * @swagger
 * /api/docs/{id}/collaborators/{userId}:
 *   patch:
 *     summary: Update a collaborator's role (owner/admin only)
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [admin, editor, viewer] }
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Collaborator not found
 */
export const updateCollaboratorRole = asyncHandler(async (req: Request, res: Response) => {
  const { id: docId, userId } = req.params as { id: string; userId: string };
  const { role } = req.body;

  const doc = await docService.getDocumentById(docId);
  const isOwner = (doc as { ownerId: Types.ObjectId }).ownerId.toString() === req.user!.id;

  if (!isOwner) {
    const requesterCollab = await Collaborator.findOne({
      docId: new Types.ObjectId(docId),
      userId: new Types.ObjectId(req.user!.id),
    }).lean();
    if (!requesterCollab || requesterCollab.role !== 'admin') {
      throw new AppError('Only the owner or an admin can change roles', 403, 'FORBIDDEN');
    }
  }

  // Prevent changing the owner's entry (owner doesn't have a Collaborator record)
  const updated = await Collaborator.findOneAndUpdate(
    { docId: new Types.ObjectId(docId), userId: new Types.ObjectId(userId) },
    { role },
    { new: true }
  );

  if (!updated) {
    throw new AppError('Collaborator not found', 404, 'NOT_FOUND');
  }

  res.json(success(updated, 'Role updated'));
});

/**
 * @swagger
 * /api/docs/{id}/collaborators/{userId}:
 *   delete:
 *     summary: Remove a collaborator (owner/admin or self-removal)
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Collaborator removed
 *       403:
 *         description: Forbidden
 */
export const removeCollaborator = asyncHandler(async (req: Request, res: Response) => {
  const { id: docId, userId } = req.params as { id: string; userId: string };

  const doc = await docService.getDocumentById(docId);
  const isOwner = (doc as { ownerId: Types.ObjectId }).ownerId.toString() === req.user!.id;
  const isSelf = userId === req.user!.id;

  if (!isOwner && !isSelf) {
    const requesterCollab = await Collaborator.findOne({
      docId: new Types.ObjectId(docId),
      userId: new Types.ObjectId(req.user!.id),
    }).lean();
    if (!requesterCollab || requesterCollab.role !== 'admin') {
      throw new AppError('Insufficient permissions to remove collaborators', 403, 'FORBIDDEN');
    }
  }

  await Collaborator.findOneAndDelete({
    docId: new Types.ObjectId(docId),
    userId: new Types.ObjectId(userId),
  });

  res.json(success(null, 'Collaborator removed'));
});
