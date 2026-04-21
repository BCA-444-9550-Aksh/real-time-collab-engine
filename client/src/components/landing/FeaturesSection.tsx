import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    id: 'realtime',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
      </svg>
    ),
    title: 'Real-Time Editing',
    desc: 'Every keystroke synced in under 100ms. No merge conflicts, no stale data — pure CRDT magic under the hood.',
    accent: '#818cf8',
    tag: '<100ms',
  },
  {
    id: 'cursors',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 4L10 20L13 13L20 10L4 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Live Cursors',
    desc: 'See exactly where your teammates are. Named, color-coded cursors that move in real time.',
    accent: '#34d399',
    tag: 'Multi-user',
  },
  {
    id: 'history',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 12C3 7.03 7.03 3 12 3s9 4.03 9 9-4.03 9-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 12L6 8M3 12L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 7V12L15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Version History',
    desc: 'Every document save is a snapshot. Rewind to any moment with one click — up to 90 days back.',
    accent: '#f472b6',
    tag: '90-day history',
  },
  {
    id: 'chat',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15C21 16.1 20.1 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Inline Chat',
    desc: 'Comment threads and live chat built into the editor. Keep context exactly where the work happens.',
    accent: '#fb923c',
    tag: 'Threaded',
  },
  {
    id: 'offline',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L12 22M2 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3"/>
        <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 12L11.5 13.5L14 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Offline Sync',
    desc: 'Work without internet. Changes queue locally and sync the moment you reconnect — zero data loss.',
    accent: '#38bdf8',
    tag: 'Queue-based',
  },
  {
    id: 'permissions',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Granular Permissions',
    desc: 'Owner, Editor, Commenter, Viewer. Share with a link or invite by email — you control access.',
    accent: '#a78bfa',
    tag: 'Role-based',
  },
];

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="features-section" id="features" ref={ref}>
      {/* Section label */}
      <motion.div
        className="section-eyebrow"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="eyebrow-line" />
        <span>Capabilities</span>
      </motion.div>

      {/* Heading */}
      <motion.h2
        className="section-heading"
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Everything your team
        <br />
        <span className="heading-dim">needs to ship faster</span>
      </motion.h2>

      {/* Features grid */}
      <div className="features-grid">
        {FEATURES.map((feat, i) => (
          <motion.div
            key={feat.id}
            className="feature-card"
            style={{ '--accent': feat.accent } as React.CSSProperties}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.07 }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            {/* Glow on hover */}
            <div className="feature-card-glow" />

            {/* Icon */}
            <div className="feature-icon" style={{ color: feat.accent }}>
              {feat.icon}
            </div>

            {/* Tag */}
            <span className="feature-tag" style={{ color: feat.accent, borderColor: feat.accent }}>
              {feat.tag}
            </span>

            {/* Title & desc */}
            <h3 className="feature-title">{feat.title}</h3>
            <p className="feature-desc">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
