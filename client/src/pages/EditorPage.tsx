import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft, Users, Wifi, WifiOff, MessageSquare, Save,
  Share2, Trash2, Pencil, Check, X,
} from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useCollaborationStore } from '../store/collaborationStore';
import { useSocketRoom } from '../hooks/useSocketRoom';
import { useChatStore } from '../store/chatStore';
import EditorToolbar from '../components/EditorToolbar';
import PresenceStrip from '../components/PresenceStrip';
import ChatSidebar from '../components/ChatSidebar';
import ShareModal from '../components/ShareModal';
import { AnimatePresence } from 'framer-motion';

const DEBOUNCE_MS = 40;

export default function EditorPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  const { activeDoc, content, setContent, isSyncing, hasUnsavedChanges, isLoadingDoc, fetchDocument, deleteDocument, updateDocTitle } = useDocumentStore();
  const { connected, activeUsers } = useCollaborationStore();
  const { isOpen: chatOpen, toggleChat, fetchMessages } = useChatStore();

  const { sendEdit, sendCursor, sendChat } = useSocketRoom(docId!);

  // ─── Local UI state ───────────────────────────────────────────
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Suppress remote update → local loop
  const isRemoteUpdateRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load document if navigated directly (page refresh) ───────
  useEffect(() => {
    if (docId && !activeDoc) {
      fetchDocument(docId);
    }
  }, [docId]);

  // Update title draft after doc loads
  useEffect(() => {
    if (activeDoc) setTitleDraft(activeDoc.title);
  }, [activeDoc?._id]);

  // ─── TipTap editor ────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: content || '<p></p>',
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
    onUpdate: ({ editor }) => {
      if (isRemoteUpdateRef.current) return;

      const html = editor.getHTML();
      setContent(html);

      // Debounced send to server
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { content: c, version } = useDocumentStore.getState();
        sendEdit({ type: 'replace', text: c, pos: 0 }, version, c);
      }, DEBOUNCE_MS);
    },
    onSelectionUpdate: ({ editor }) => {
      // Broadcast pure cursor shifts when text isn't manipulated
      const pos = editor.state.selection.anchor;
      sendCursor(pos);
    },
  });

  // Apply remote content updates
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (content && content !== currentHTML) {
      isRemoteUpdateRef.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false });
      editor.commands.setTextSelection({
        from: Math.min(from, editor.state.doc.content.size),
        to: Math.min(to, editor.state.doc.content.size),
      });
      isRemoteUpdateRef.current = false;
    }
  }, [content]);

  // Load chat history
  useEffect(() => {
    if (docId) fetchMessages(docId, true);
  }, [docId]);

  // ─── Inline title save ────────────────────────────────────────
  const saveTitle = useCallback(async () => {
    if (!activeDoc || !titleDraft.trim()) { setEditingTitle(false); return; }
    if (titleDraft.trim() === activeDoc.title) { setEditingTitle(false); return; }
    try {
      await import('../services/api').then(({ default: api }) =>
        api.patch(`/docs/${activeDoc._id}`, { title: titleDraft.trim() })
      );
      updateDocTitle(activeDoc._id, titleDraft.trim());
    } catch { /* silent */ }
    setEditingTitle(false);
  }, [activeDoc, titleDraft]);

  // ─── Delete document ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!activeDoc) return;
    await deleteDocument(activeDoc._id);
    navigate('/');
  };

  // ─── Loading state ────────────────────────────────────────────
  if (isLoadingDoc || (!activeDoc && !isLoadingDoc)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        {isLoadingDoc ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading document…</span>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>Document not found</p>
            <button onClick={() => navigate('/')} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13 }}>
              Back to docs
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Remote Cursors Overlay ───────────────────────────────────
  const renderCursors = () => {
    if (!editor || !editor.view) return null;
    return activeUsers.map(u => {
      if (!u.cursor || typeof u.cursor.pos !== 'number') return null;
      try {
        const docSize = editor.state.doc.content.size;
        // TipTap positions are robust, clamp to document size to prevent out-of-bounds crashes
        const safePos = Math.min(Math.max(0, u.cursor.pos), docSize);
        const coords = editor.view.coordsAtPos(safePos);
        const editorPos = editor.view.dom.getBoundingClientRect();

        return (
          <div
            key={u.userId}
            style={{
              position: 'absolute',
              top: coords.top - editorPos.top + 48, // 48 is roughly the padding offset
              left: coords.left - editorPos.left + 32, // 32 is roughly 2rem padding
              height: coords.bottom - coords.top || 20, // default line height if collapsed
              width: 2,
              backgroundColor: u.color || 'var(--accent)',
              zIndex: 50,
              pointerEvents: 'none',
              transition: 'all 0.1s ease',
            }}
          >
            <div style={{
              position: 'absolute', top: -16, left: 0,
              backgroundColor: u.color || 'var(--accent)',
              color: '#fff', fontSize: 10, padding: '2px 4px',
              borderRadius: '4px 4px 4px 0', whiteSpace: 'nowrap',
              fontWeight: 600,
            }}>
              {u.name}
            </div>
          </div>
        );
      } catch (e) {
        return null;
      }
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* ─── Top chrome ─────────────────────────────────────────── */}
      <header style={{
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 1rem', gap: 10, flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
        >
          <ArrowLeft size={14} /> Docs
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

        {/* Inline title edit */}
        {editingTitle ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setTitleDraft(activeDoc!.title); setEditingTitle(false); }
              }}
              style={{
                flex: 1, minWidth: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
                borderRadius: 6, padding: '3px 8px',
                color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none',
              }}
            />
            <button onClick={saveTitle} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <Check size={15} />
            </button>
            <button onClick={() => { setTitleDraft(activeDoc!.title); setEditingTitle(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
            style={{
              flex: 1, minWidth: 0, background: 'none', border: 'none',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'text',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
              {activeDoc.title}
            </span>
            <Pencil size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }} />
          </button>
        )}

        {/* Right-side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasUnsavedChanges && isSyncing && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save size={11} /> Saving…
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: connected ? 'var(--success)' : 'var(--error)' }}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Live' : 'Offline'}
          </div>

          <PresenceStrip users={activeUsers} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Users size={13} /> {activeUsers.length + 1}
          </div>

          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 7,
              background: 'var(--accent-glow)', border: '1px solid var(--border)',
              color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <Share2 size={12} /> Share
          </button>

          {/* Chat */}
          <button
            onClick={toggleChat}
            style={{
              background: chatOpen ? 'var(--accent-glow)' : 'none',
              border: `1px solid ${chatOpen ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 7, padding: '4px 10px',
              color: chatOpen ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer',
            }}
          >
            <MessageSquare size={13} /> Chat
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--error)' }}>Delete?</span>
              <button onClick={handleDelete} style={{ background: 'var(--error)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                Yes
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete document"
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 7, padding: '4px 8px',
                color: 'var(--text-muted)', display: 'flex',
                alignItems: 'center', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </header>

      {/* ─── Toolbar ────────────────────────────────────────────── */}
      {editor && <EditorToolbar editor={editor} />}

      {/* ─── Main layout ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '3rem 0' }}>
          <div style={{
            position: 'relative',
            maxWidth: 720, margin: '0 auto', padding: '0 2rem',
            minHeight: 'calc(100vh - 160px)',
          }}>
            <EditorContent editor={editor} style={{ minHeight: '100%' }} />
            {renderCursors()}
          </div>
        </div>

        {/* Chat sidebar */}
      {chatOpen && <ChatSidebar docId={docId!} onSend={sendChat} />}
    </div>

    {/* Share modal */}
    <AnimatePresence>
      {showShare && <ShareModal docId={docId!} onClose={() => setShowShare(false)} />}
    </AnimatePresence>

    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);
}
