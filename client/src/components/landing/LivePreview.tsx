import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

// Simulated typing sequences for the fake editor
const TYPING_SESSIONS = [
  {
    user: 'Alex',
    color: '#818cf8',
    lines: [
      { line: 1, text: '# Product Roadmap Q3' },
      { line: 3, text: '## Goals' },
      { line: 4, text: '- Launch API v2 by July 15' },
    ],
  },
  {
    user: 'Maria',
    color: '#34d399',
    lines: [
      { line: 5, text: '- Improve onboarding flow' },
      { line: 6, text: '- Reduce churn by 12%' },
    ],
  },
  {
    user: 'Jordan',
    color: '#f472b6',
    lines: [{ line: 8, text: '> Note: All metrics subject to revision' }],
  },
];

const ALL_LINES: Record<number, { text: string; user: string; color: string }> = {};
TYPING_SESSIONS.forEach((s) =>
  s.lines.forEach((l) => {
    ALL_LINES[l.line] = { text: l.text, user: s.user, color: s.color };
  })
);

// Which lines appear in order
const LINE_ORDER = [1, 3, 4, 5, 6, 8];

interface EditorLine {
  lineNum: number;
  text: string;
  color: string;
  visible: boolean;
}

function FakeEditor() {
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [activeCursor, setActiveCursor] = useState<string | null>(null);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= LINE_ORDER.length) {
        idx = 0;
        setLines([]);
        return;
      }
      const lineNum = LINE_ORDER[idx];
      const info = ALL_LINES[lineNum];
      setActiveCursor(info.user);
      setLines((prev) => [
        ...prev.filter((l) => l.lineNum !== lineNum),
        { lineNum, text: info.text, color: info.color, visible: true },
      ]);
      idx++;
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  // Build display lines 1–10
  const displayLines = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
    const found = lines.find((l) => l.lineNum === n);
    return { lineNum: n, text: found?.text ?? '', color: found?.color ?? '', visible: !!found };
  });

  return (
    <div className="fake-editor">
      {/* Editor chrome */}
      <div className="editor-chrome">
        <div className="editor-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="editor-title">product-roadmap.md</span>
        <div className="editor-pills">
          {TYPING_SESSIONS.map((s) => (
            <span
              key={s.user}
              className={`editor-user-pill ${activeCursor === s.user ? 'pill-active' : ''}`}
              style={{ borderColor: s.color, color: s.color }}
            >
              <span className="pill-dot" style={{ background: s.color }} />
              {s.user}
            </span>
          ))}
        </div>
      </div>

      {/* Editor body */}
      <div className="editor-body">
        {displayLines.map((line) => (
          <motion.div
            key={line.lineNum}
            className="editor-line"
            layout
          >
            {/* Line number */}
            <span className="editor-line-num">{line.lineNum}</span>

            {/* Content */}
            <span className="editor-line-text">
              {line.visible ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={line.text.startsWith('#') ? { color: '#e2e8f0', fontWeight: 700 } :
                         line.text.startsWith('>') ? { color: '#94a3b8', fontStyle: 'italic' } :
                         line.text.startsWith('-') ? { color: '#cbd5e1' } : { color: '#94a3b8' }}
                >
                  {line.text}
                </motion.span>
              ) : (
                <span className="editor-empty-line" />
              )}

              {/* Active cursor indicator */}
              {line.visible && line.color && (
                <motion.span
                  className="editor-cursor-blink"
                  style={{ background: line.color }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </span>

            {/* User tag on right */}
            {line.visible && line.color && (
              <motion.span
                className="editor-user-tag"
                style={{ background: line.color + '22', color: line.color }}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {ALL_LINES[line.lineNum]?.user}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Status bar */}
      <div className="editor-statusbar">
        <span>Markdown</span>
        <span>•</span>
        <span style={{ color: '#34d399' }}>● Live · 3 editors</span>
        <span>•</span>
        <span>Saved just now</span>
      </div>
    </div>
  );
}

export default function LivePreview() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="live-preview-section" id="live-preview" ref={ref}>
      <div className="live-preview-inner">
        {/* Left: copy */}
        <div className="live-preview-copy">
          <motion.div
            className="section-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
          >
            <span className="eyebrow-line" />
            <span>Live Preview</span>
          </motion.div>

          <motion.h2
            className="section-heading text-left"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
          >
            Watch it happen
            <br />
            <span className="heading-dim">in real time</span>
          </motion.h2>

          <motion.p
            className="section-body"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            The editor below simulates what your team sees — multiple cursors,
            instant rendering, and full sync. No page refresh. No conflicts.
          </motion.p>

          <motion.ul
            className="live-preview-bullets"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.35 }}
          >
            {[
              { text: 'Color-coded per collaborator', color: '#818cf8' },
              { text: 'Autosaved every 500ms', color: '#34d399' },
              { text: 'Conflict-free CRDT merge', color: '#f472b6' },
            ].map((b) => (
              <li key={b.text} className="live-preview-bullet">
                <span className="bullet-dot" style={{ background: b.color }} />
                {b.text}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Right: fake editor */}
        <motion.div
          className="live-preview-editor-wrapper"
          initial={{ opacity: 0, x: 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <FakeEditor />
        </motion.div>
      </div>
    </section>
  );
}
