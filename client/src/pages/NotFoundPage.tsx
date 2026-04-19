import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', textAlign: 'center', padding: '2rem',
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 80, fontWeight: 800, lineHeight: 1, color: 'var(--border)', marginBottom: 8 }}>
          404
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>Page not found</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14 }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 20px', borderRadius: 8,
          background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500,
        }}>
          <ArrowLeft size={14} /> Back to docs
        </Link>
      </motion.div>
    </div>
  );
}
