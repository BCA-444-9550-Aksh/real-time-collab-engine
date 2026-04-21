import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Create your document',
    desc: 'Start a new doc in seconds. Choose from blank canvas, template, or import existing files.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="4" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 14H19M14 9V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    color: '#818cf8',
  },
  {
    num: '02',
    title: 'Share a link',
    desc: 'One click generates a shareable link. Send it to your team — no sign-up required for viewers.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M10 14C10 14 11 17 14 17C17 17 18 14 18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 10.5C7 10.5 8.5 7 12 7C15.5 7 17 10.5 17 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="21" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="21" cy="21" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="7" cy="14" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18.3 8.3L9.5 12.8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18.3 19.7L9.5 15.2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    color: '#34d399',
  },
  {
    num: '03',
    title: 'Collaborate live',
    desc: 'Your team joins and edits together. Watch cursors move, see changes fly in under 100ms.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="7" cy="21" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="21" cy="21" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="21" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M16.5 11.5L18.5 8.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M11.5 16.5L9.5 19.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M16.5 16.5L18.5 19.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    color: '#f472b6',
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="hiw-section" id="how-it-works" ref={ref}>
      <div className="hiw-inner">
        {/* Label */}
        <motion.div
          className="section-eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="eyebrow-line" />
          <span>How it Works</span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          className="section-heading"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
        >
          From zero to
          <br />
          <span className="heading-dim">live in 30 seconds</span>
        </motion.h2>

        {/* Steps */}
        <div className="hiw-steps">
          {STEPS.map((step, i) => (
            <div key={step.num} className="hiw-step-wrapper">
              {/* Connector line between steps */}
              {i < STEPS.length - 1 && (
                <motion.div
                  className="hiw-connector"
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.2 }}
                />
              )}

              <motion.div
                className="hiw-step"
                style={{ '--step-color': step.color } as React.CSSProperties}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                whileHover={{ y: -6 }}
              >
                {/* Animated circle */}
                <motion.div
                  className="hiw-step-circle"
                  style={{ borderColor: step.color, color: step.color }}
                  animate={inView ? { boxShadow: [`0 0 0px ${step.color}00`, `0 0 24px ${step.color}55`, `0 0 0px ${step.color}00`] } : {}}
                  transition={{ duration: 2.5, delay: 0.8 + i * 0.3, repeat: Infinity }}
                >
                  {step.icon}
                </motion.div>

                {/* Number */}
                <span className="hiw-step-num" style={{ color: step.color }}>
                  {step.num}
                </span>

                {/* Text */}
                <h3 className="hiw-step-title">{step.title}</h3>
                <p className="hiw-step-desc">{step.desc}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
