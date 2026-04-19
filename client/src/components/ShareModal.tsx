import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader2, Trash2, Shield, Eye } from 'lucide-react';
import api from '../services/api';

interface Collaborator {
  userId: string;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
}

interface Props {
  docId: string;
  onClose: () => void;
}

export default function ShareModal({ docId, onClose }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [fetchLoaded, setFetchLoaded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch existing collaborators once the modal opens
  if (!fetchLoaded) {
    setFetchLoaded(true);
    api.get(`/docs/${docId}/collaborators`).then(({ data }) => {
      setCollaborators(data.data ?? []);
    }).catch(() => {});
  }

  const handleAdd = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/docs/${docId}/collaborators`, { email: email.trim(), role });
      setCollaborators((prev) => {
        const exists = prev.some((c) => c.email === email.trim());
        return exists ? prev : [...prev, data.data];
      });
      setEmail('');
      setSuccess(`Invited ${email.trim()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.delete(`/docs/${docId}/collaborators/${userId}`);
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    } catch { /* silent */ }
  };

  const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer') => {
    try {
      await api.patch(`/docs/${docId}/collaborators/${userId}`, { role: newRole });
      setCollaborators((prev) => prev.map((c) => c.userId === userId ? { ...c, role: newRole } : c));
    } catch { /* silent */ }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <motion.div
        key="share-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}
        onClick={onClose}
      >
        <motion.div
          key="share-modal"
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '1.75rem',
            width: 420,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
              Share document
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Invite row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Email address…"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none',
              }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              style={{
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none',
              }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={loading || !email.trim()}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: email.trim() ? 'var(--accent)' : 'var(--bg-overlay)',
                color: email.trim() ? '#fff' : 'var(--text-muted)',
                border: 'none', fontSize: 13, display: 'flex',
                alignItems: 'center', gap: 5, cursor: email.trim() ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={13} />}
              Invite
            </button>
          </div>

          {/* Feedback */}
          {error && <p style={{ fontSize: 12, color: 'var(--error)' }}>{error}</p>}
          {success && <p style={{ fontSize: 12, color: 'var(--success)' }}>{success}</p>}

          {/* Collaborator list */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collaborators.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No collaborators yet
              </p>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--accent-dim)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {c.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email}
                    </p>
                  </div>
                  <select
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.userId, e.target.value as 'editor' | 'viewer')}
                    style={{
                      padding: '4px 6px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'var(--bg-overlay)',
                      color: 'var(--text-secondary)', fontSize: 11, outline: 'none',
                    }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => handleRemove(c.userId)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', padding: 4, borderRadius: 5,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', paddingTop: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={11} /> Editor — full read/write
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye size={11} /> Viewer — read-only
            </span>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
