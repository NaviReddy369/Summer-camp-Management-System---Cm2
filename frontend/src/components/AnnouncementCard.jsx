import { Megaphone, Trash2, CheckCircle2, Circle } from 'lucide-react';

const AUDIENCE_LABELS = {
  all: 'Everyone',
  campers: 'Campers',
  counselors: 'Counselors',
  specific_camper: 'Camper',
  specific_counselor: 'Counselor',
};

export default function AnnouncementCard({
  announcement,
  canDelete,
  onDelete,
  canAcknowledge,
  onToggleAcknowledge,
  onClick,
}) {
  const date = new Date(announcement.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const acknowledged = !!(announcement.acknowledged || announcement.acknowledged_at);

  return (
    <div
      className={`announcement-card ${acknowledged ? 'ack-on' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h3>
          <Megaphone size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
          {announcement.title}
        </h3>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
          {canAcknowledge && (
            <button
              type="button"
              className={`ack-btn ${acknowledged ? 'ack-btn-on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleAcknowledge && onToggleAcknowledge(announcement, !acknowledged);
              }}
              title={acknowledged ? 'Acknowledged — click to undo' : 'Acknowledge'}
            >
              {acknowledged ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {acknowledged ? 'Acknowledged' : 'Acknowledge'}
            </button>
          )}
          {canDelete && onDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(announcement.id); }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p>{announcement.body}</p>
      <div className="announcement-meta">
        <span>By {announcement.author_name}</span>
        <span>{date}</span>
        <span className="announcement-audience">
          {AUDIENCE_LABELS[announcement.audience] || announcement.audience}
          {announcement.target_user_name ? `: ${announcement.target_user_name}` : ''}
        </span>
      </div>
    </div>
  );
}
