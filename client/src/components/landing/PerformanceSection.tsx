import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 100, suffix: 'ms', label: 'Avg. Sync Latency', prefix: '<', color: '#818cf8' },
  { value: 99.99, suffix: '%', label: 'Uptime SLA', prefix: '', color: '#34d399', decimal: true },
  { value: 50, suffix: 'K+', label: 'Concurrent Users', prefix: '', color: '#f472b6' },
  { value: 10, suffix: 'M+', label: 'Docs Synced Daily', prefix: '', color: '#fb923c' },
];

function AnimatedCounter({
  target,
  decimal,
  suffix,
  prefix,
  color,
  inView,
}: {
  target: number;
  decimal?: boolean;
  suffix: string;
  prefix: string;
  color: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, target);
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  const display = decimal ? count.toFixed(2) : Math.round(count).toLocaleString();

  return (
    <span className="stat-number" style={{ color }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

const ARCH_FEATURES = [
  {
    title: 'CRDT Engine',
    desc: 'Yjs-compatible conflict-free replicated data types ensure every edit merges perfectly.',
    icon: '⟁',
    color: '#818cf8',
  },
  {
    title: 'Redis Pub/Sub',
    desc: 'Operations broadcast via Redis Streams. Horizontal scale with zero message loss.',
    icon: '⚡',
    color: '#34d399',
  },
  {
    title: 'WebSocket Mesh',
    desc: 'Socket.IO with sticky sessions. Falls back gracefully to long-polling when needed.',
    icon: '⬡',
    color: '#f472b6',
  },
];

export default function PerformanceSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="perf-section" id="performance" ref={ref}>
      {/* Background accent */}
      <div className="perf-bg-accent" />

      <div className="perf-inner">
        {/* Label */}
        <motion.div
          className="section-eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="eyebrow-line" />
          <span>Performance</span>
        </motion.div>

        <motion.h2
          className="section-heading"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
        >
          Built for speed,
          <br />
          <span className="heading-dim">engineered to scale</span>
        </motion.h2>

        {/* Stats grid */}
        <div className="perf-stats-grid">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="perf-stat-card"
              style={{ '--accent': stat.color } as React.CSSProperties}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
            >
              <div className="perf-stat-glow" />
              <AnimatedCounter
                target={stat.value}
                decimal={stat.decimal}
                suffix={stat.suffix}
                prefix={stat.prefix}
                color={stat.color}
                inView={inView}
              />
              <span className="stat-label">{stat.label}</span>
              {/* Animated bar */}
              <motion.div
                className="stat-bar-track"
              >
                <motion.div
                  className="stat-bar-fill"
                  style={{ background: stat.color }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: '100%' } : {}}
                  transition={{ duration: 1.8, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Architecture pills */}
        <div className="arch-grid">
          {ARCH_FEATURES.map((a, i) => (
            <motion.div
              key={a.title}
              className="arch-card"
              style={{ '--accent': a.color } as React.CSSProperties}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.55 + i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <span className="arch-icon" style={{ color: a.color }}>
                {a.icon}
              </span>
              <div>
                <h4 className="arch-title">{a.title}</h4>
                <p className="arch-desc">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
