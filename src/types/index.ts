import { Types } from 'mongoose';

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface IDocument {
  _id: Types.ObjectId;
  title: string;
  ownerId: Types.ObjectId;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Collaborator ─────────────────────────────────────────────────────────────

export type CollaboratorRole = 'admin' | 'editor' | 'viewer';

export interface ICollaborator {
  _id: Types.ObjectId;
  docId: Types.ObjectId;
  userId: Types.ObjectId;
  role: CollaboratorRole;
  createdAt: Date;
}

// ─── Operation (CRDT) ─────────────────────────────────────────────────────────

/**
 * A CRDT operation represents an atomic change to the document.
 * type:
 *   - 'insert': insert `text` at position `pos`
 *   - 'delete': delete `length` characters starting at `pos`
 *   - 'retain': no-op retain (used for rich-text deltas)
 */
export interface CRDTOp {
  type: 'insert' | 'delete' | 'retain' | 'replace';
  pos: number;
  text?: string;       // for insert / replace
  length?: number;     // for delete / retain
  attrs?: Record<string, unknown>; // rich-text attributes
}

export interface IOperation {
  _id: Types.ObjectId;
  docId: Types.ObjectId;
  userId: Types.ObjectId;
  op: CRDTOp;
  version: number;           // strictly increasing per docId
  clientId?: string;         // client-generated UUID for deduplication
  timestamp: Date;
}

// ─── Version (Snapshot) ───────────────────────────────────────────────────────

export interface IVersion {
  _id: Types.ObjectId;
  docId: Types.ObjectId;
  snapshot: string;         // serialized document content at this version
  versionNumber: number;
  createdAt: Date;
}

// ─── Message (Chat) ───────────────────────────────────────────────────────────

export interface IMessage {
  _id: Types.ObjectId;
  docId: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  sub: string;          // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;          // userId
  iat?: number;
  exp?: number;
}

// ─── Request augmentation ─────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Populated by the auth middleware after JWT verification */
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// ─── Socket types ─────────────────────────────────────────────────────────────

export interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface CursorPosition {
  userId: string;
  name: string;
  pos: number;
  color: string;
}

// ─── API response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  meta?: Record<string, unknown>;
}
