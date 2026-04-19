import { CRDTOp } from '../types';

/**
 * CRDT Service — Positional Character Array (Tombstone-based)
 *
 * Algorithm: Each character in the document is represented as a node
 * with a unique (siteId + clock) lamport timestamp. Inserts place characters
 * at an absolute position. Deletes mark characters as tombstones (invisible
 * but still in the array for position resolution).
 *
 * Properties:
 * - Eventual consistency: any ordering of concurrent ops produces the same result
 * - Commutativity: op(A) ∘ op(B) = op(B) ∘ op(A)
 * - Idempotency: applying the same op twice is safe
 * - Convergence: all peers converge to the same state
 *
 * This is a simplified implementation suitable for plain-text editing.
 * For rich-text (bold, italic, etc.), use attrs field and extend the merge logic.
 */

// ─── Character node ───────────────────────────────────────────────────────────

export interface CharNode {
  id: string;        // Unique: `${siteId}:${clock}`
  char: string;      // The actual character (empty string for tombstone)
  deleted: boolean;  // Tombstone flag
  attrs?: Record<string, unknown>; // Rich-text attributes
}

// ─── Document state ───────────────────────────────────────────────────────────

export interface CRDTDocument {
  chars: CharNode[];
  clock: number;     // Lamport clock for this site
}

/**
 * Creates a new empty CRDT document.
 */
export function createCRDTDocument(): CRDTDocument {
  return { chars: [], clock: 0 };
}

/**
 * Reconstructs the visible text from the CRDT character array.
 * Tombstoned characters are filtered out.
 */
export function getVisibleText(doc: CRDTDocument): string {
  return doc.chars
    .filter((c) => !c.deleted)
    .map((c) => c.char)
    .join('');
}

/**
 * Returns the position in the chars array (including tombstones)
 * for a given visible position.
 */
function visiblePosToArrayIdx(chars: CharNode[], visiblePos: number): number {
  let visible = 0;
  for (let i = 0; i < chars.length; i++) {
    if (!chars[i]!.deleted) {
      if (visible === visiblePos) return i;
      visible++;
    }
  }
  return chars.length; // append at end
}

/**
 * Apply a CRDTOp to a document, returning the updated document.
 * This function is PURE — it does not mutate the input.
 *
 * Used by:
 * - The WebSocket edit handler (apply + broadcast)
 * - The reconstruction service (replay ops from DB)
 */
export function applyOp(doc: CRDTDocument, op: CRDTOp, siteId: string): CRDTDocument {
  const chars = [...doc.chars];
  let clock = doc.clock;

  if (op.type === 'insert' && op.text) {
    clock++;
    const arrayIdx = visiblePosToArrayIdx(chars, op.pos);

    // Insert each character individually with unique IDs
    const newNodes: CharNode[] = op.text.split('').map((char, i) => ({
      id: `${siteId}:${clock}:${i}`,
      char,
      deleted: false,
      ...(op.attrs && { attrs: op.attrs }),
    }));

    chars.splice(arrayIdx, 0, ...newNodes);
  } else if (op.type === 'delete' && op.length) {
    // Mark characters as tombstones (do NOT remove from array)
    let arrayIdx = visiblePosToArrayIdx(chars, op.pos);
    let remaining = op.length;

    while (remaining > 0 && arrayIdx < chars.length) {
      if (!chars[arrayIdx]!.deleted) {
        chars[arrayIdx] = { ...chars[arrayIdx]!, deleted: true };
        remaining--;
      }
      arrayIdx++;
    }
  } else if (op.type === 'replace' && typeof op.text === 'string') {
    clock++;
    // Full replacement: recreate the character nodes from scratch.
    // This is a macroscopic "sync" strategy for rich text since exact char deltas aren't sent.
    const newNodes: CharNode[] = op.text.split('').map((char, i) => ({
      id: `${siteId}:${clock}:${i}`,
      char,
      deleted: false,
    }));
    return { chars: newNodes, clock };
  }
  // 'retain' is a no-op in this pure-CRDT implementation

  return { chars, clock };
}

/**
 * Transforms two concurrent operations against each other (OT-style adjustment).
 * Used when an operation arrives out of order to adjust positions.
 *
 * @param incoming - The operation to transform
 * @param concurrent - The operation that was already applied
 * @returns Transformed incoming operation
 */
export function transformOp(incoming: CRDTOp, concurrent: CRDTOp): CRDTOp {
  // Both ops are inserts
  if (incoming.type === 'insert' && concurrent.type === 'insert') {
    if (concurrent.pos <= incoming.pos) {
      // concurrent insert was BEFORE incoming → shift incoming pos right
      return { ...incoming, pos: incoming.pos + (concurrent.text?.length ?? 0) };
    }
    return incoming;
  }

  // Incoming insert, concurrent delete
  if (incoming.type === 'insert' && concurrent.type === 'delete') {
    const deleteEnd = concurrent.pos + (concurrent.length ?? 0);
    if (concurrent.pos < incoming.pos) {
      const shift = Math.min(incoming.pos - concurrent.pos, concurrent.length ?? 0);
      return { ...incoming, pos: incoming.pos - shift };
    }
    return incoming;
  }

  // Incoming delete, concurrent insert
  if (incoming.type === 'delete' && concurrent.type === 'insert') {
    if (concurrent.pos <= incoming.pos) {
      return { ...incoming, pos: incoming.pos + (concurrent.text?.length ?? 0) };
    }
    return incoming;
  }

  // Both ops are deletes
  if (incoming.type === 'delete' && concurrent.type === 'delete') {
    const concEnd = concurrent.pos + (concurrent.length ?? 0);
    const incEnd = incoming.pos + (incoming.length ?? 0);

    if (concEnd <= incoming.pos) {
      // concurrent entirely before incoming
      return { ...incoming, pos: incoming.pos - (concurrent.length ?? 0) };
    }
    if (concurrent.pos >= incEnd) {
      // concurrent entirely after incoming — no change
      return incoming;
    }
    // Overlap — reduce incoming length
    const overlap = Math.min(concEnd, incEnd) - Math.max(concurrent.pos, incoming.pos);
    return { ...incoming, length: Math.max(0, (incoming.length ?? 0) - overlap) };
  }

  return incoming;
}

/**
 * Serializes the CRDT document state to a JSON string for storage as a snapshot.
 */
export function serializeDocument(doc: CRDTDocument): string {
  return JSON.stringify(doc);
}

/**
 * Deserializes a stored snapshot back into a CRDTDocument.
 */
export function deserializeDocument(snapshot: string): CRDTDocument {
  return JSON.parse(snapshot) as CRDTDocument;
}
