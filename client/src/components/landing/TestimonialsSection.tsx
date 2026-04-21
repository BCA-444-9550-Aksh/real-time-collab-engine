import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote:
      "SyncDraft replaced Notion and Google Docs for us overnight. The latency is genuinely imperceptible — it feels like magic.",
    name: 'Priya Mehta',
    role: 'CTO, Aether Labs',
    avatar: 'P',
    color: '#818cf8',
    stars: 5,
  },
  {
    quote:
      "We onboarded a 40-person engineering team in an afternoon. The live cursors actually changed how we do async work.",
    name: 'Marcus Chen',
    role: 'Engineering Lead, Drift Systems',
    avatar: 'M',
    color: '#34d399',
    stars: 5,
  },
  {
    quote:
      "Version history alone saved us from a catastrophic accidental deletion. I'd pay double just for that feature.",
    name: 'Sarah O\'Brien',
    role: 'Product Manager, NovaCo',
    avatar: 'S',
    color: '#f472b6',
    stars: 5,
  },
];

export default function TestimonialsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="testimonials-section" id="testimonials" ref={ref}>
      <motion.div
        className="section-eyebrow"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
      >
        <span className="eyebrow-line" />
        <span>Social Proof</span>
      </motion.div>

      <motion.h2
        className="section-heading"
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
      >
        Teams that love it
      </motion.h2>

      <div className="testimonials-grid">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            className="testimonial-card"
            style={{ '--accent': t.color } as React.CSSProperties}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.15 + i * 0.12 }}
            whileHover={{ y: -4 }}
          >
            <div className="testimonial-glow" />

            {/* Stars */}
            <div className="testimonial-stars">
              {Array.from({ length: t.stars }, (_, si) => (
                <span key={si} style={{ color: t.color }}>★</span>
              ))}
            </div>

            {/* Quote */}
            <p className="testimonial-quote">"{t.quote}"</p>

            {/* Author */}
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: t.color + '33', color: t.color }}>
                {t.avatar}
              </div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
