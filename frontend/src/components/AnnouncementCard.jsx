import { Megaphone, Trash2 } from 'lucide-react';

export default function AnnouncementCard({ announcement, canDelete, onDelete }) {
  const date = new Date(announcement.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="announcement-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3>
          <Megaphone size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
          {announcement.title}
        </h3>
        {canDelete && onDelete && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(announcement.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p>{announcement.body}</p>
      <div className="announcement-meta">
        <span>By {announcement.author_name}</span>
        <span>{date}</span>
        <span className="announcement-audience">{announcement.audience}</span>
      </div>
    </div>
  );
}
