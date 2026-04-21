import { Request, Response } from 'express';
import * as docService from '../services/document.service';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document CRUD operations
 */

/**
 * @swagger
 * /api/docs:
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: "My Document" }
 *     responses:
 *       201:
 *         description: Document created
 *       422:
 *         description: Validation error
 */
export const createDoc = asyncHandler(async (req: Request, res: Response) => {
  const { title } = req.body;
  const doc = await docService.createDocument(req.user!.id, title);
  res.status(201).json(success(doc, 'Document created'));
});

/**
 * @swagger
 * /api/docs/{id}:
 *   get:
 *     summary: Get document metadata by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document metadata
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document not found
 */
export const getDoc = asyncHandler(async (req: Request, res: Response) => {
  await docService.assertDocAccess(req.params['id']!, req.user!.id);
  const doc = await docService.getDocumentById(req.params['id']!);
  res.json(success(doc));
});

/**
 * @swagger
 * /api/docs/{id}:
 *   patch:
 *     summary: Update document metadata (title)
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *     responses:
 *       200:
 *         description: Document updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export const updateDoc = asyncHandler(async (req: Request, res: Response) => {
  const doc = await docService.updateDocument(req.params['id']!, req.user!.id, req.body);
  res.json(success(doc, 'Document updated'));
});

/**
 * @swagger
 * /api/docs/{id}:
 *   delete:
 *     summary: Soft-delete a document (owner only)
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document deleted
 *       403:
 *         description: Only the owner can delete
 */
export const deleteDoc = asyncHandler(async (req: Request, res: Response) => {
  await docService.deleteDocument(req.params['id']!, req.user!.id);
  res.json(success(null, 'Document deleted'));
});

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: List all documents accessible to the current user
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Owned and collaborated document lists
 */
export const listDocs = asyncHandler(async (req: Request, res: Response) => {
  const result = await docService.getUserDocuments(req.user!.id);
  res.json(success(result));
});
