import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function CtaSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const navigate = useNavigate();

  return (
    <section className="cta-section" ref={ref} id="cta">
      {/* Background radial */}
      <div className="cta-glow" />

      <motion.div
        className="cta-inner"
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Badge */}
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.1 }}
        >
          <span className="hero-badge-dot" />
          <span>Free forever · No credit card</span>
        </motion.div>

        <h2 className="cta-heading">
          Start collaborating
          <br />
          <span className="cta-heading-em">right now.</span>
        </h2>

        <p className="cta-body">
          Invite your team, open a doc, and feel the difference.
          <br />
          SyncDraft is free for teams up to 5 — and scales with you.
        </p>

        <div className="cta-buttons">
          <motion.button
            className="btn-hero-primary btn-xl"
            onClick={() => navigate('/auth')}
            id="cta-start-collab"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Start Collaborating</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </motion.button>

          <motion.a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost btn-xl"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
            </svg>
            View on GitHub
          </motion.a>
        </div>

        {/* Trust logos row */}
        <div className="cta-trust">
          <span className="cta-trust-label">Trusted by engineers at</span>
          <div className="cta-trust-logos">
            {['Google', 'Stripe', 'Vercel', 'Linear', 'Figma'].map((name) => (
              <span key={name} className="cta-trust-logo">
                {name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
