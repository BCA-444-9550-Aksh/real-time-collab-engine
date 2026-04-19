import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Undo, Redo, Heading1, Heading2, Minus,
} from 'lucide-react';

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarBtn({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 5, border: 'none', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-glow)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer', transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-overlay)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />;
}

export default function EditorToolbar({ editor }: { editor: Editor }) {
  const iconSize = 13;
  const c = editor.chain().focus();

  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center', gap: 2, padding: '0 1rem',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)', overflowX: 'auto', flexShrink: 0,
    }}>
      <ToolbarBtn onClick={() => c.undo().run()} title="Undo"><Undo size={iconSize} /></ToolbarBtn>
      <ToolbarBtn onClick={() => c.redo().run()} title="Redo"><Redo size={iconSize} /></ToolbarBtn>
      <Separator />
      <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => c.toggleHeading({ level: 1 }).run()} title="H1">
        <Heading1 size={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => c.toggleHeading({ level: 2 }).run()} title="H2">
        <Heading2 size={iconSize} />
      </ToolbarBtn>
      <Separator />
      <ToolbarBtn active={editor.isActive('bold')} onClick={() => c.toggleBold().run()} title="Bold"><Bold size={iconSize} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive('italic')} onClick={() => c.toggleItalic().run()} title="Italic"><Italic size={iconSize} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive('strike')} onClick={() => c.toggleStrike().run()} title="Strike"><Strikethrough size={iconSize} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive('code')} onClick={() => c.toggleCode().run()} title="Inline code"><Code size={iconSize} /></ToolbarBtn>
      <Separator />
      <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => c.toggleBulletList().run()} title="Bullet list"><List size={iconSize} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => c.toggleOrderedList().run()} title="Ordered list"><ListOrdered size={iconSize} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => c.toggleBlockquote().run()} title="Quote"><Quote size={iconSize} /></ToolbarBtn>
      <ToolbarBtn onClick={() => c.setHorizontalRule().run()} title="Divider"><Minus size={iconSize} /></ToolbarBtn>
    </div>
  );
}
