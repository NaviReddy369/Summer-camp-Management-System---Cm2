import { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, ClipboardCheck, Megaphone, MessageSquare, Heart, Save } from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

const TIME_SLOTS = [
  '7:30 AM - 8:00 AM', '8:00 AM - 8:30 AM', '8:30 AM - 9:00 AM', '9:00 AM - 9:30 AM',
  '9:30 AM - 10:00 AM', '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM', '11:00 AM - 11:30 AM',
  '11:30 AM - 12:00 PM', '12:00 PM - 12:30 PM', '12:30 PM - 1:00 PM', '1:00 PM - 1:30 PM',
  '1:30 PM - 2:00 PM', '2:00 PM - 2:30 PM', '2:30 PM - 3:00 PM', '3:00 PM - 3:30 PM',
];

function initials(name) {
  return (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function CamperDashboard({ user }) {
  const [schedule, setSchedule] = useState([]);
  const [teamMates, setTeamMates] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notes, setNotes] = useState([]);
  const [familyNote, setFamilyNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [teamColor, setTeamColor] = useState(user.team_color || '#FF6B2C');
  const [teamName, setTeamName] = useState(user.team_name || '');
  const [guardianName, setGuardianName] = useState(user.guardian_name || '');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const me = await api.get('/auth/me');
      if (me.data?.user?.team_color) setTeamColor(me.data.user.team_color);
      if (me.data?.user?.team_name) setTeamName(me.data.user.team_name);
      if (me.data?.user?.guardian_name) setGuardianName(me.data.user.guardian_name);

      const promises = [
        user.team_id ? api.get('/schedule', { params: { team_id: user.team_id } }) : Promise.resolve({ data: { schedule: [] } }),
        user.team_id ? api.get(`/campers/team/${user.team_id}`) : Promise.resolve({ data: { campers: [] } }),
        api.get('/attendance', { params: { camper_id: user.id } }),
        api.get('/announcements'),
        api.get('/notes/mine'),
        api.get(`/special-notes/camper/${user.id}`),
      ];
      const [sched, mates, att, ann, n, sn] = await Promise.all(promises);
      setSchedule(sched.data.schedule);
      setTeamMates(mates.data.campers.filter((c) => c.id !== user.id));
      setAttendance(att.data.attendance);
      setAnnouncements(ann.data.announcements);
      setNotes(n.data.notes);
      if (sn.data.notes.length > 0) setFamilyNote(sn.data.notes[0].note || '');
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  const saveFamilyNote = async (e) => {
    e.preventDefault();
    setSavingNote(true);
    try {
      const res = await api.post('/special-notes', { note: familyNote });
      setSavedAt(new Date());
      alert(res.data.message || 'Note saved — your counselor has been notified');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const toggleAck = async (a, on) => {
    try {
      if (on) await api.post(`/announcements/${a.id}/acknowledge`);
      else await api.delete(`/announcements/${a.id}/acknowledge`);
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements);
    } catch (err) {
      alert('Failed to update acknowledgement');
    }
  };

  const markRead = async (n) => {
    if (n.read_at) return;
    try {
      await api.put(`/notes/${n.id}/read`);
      const res = await api.get('/notes/mine');
      setNotes(res.data.notes);
    } catch { /* ignore */ }
  };

  const grid = useMemo(() => {
    const m = {};
    weekDates.forEach((d) => { m[d] = {}; });
    schedule.forEach((s) => {
      const slot = s.time_slot;
      if (!slot || !m[s.date]) return;
      m[s.date][slot] = s;
    });
    return m;
  }, [schedule]);

  const unreadCount = notes.filter((n) => !n.read_at).length;
  const presentCount = attendance.filter((a) => a.present).length;

  return (
    <div className="dashboard">
      <div className="welcome-card" style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}>
        <div className="welcome-info">
          <div className="avatar profile-avatar" style={{ background: 'rgba(255,255,255,0.25)' }}>
            {initials(user.name)}
          </div>
          <div>
            <h2>{user.name}</h2>
            <p>
              Family portal{teamName ? ` · ${teamName} Team` : ''}
              {user.age ? ` · Age ${user.age}` : ''}
              {guardianName ? ` · Guardian: ${guardianName}` : ''}
            </p>
          </div>
        </div>
        <div className="welcome-icon">👪</div>
      </div>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: teamColor + '22', color: teamColor }}>
            <Heart size={22} />
          </div>
          <div className="stat-info">
            <h3>{teamName || '—'}</h3>
            <p>Team</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><ClipboardCheck size={22} /></div>
          <div className="stat-info">
            <h3>{presentCount}/{attendance.length}</h3>
            <p>Days Present</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Megaphone size={22} /></div>
          <div className="stat-info">
            <h3>{announcements.length}</h3>
            <p>Announcements</p>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header"><h2><Heart size={22} /> Family Note for {user.name}</h2></div>
        <div className="card">
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Share allergies, special needs, or anything your counselor should know. Saving notifies {user.name}'s team counselor.
          </p>
          <form onSubmit={saveFamilyNote}>
            <textarea
              className="form-control"
              placeholder="Allergies, medications, comfort items, pickup instructions…"
              value={familyNote}
              onChange={(e) => setFamilyNote(e.target.value)}
              rows={5}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <div className="muted small">
                {savedAt && `Saved ${savedAt.toLocaleTimeString()}`}
              </div>
              <button className="btn btn-primary" type="submit" disabled={savingNote}>
                <Save size={16} /> {savingNote ? 'Saving…' : 'Save & Notify Counselor'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2><Calendar size={22} /> {user.name}'s Weekly Schedule</h2>
        </div>
        <div className="card" style={{ overflow: 'auto', padding: 0 }}>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Time</th>
                {dayNames.map((d, i) => <th key={d}>{d}<div className="muted small">{weekDates[i].slice(5)}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="slot-cell">{slot}</td>
                  {weekDates.map((date) => {
                    const entry = grid[date]?.[slot];
                    return (
                      <td key={date} className="schedule-cell">
                        {entry ? (
                          <div className="schedule-pill" style={{ background: teamColor + '22', borderLeft: `3px solid ${teamColor}` }}>
                            <strong>{entry.activity_name}</strong>
                            {entry.location && <div className="muted small">📍 {entry.location}</div>}
                          </div>
                        ) : <span className="empty-cell">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-header"><h2><Users size={22} /> Team Mates</h2></div>
          <div className="card">
            {teamMates.length > 0 ? (
              <div className="cabin-mates">
                {teamMates.map((mate) => (
                  <div className="cabin-mate" key={mate.id}>
                    <div className="avatar" style={{ background: teamColor }}>
                      {initials(mate.name)}
                    </div>
                    <div className="cabin-mate-info">
                      <h4>{mate.name}</h4>
                      <p>Age {mate.age}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="emoji">👥</span>
                <h3>No team mates yet</h3>
                <p>Other campers on the team will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header"><h2><ClipboardCheck size={22} /> Attendance</h2></div>
          <div className="card">
            {attendance.length > 0 ? (
              <table className="attendance-list">
                <thead><tr><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td>{new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td>
                        <span className={a.present ? 'badge-present' : 'badge-absent'}>
                          {a.present ? '✓ Present' : '✗ Absent'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <span className="emoji">📋</span>
                <h3>No attendance yet</h3>
                <p>Attendance records will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>
            <MessageSquare size={22} /> Notes from Admin
            {unreadCount > 0 && <span className="ack-pill" style={{ marginLeft: 8 }}>{unreadCount} new</span>}
          </h2>
        </div>
        {notes.length > 0 ? notes.map((n) => (
          <div className={`note-card ${!n.read_at ? 'unread' : ''}`} key={n.id} onClick={() => markRead(n)}>
            <div className="note-meta">
              From {n.from_name} · {new Date(n.created_at).toLocaleString()}
              {!n.read_at && <span className="unread-dot" />}
            </div>
            <div className="note-body">{n.note_text}</div>
          </div>
        )) : (
          <div className="empty-state">
            <span className="emoji">💌</span>
            <h3>No notes yet</h3>
            <p>Notes from camp staff will show up here.</p>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header"><h2><Megaphone size={22} /> Announcements</h2></div>
        {announcements.length > 0 ? (
          announcements.map((a) => (
            <AnnouncementCard
              key={a.id} announcement={a}
              canAcknowledge
              onToggleAcknowledge={toggleAck}
            />
          ))
        ) : (
          <div className="empty-state">
            <span className="emoji">📢</span>
            <h3>No announcements</h3>
            <p>Stay tuned — camp news is on the way!</p>
          </div>
        )}
      </div>
    </div>
  );
}
