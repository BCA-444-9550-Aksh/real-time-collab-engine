import type { ActiveUser } from '../store/collaborationStore';

export default function PresenceStrip({ users }: { users: ActiveUser[] }) {
  if (users.length === 0) return null;

  const shown = users.slice(0, 5);
  const overflow = users.length - 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <div
          key={u.userId}
          title={u.name}
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: u.color,
            border: '2px solid var(--bg-surface)',
            marginLeft: i === 0 ? 0 : -8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
            zIndex: shown.length - i,
            position: 'relative',
          }}
        >
          {u.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg-overlay)', border: '2px solid var(--bg-surface)',
          marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
        }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
