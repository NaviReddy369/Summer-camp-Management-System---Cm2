import { useState, useEffect, useMemo } from 'react';
import {
  Users, ClipboardCheck, Calendar, Megaphone, Send, Home, BellRing, Check, ArrowLeft,
  Heart, MessageSquare, Clock,
} from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';

const PICKUP_LABELS = {
  at_camp: { label: 'At Camp', class: 'pickup-at-camp', emoji: '🏕️' },
  ready: { label: 'Ready for Pickup', class: 'pickup-ready', emoji: '🎒' },
  picked_up: { label: 'Picked Up', class: 'pickup-picked-up', emoji: '✅' },
};

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

export default function CounselorDashboard({ user }) {
  const [campers, setCampers] = useState([]);
  const [team, setTeam] = useState(null);
  const [teamSchedule, setTeamSchedule] = useState([]);
  const [mySchedule, setMySchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [familyNotesByCamper, setFamilyNotesByCamper] = useState({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', audience: 'campers' });
  const [posting, setPosting] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (campers.length > 0) loadAttendance(); }, [attendanceDate, campers]);

  const loadData = async () => {
    try {
      const promises = [
        api.get('/campers'),
        user.team_id ? api.get(`/teams/${user.team_id}`) : Promise.resolve({ data: { team: null } }),
        user.team_id ? api.get('/schedule', { params: { team_id: user.team_id } }) : Promise.resolve({ data: { schedule: [] } }),
        api.get('/counselor-schedule'),
        api.get('/announcements'),
        api.get('/notes/mine'),
      ];
      const [c, t, ts, ms, an, n] = await Promise.all(promises);
      setCampers(c.data.campers);
      setTeam(t.data.team);
      setTeamSchedule(ts.data.schedule);
      setMySchedule(ms.data.schedule);
      setAnnouncements(an.data.announcements);
      setAdminNotes(n.data.notes);

      // Load family special notes for each camper
      const familyMap = {};
      await Promise.all(
        c.data.campers.map(async (camper) => {
          try {
            const res = await api.get(`/special-notes/camper/${camper.id}`);
            if (res.data.notes.length > 0) familyMap[camper.id] = res.data.notes;
          } catch { /* ignore */ }
        })
      );
      setFamilyNotesByCamper(familyMap);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const loadAttendance = async () => {
    try {
      const res = await api.get('/attendance', { params: { team_id: user.team_id, date: attendanceDate } });
      const map = {};
      res.data.attendance.forEach((a) => {
        map[a.camper_id] = { present: !!a.present, notes: a.notes || '' };
      });
      campers.forEach((c) => { if (!map[c.id]) map[c.id] = { present: true, notes: '' }; });
      setAttendanceMap(map);
    } catch { /* ignore */ }
  };

  const saveAttendance = async () => {
    try {
      const records = campers.map((c) => ({
        camper_id: c.id, date: attendanceDate,
        present: attendanceMap[c.id]?.present ?? true,
        notes: attendanceMap[c.id]?.notes || '',
      }));
      await api.post('/attendance/bulk', { records });
      alert('Attendance saved!');
    } catch { alert('Failed to save attendance'); }
  };

  const toggleAttendance = (id) => {
    setAttendanceMap((prev) => ({ ...prev, [id]: { ...prev[id], present: !prev[id]?.present } }));
  };

  const updatePickupStatus = async (id, status) => {
    try {
      const res = await api.put(`/campers/${id}/pickup`, { status });
      setCampers((prev) => prev.map((c) => c.id === id ? { ...c, pickup_status: res.data.pickup_status } : c));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update pickup status');
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.body) return;
    setPosting(true);
    try {
      const res = await api.post('/announcements', newAnnouncement);
      setAnnouncements([res.data.announcement, ...announcements]);
      setNewAnnouncement({ title: '', body: '', audience: 'campers' });
    } catch { alert('Failed to post announcement'); }
    finally { setPosting(false); }
  };

  const toggleAck = async (a, on) => {
    try {
      if (on) await api.post(`/announcements/${a.id}/acknowledge`);
      else await api.delete(`/announcements/${a.id}/acknowledge`);
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements);
    } catch { alert('Failed to update acknowledgement'); }
  };

  const markRead = async (n) => {
    if (n.read_at) return;
    try {
      await api.put(`/notes/${n.id}/read`);
      const res = await api.get('/notes/mine');
      setAdminNotes(res.data.notes);
    } catch { /* ignore */ }
  };

  const myGrid = useMemo(() => {
    const m = {};
    weekDates.forEach((d) => { m[d] = {}; });
    mySchedule.forEach((s) => {
      if (m[s.date]) m[s.date][s.time_slot] = s;
    });
    return m;
  }, [mySchedule]);

  const teamColor = team?.team_color || user.team_color || '#3498DB';
  const unread = adminNotes.filter((n) => !n.read_at).length;

  return (
    <div className="dashboard">
      <div className="welcome-card" style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}>
        <div className="welcome-info">
          <div className="avatar profile-avatar" style={{ background: 'rgba(255,255,255,0.25)' }}>
            {initials(user.name)}
          </div>
          <div>
            <h2>Welcome, {user.name}! 🧭</h2>
            <p>{team ? `Leading ${team.name} Team — ${team.camper_count} campers` : 'Counselor Dashboard'}</p>
          </div>
        </div>
        <div className="welcome-icon">🏔️</div>
      </div>

      {team && (
        <div className="cards-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: teamColor + '22', color: teamColor }}><Home size={24} /></div>
            <div className="stat-info"><h3>{team.name}</h3><p>Your Team</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Users size={24} /></div>
            <div className="stat-info"><h3>{campers.length}</h3><p>Campers</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><MessageSquare size={24} /></div>
            <div className="stat-info"><h3>{unread}</h3><p>Unread Notes</p></div>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="section">
          <div className="section-header"><h2><Users size={22} /> Camper Roster & Pickup Status</h2></div>
          <div className="card">
            {campers.length > 0 ? (
              <div className="cabin-mates">
                {campers.map((c) => {
                  const status = c.pickup_status || 'at_camp';
                  const meta = PICKUP_LABELS[status] || PICKUP_LABELS.at_camp;
                  const fNotes = familyNotesByCamper[c.id];
                  const noteUpdated = fNotes?.[0]?.updated_at;
                  const isRecent = noteUpdated && (Date.now() - new Date(noteUpdated).getTime() < 7 * 24 * 60 * 60 * 1000);
                  return (
                    <div className="cabin-mate cabin-mate-row" key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <div className="avatar" style={{ background: teamColor }}>{initials(c.name)}</div>
                        <div className="cabin-mate-info" style={{ minWidth: 0 }}>
                          <h4>{c.name}</h4>
                          <p>Age {c.age} · @{c.username}</p>
                          <span className={`pickup-badge ${meta.class}`}>{meta.emoji} {meta.label}</span>
                          {fNotes && fNotes.length > 0 && (
                            <div className={`parent-note-inline ${isRecent ? 'note-recent' : ''}`}>
                              <Heart size={11} />
                              {isRecent && <span className="ack-pill" style={{ marginRight: 4 }}>Updated</span>}
                              <strong>Family note{fNotes[0].guardian_name ? ` from ${fNotes[0].guardian_name}` : ''}:</strong> {fNotes[0].note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pickup-actions">
                        {status === 'at_camp' && (
                          <button className="btn btn-primary btn-sm" onClick={() => updatePickupStatus(c.id, 'ready')}>
                            <BellRing size={14} /> Mark Ready
                          </button>
                        )}
                        {status === 'ready' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => updatePickupStatus(c.id, 'picked_up')}>
                              <Check size={14} /> Picked Up
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => updatePickupStatus(c.id, 'at_camp')}>
                              <ArrowLeft size={14} />
                            </button>
                          </>
                        )}
                        {status === 'picked_up' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => updatePickupStatus(c.id, 'at_camp')}>
                            <ArrowLeft size={14} /> Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span className="emoji">👥</span>
                <h3>No campers assigned</h3>
                <p>Campers will appear once assigned to your team.</p>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header"><h2><ClipboardCheck size={22} /> Daily Attendance</h2></div>
          <div className="card">
            <div className="date-picker" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Date:</label>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            {campers.length > 0 ? (
              <>
                <table className="attendance-list">
                  <thead><tr><th>Camper</th><th>Present</th></tr></thead>
                  <tbody>
                    {campers.map((c) => (
                      <tr key={c.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.7rem', background: teamColor }}>
                            {initials(c.name)}
                          </div>
                          {c.name}
                        </td>
                        <td>
                          <input type="checkbox" className="attendance-check"
                            checked={attendanceMap[c.id]?.present ?? true}
                            onChange={() => toggleAttendance(c.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-secondary" onClick={saveAttendance}>
                    <ClipboardCheck size={16} /> Save Attendance
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="emoji">📋</span>
                <h3>No campers to mark</h3>
                <p>Attendance will be available once campers are assigned.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Schedule */}
      <div className="section">
        <div className="section-header"><h2><Clock size={22} /> My Weekly Schedule</h2></div>
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
                    const entry = myGrid[date]?.[slot];
                    return (
                      <td key={date} className="schedule-cell">
                        {entry ? (
                          <div className="schedule-pill" style={{ background: 'rgba(29,78,216,0.08)', borderLeft: '3px solid var(--primary)' }}>
                            <strong>{entry.duty}</strong>
                            {entry.notes && <div className="muted small">{entry.notes}</div>}
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

      {/* Notes from Admin */}
      <div className="section">
        <div className="section-header">
          <h2>
            <MessageSquare size={22} /> Notes from Admin
            {unread > 0 && <span className="ack-pill" style={{ marginLeft: 8 }}>{unread} new</span>}
          </h2>
        </div>
        {adminNotes.length > 0 ? adminNotes.map((n) => (
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
            <p>Notes from the admin will show up here.</p>
          </div>
        )}
      </div>

      {/* Post Announcement */}
      <div className="section">
        <div className="section-header"><h2><Send size={22} /> Post Announcement</h2></div>
        <div className="card">
          <form onSubmit={postAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea className="form-control" value={newAnnouncement.body}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Audience</label>
              <select className="form-control" value={newAnnouncement.audience}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, audience: e.target.value })}>
                <option value="campers">Campers Only</option>
                <option value="all">Everyone</option>
              </select>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" type="submit" disabled={posting}>
                <Send size={16} /> {posting ? 'Posting…' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
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
            <h3>No announcements yet</h3>
            <p>Post the first announcement above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
