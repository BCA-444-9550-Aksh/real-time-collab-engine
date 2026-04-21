import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Performance', href: '#performance' },
    { label: 'GitHub', href: 'https://github.com', external: true },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`nav-root ${scrolled ? 'nav-scrolled' : ''}`}
    >
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-glyph">⬡</span>
          <span className="nav-logo-text">SyncDraft</span>
        </Link>

        {/* Desktop Links */}
        <nav className="nav-links-desktop">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                {link.label}
              </a>
            ) : (
              <a key={link.label} href={link.href} className="nav-link">
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* CTA Buttons */}
        <div className="nav-cta-group">
          <button className="btn-ghost" onClick={() => navigate('/auth')}>
            Log in
          </button>
          <button className="btn-primary" onClick={() => navigate('/auth')}>
            Start Free
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${mobileOpen ? 'open-top' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'open-mid' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'open-bot' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="nav-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="nav-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}
            <div className="nav-mobile-ctas">
              <button className="btn-ghost w-full" onClick={() => navigate('/auth')}>
                Log in
              </button>
              <button className="btn-primary w-full" onClick={() => navigate('/auth')}>
                Start Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
