import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FilePlus, LogOut, FileText, Clock, Users, Search, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore, type Document } from '../store/documentStore';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { documents, fetchDocuments, createDocument, openDocument, deleteDocument } = useDocumentStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchDocuments(); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const doc = await createDocument(newTitle.trim());
      setNewTitle(''); setCreating(false);
      if (doc && doc._id) {
        openDocument(doc);
        navigate(`/editor/${doc._id}`);
      }
    } catch (err) {
      setCreating(false);
    }
  };

  const handleOpen = (doc: Document) => {
    openDocument(doc);
    navigate(`/editor/${doc._id}`);
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (deletingId === docId) {
      await deleteDocument(docId);
      setDeletingId(null);
    } else {
      setDeletingId(docId);
    }
  };

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        height: 56, borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', padding: '0 1.5rem',
        gap: 12, background: 'var(--bg-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12M2 7h8M2 11h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>CollabDocs</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{
              padding: '6px 10px 6px 30px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg-elevated)',
              color: 'var(--text-primary)', fontSize: 13, width: 220, outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => setCreating(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 500,
          }}
        >
          <FilePlus size={13} /> New
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Create modal */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            }}
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '1.75rem', width: 380,
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 16 }}>New document</h2>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Document title…"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none', marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleCreate} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document grid */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>My documents</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{documents.length} total</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>{search ? 'No documents match your search' : 'No documents yet — create one!'}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}>
            <AnimatePresence>
              {filtered.map((doc, i) => (
                <motion.div
                  key={doc._id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <DocCard
                    doc={doc}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    isConfirming={deletingId === doc._id}
                    onCancelDelete={(e) => { e.stopPropagation(); setDeletingId(null); }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function DocCard({
  doc, onOpen, onDelete, isConfirming, onCancelDelete,
}: {
  doc: Document;
  onOpen: (d: Document) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  isConfirming: boolean;
  onCancelDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const timeAgo = (iso: string) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(doc)}
      style={{
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${isConfirming ? 'var(--error)' : hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, padding: '1.25rem',
        cursor: 'pointer', transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--accent-glow)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <FileText size={17} color="var(--accent)" />
      </div>
      <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {doc.title}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {timeAgo(doc.updatedAt)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} /> v{doc.currentVersion}
          </span>
        </div>

        {/* Delete area */}
        {isConfirming ? (
          <div style={{ display: 'flex', gap: 5 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => onDelete(e, doc._id)}
              style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--error)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}
            >
              Delete
            </button>
            <button
              onClick={onCancelDelete}
              style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          hovered && (
            <button
              onClick={(e) => onDelete(e, doc._id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Trash2 size={13} />
            </button>
          )
        )}
      </div>
    </div>
  );
}
