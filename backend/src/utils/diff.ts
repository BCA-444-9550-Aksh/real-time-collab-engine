/**
 * Diff utilities for efficient document state comparison.
 * Used to compute minimal diffs before broadcasting to peers,
 * avoiding full-document retransmission.
 */

/**
 * Computes the Longest Common Subsequence (LCS) length between two strings.
 * Used internally by computeDiff.
 */
function lcsLength(a: string, b: string): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  return dp;
}

export interface DiffOp {
  type: 'equal' | 'insert' | 'delete';
  value: string;
  pos: number;
}

/**
 * Computes a character-level diff between two strings.
 * Returns an array of DiffOps representing the minimum edit distance.
 *
 * This is used for broadcasting efficient diffs rather than full snapshots.
 * For production at scale, consider using the `diff-match-patch` library.
 */
export function computeDiff(oldText: string, newText: string): DiffOp[] {
  const dp = lcsLength(oldText, newText);
  const ops: DiffOp[] = [];

  let i = oldText.length;
  let j = newText.length;
  let pos = 0;

  // Backtrack through DP table
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      ops.unshift({ type: 'equal', value: oldText[i - 1]!, pos });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.unshift({ type: 'insert', value: newText[j - 1]!, pos });
      j--;
    } else {
      ops.unshift({ type: 'delete', value: oldText[i - 1]!, pos });
      i--;
    }
  }

  // Assign absolute positions
  let currentPos = 0;
  return ops.map((op) => {
    const withPos = { ...op, pos: currentPos };
    if (op.type !== 'delete') currentPos++;
    return withPos;
  });
}

/**
 * Applies an array of DiffOps to a string, returning the new string.
 * Used to reconstruct the final state from a diff.
 */
export function applyDiff(base: string, ops: DiffOp[]): string {
  let result = '';
  for (const op of ops) {
    if (op.type === 'equal' || op.type === 'insert') {
      result += op.value;
    }
    // delete → skip the character
  }
  return result;
}
