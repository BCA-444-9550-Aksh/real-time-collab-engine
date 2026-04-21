import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from './ThreeBackground';

// Simulated cursors for the animated multi-user feel
const CURSORS = [
  { name: 'Alex', color: '#818cf8', x: 38, y: 55, delay: 0 },
  { name: 'Maria', color: '#34d399', x: 68, y: 35, delay: 0.4 },
  { name: 'Jordan', color: '#f472b6', x: 55, y: 72, delay: 0.8 },
];

const TYPEWRITER_TEXTS = [
  'Build together, in real time.',
  'Your team. One document. Zero lag.',
  'Collaboration at the speed of thought.',
];

function FloatingCursor({
  name,
  color,
  x,
  y,
  delay,
}: {
  name: string;
  color: string;
  x: number;
  y: number;
  delay: number;
}) {
  return (
    <motion.div
      className="floating-cursor"
      style={{ left: `${x}%`, top: `${y}%`, color }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 1, 1, 1, 0.8, 1],
        x: [0, 8, -5, 12, 0],
        y: [0, -6, 10, -3, 0],
        scale: [0.5, 1, 1, 1, 1],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
    >
      {/* Cursor SVG */}
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        <path
          d="M1 1L17 9L9 11L5 19L1 1Z"
          fill={color}
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="1"
        />
      </svg>
      {/* Label */}
      <motion.span
        className="cursor-label"
        style={{ background: color }}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 0.3 }}
      >
        {name}
      </motion.span>
    </motion.div>
  );
}

function TypewriterText() {
  const [textIdx, setTextIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = TYPEWRITER_TEXTS[textIdx];

    if (!deleting && charIdx < target.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), 38);
      return () => clearTimeout(t);
    }

    if (!deleting && charIdx === target.length) {
      const t = setTimeout(() => setDeleting(true), 2400);
      return () => clearTimeout(t);
    }

    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx((c) => c - 1), 22);
      return () => clearTimeout(t);
    }

    if (deleting && charIdx === 0) {
      setDeleting(false);
      setTextIdx((i) => (i + 1) % TYPEWRITER_TEXTS.length);
    }
  }, [charIdx, deleting, textIdx]);

  useEffect(() => {
    setDisplayed(TYPEWRITER_TEXTS[textIdx].slice(0, charIdx));
  }, [charIdx, textIdx]);

  return (
    <span className="typewriter-text">
      {displayed}
      <span className="typewriter-cursor">|</span>
    </span>
  );
}

export default function HeroSection() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section className="hero-section" ref={heroRef} id="hero">
      {/* Three.js animated grid */}
      <ThreeBackground />

      {/* Radial glow */}
      <div className="hero-glow" />
      <div className="hero-glow-secondary" />

      {/* Content */}
      <div className="hero-content">
        {/* Status badge */}
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="hero-badge-dot" />
          <span>Live collaboration engine · v2.0</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          Documents that{' '}
          <span className="hero-headline-accent">think</span>{' '}
          together
        </motion.h1>

        {/* Typewriter subheadline */}
        <motion.p
          className="hero-subheadline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <TypewriterText />
        </motion.p>

        {/* Secondary copy */}
        <motion.p
          className="hero-body"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          SyncDraft brings sub-100ms real-time editing, live cursors, and conflict-free
          sync to any team — from solo devs to enterprise rooms.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <button
            className="btn-hero-primary"
            onClick={() => navigate('/auth')}
            id="hero-start-editing"
          >
            <span>Start Editing</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="btn-hero-secondary"
            onClick={() => {
              document.getElementById('live-preview')?.scrollIntoView({ behavior: 'smooth' });
            }}
            id="hero-live-demo"
          >
            <span className="btn-demo-dot" />
            Live Demo
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          className="hero-social-proof"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="hero-avatars">
            {['A', 'M', 'J', 'K', 'R'].map((l, i) => (
              <div
                key={l}
                className="hero-avatar"
                style={{ '--i': i } as React.CSSProperties}
              >
                {l}
              </div>
            ))}
          </div>
          <span className="hero-social-text">
            Trusted by <strong>2,400+</strong> teams worldwide
          </span>
        </motion.div>
      </div>

      {/* Floating cursors */}
      <div className="hero-cursors-canvas">
        {CURSORS.map((c) => (
          <FloatingCursor key={c.name} {...c} />
        ))}
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="hero-scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <motion.div
          className="hero-scroll-dot"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      </motion.div>
    </section>
  );
}
