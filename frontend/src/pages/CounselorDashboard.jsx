import { useState, useEffect } from 'react';
import { Users, ClipboardCheck, Calendar, Megaphone, Send, Home, BellRing, Check, ArrowLeft } from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';

const PICKUP_LABELS = {
  at_camp: { label: 'At Camp', class: 'pickup-at-camp', emoji: '🏕️' },
  ready: { label: 'Ready for Pickup', class: 'pickup-ready', emoji: '🎒' },
  picked_up: { label: 'Picked Up', class: 'pickup-picked-up', emoji: '✅' },
};

const avatarColors = ['#FF6B2C', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#E91E63'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

export default function CounselorDashboard({ user }) {
  const [campers, setCampers] = useState([]);
  const [cabin, setCabin] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', audience: 'camper' });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (campers.length > 0) loadAttendance();
  }, [attendanceDate, campers]);

  const loadData = async () => {
    try {
      const [campersRes, cabinRes, schedRes, annRes] = await Promise.all([
        api.get('/campers'),
        user.cabin_id ? api.get(`/cabins/${user.cabin_id}`) : Promise.resolve({ data: { cabin: null } }),
        api.get('/schedule', { params: { cabin_id: user.cabin_id } }),
        api.get('/announcements'),
      ]);
      setCampers(campersRes.data.campers);
      setCabin(cabinRes.data.cabin);
      setSchedule(schedRes.data.schedule);
      setAnnouncements(annRes.data.announcements);
    } catch (err) {
      console.error('Failed to load data');
    }
  };

  const loadAttendance = async () => {
    try {
      const res = await api.get('/attendance', { params: { cabin_id: user.cabin_id, date: attendanceDate } });
      const map = {};
      res.data.attendance.forEach((a) => {
        map[a.camper_id] = { present: !!a.present, notes: a.notes || '' };
      });
      campers.forEach((c) => {
        if (!map[c.id]) map[c.id] = { present: true, notes: '' };
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error('Failed to load attendance');
    }
  };

  const saveAttendance = async () => {
    try {
      const records = campers.map((c) => ({
        camper_id: c.id,
        date: attendanceDate,
        present: attendanceMap[c.id]?.present ?? true,
        notes: attendanceMap[c.id]?.notes || '',
      }));
      await api.post('/attendance/bulk', { records });
      alert('Attendance saved!');
    } catch (err) {
      alert('Failed to save attendance');
    }
  };

  const toggleAttendance = (camperId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [camperId]: { ...prev[camperId], present: !prev[camperId]?.present },
    }));
  };

  const updatePickupStatus = async (camperId, status) => {
    try {
      const res = await api.put(`/campers/${camperId}/pickup`, { status });
      setCampers((prev) => prev.map((c) => c.id === camperId ? { ...c, pickup_status: res.data.pickup_status } : c));
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
      setNewAnnouncement({ title: '', body: '', audience: 'camper' });
    } catch (err) {
      alert('Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const getScheduleForDay = (date) => schedule.filter((s) => s.date === date);

  return (
    <div className="dashboard">
      <div className="welcome-card" style={{ background: 'linear-gradient(135deg, #3498DB, #2980B9)' }}>
        <div className="welcome-info">
          <h2>Welcome, {user.name}! 🧭</h2>
          <p>{cabin ? `Leading ${cabin.name} Cabin — ${cabin.camper_count} campers` : 'Counselor Dashboard'}</p>
        </div>
        <div className="welcome-icon">🏔️</div>
      </div>

      {/* Cabin Overview */}
      {cabin && (
        <div className="cards-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon blue"><Home size={24} /></div>
            <div className="stat-info">
              <h3>{cabin.name}</h3>
              <p>Your Cabin</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Users size={24} /></div>
            <div className="stat-info">
              <h3>{campers.length}</h3>
              <p>Campers</p>
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Camper Roster */}
        <div className="section">
          <div className="section-header">
            <h2><Users size={22} /> Camper Roster & Pickup Status</h2>
          </div>
          <div className="card">
            {campers.length > 0 ? (
              <div className="cabin-mates">
                {campers.map((c) => {
                  const status = c.pickup_status || 'at_camp';
                  const meta = PICKUP_LABELS[status] || PICKUP_LABELS.at_camp;
                  return (
                    <div className="cabin-mate cabin-mate-row" key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <div className="avatar" style={{ background: getAvatarColor(c.name) }}>
                          {c.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="cabin-mate-info" style={{ minWidth: 0 }}>
                          <h4>{c.name}</h4>
                          <p>Age {c.age} &middot; @{c.username}</p>
                          <span className={`pickup-badge ${meta.class}`}>
                            {meta.emoji} {meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="pickup-actions">
                        {status === 'at_camp' && (
                          <button className="btn btn-primary btn-sm" onClick={() => updatePickupStatus(c.id, 'ready')} title="Notify guardian to pick up">
                            <BellRing size={14} /> Mark Ready
                          </button>
                        )}
                        {status === 'ready' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => updatePickupStatus(c.id, 'picked_up')}>
                              <Check size={14} /> Picked Up
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => updatePickupStatus(c.id, 'at_camp')} title="Undo">
                              <ArrowLeft size={14} />
                            </button>
                          </>
                        )}
                        {status === 'picked_up' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => updatePickupStatus(c.id, 'at_camp')} title="Reset to At Camp">
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
                <p>Campers will appear once assigned to your cabin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Marking */}
        <div className="section">
          <div className="section-header">
            <h2><ClipboardCheck size={22} /> Daily Attendance</h2>
          </div>
          <div className="card">
            <div className="date-picker" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
            {campers.length > 0 ? (
              <>
                <table className="attendance-list">
                  <thead>
                    <tr>
                      <th>Camper</th>
                      <th>Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campers.map((c) => (
                      <tr key={c.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.7rem', background: getAvatarColor(c.name) }}>
                            {c.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          {c.name}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            className="attendance-check"
                            checked={attendanceMap[c.id]?.present ?? true}
                            onChange={() => toggleAttendance(c.id)}
                          />
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

      {/* Activity Schedule */}
      <div className="section">
        <div className="section-header">
          <h2><Calendar size={22} /> Cabin Schedule</h2>
        </div>
        <div className="schedule-grid">
          {weekDates.map((date, i) => (
            <div className="schedule-day" key={date}>
              <div className="schedule-day-header">{dayNames[i]}</div>
              <div className="schedule-day-body">
                {getScheduleForDay(date).length > 0 ? (
                  getScheduleForDay(date).map((s) => (
                    <div className="schedule-item" key={s.id}>
                      <strong>{s.activity_name}</strong>
                      <div className="time">{s.time_slot}</div>
                      <div className="location">📍 {s.location}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                    Free day! 🌞
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post Announcement */}
      <div className="section">
        <div className="section-header">
          <h2><Send size={22} /> Post Announcement</h2>
        </div>
        <div className="card">
          <form onSubmit={postAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Title</label>
              <input
                className="form-control"
                placeholder="Announcement title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                className="form-control"
                placeholder="Write your announcement..."
                value={newAnnouncement.body}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Audience</label>
              <select
                className="form-control"
                value={newAnnouncement.audience}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, audience: e.target.value })}
              >
                <option value="camper">Campers Only</option>
                <option value="all">Everyone</option>
              </select>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" type="submit" disabled={posting}>
                <Send size={16} /> {posting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Announcements */}
      <div className="section">
        <div className="section-header">
          <h2><Megaphone size={22} /> Announcements</h2>
        </div>
        {announcements.length > 0 ? (
          announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
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
