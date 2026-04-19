import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  docId: string;
  onSend: (text: string) => void;
}

export default function ChatSidebar({ docId, onSend }: Props) {
  const { messages, isLoading, hasMore, fetchMessages, toggleChat } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !isLoading) {
      fetchMessages(docId);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: 300, flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Chat</span>
        <button onClick={toggleChat} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
          <X size={15} />
        </button>
      </div>

      {/* Messages */}
      <div
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <Loader2 size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        <div ref={topRef} />
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isOwn = msg.userId === user?.id;
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}
              >
                {!isOwn && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{msg.userName}</span>
                )}
                <div style={{
                  maxWidth: '80%', padding: '7px 11px', borderRadius: 10,
                  background: isOwn ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: isOwn ? '#fff' : 'var(--text-primary)',
                  fontSize: 13, lineHeight: 1.5,
                  borderBottomRightRadius: isOwn ? 2 : 10,
                  borderBottomLeftRadius: isOwn ? 10 : 2,
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  {formatTime(msg.createdAt)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Message…"
          rows={1}
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
            color: 'var(--text-primary)', fontSize: 13,
            resize: 'none', outline: 'none', lineHeight: 1.5,
            maxHeight: 100, overflow: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: text.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
            color: text.trim() ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
          }}
        >
          <Send size={13} />
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
