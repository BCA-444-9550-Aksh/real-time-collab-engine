import { Schema, model, Document } from 'mongoose';
import { IUser, UserRole } from '../types';

/**
 * User Model
 *
 * Design notes:
 * - `email` has a unique sparse index — core query field for login/lookup
 * - `passwordHash` must NEVER be returned in API responses (use .select('-passwordHash'))
 * - `role` is a global system role. Document-level permissions live in Collaborator collection
 * - `updatedAt` is managed automatically by Mongoose timestamps option
 */

export type UserDocument = IUser & Document;

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be ≤ 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned by default in queries
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'] satisfies UserRole[],
      default: 'editor',
    },
  },
  {
    timestamps: true,          // adds createdAt + updatedAt automatically
    versionKey: false,         // disable __v field
    toJSON: {
      transform(_, ret) {
        (ret as Record<string, unknown>).passwordHash = undefined; // extra safety — never leak hash
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email index is created automatically from `unique: true`
// Additional index for case-insensitive name search (optional future use)
UserSchema.index({ name: 'text' });

export const User = model<UserDocument>('User', UserSchema);
