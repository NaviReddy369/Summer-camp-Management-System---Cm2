import { useState, useEffect } from 'react';
import { Calendar, Users, ClipboardCheck, Megaphone } from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';

const avatarColors = ['#FF6B2C', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#E91E63'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

export default function CamperDashboard({ user }) {
  const [schedule, setSchedule] = useState([]);
  const [cabinMates, setCabinMates] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedRes, matesRes, attRes, annRes] = await Promise.all([
        api.get('/schedule', { params: { cabin_id: user.cabin_id } }),
        api.get(`/campers/cabin/${user.cabin_id}`),
        api.get('/attendance', { params: { camper_id: user.id } }),
        api.get('/announcements'),
      ]);
      setSchedule(schedRes.data.schedule);
      setCabinMates(matesRes.data.campers.filter((c) => c.id !== user.id));
      setAttendance(attRes.data.attendance);
      setAnnouncements(annRes.data.announcements);
    } catch (err) {
      console.error('Failed to load dashboard data');
    }
  };

  const getScheduleForDay = (date) => schedule.filter((s) => s.date === date);

  return (
    <div className="dashboard">
      <div className="welcome-card">
        <div className="welcome-info">
          <h2>Hey, {user.name}! 👋</h2>
          <p>Welcome to {user.cabin_name || 'your'} cabin — let's make today awesome!</p>
        </div>
        <div className="welcome-icon">🏕️</div>
      </div>

      {/* Weekly Schedule */}
      <div className="section">
        <div className="section-header">
          <h2><Calendar size={22} /> My Weekly Schedule</h2>
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

      <div className="two-col">
        {/* Cabin Mates */}
        <div className="section">
          <div className="section-header">
            <h2><Users size={22} /> My Cabin Mates</h2>
          </div>
          <div className="card">
            {cabinMates.length > 0 ? (
              <div className="cabin-mates">
                {cabinMates.map((mate) => (
                  <div className="cabin-mate" key={mate.id}>
                    <div
                      className="avatar"
                      style={{ background: getAvatarColor(mate.name) }}
                    >
                      {mate.name.split(' ').map((n) => n[0]).join('')}
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
                <h3>No cabin mates yet</h3>
                <p>Your cabin friends will show up soon!</p>
              </div>
            )}
          </div>
        </div>

        {/* My Attendance */}
        <div className="section">
          <div className="section-header">
            <h2><ClipboardCheck size={22} /> My Attendance</h2>
          </div>
          <div className="card">
            {attendance.length > 0 ? (
              <table className="attendance-list">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
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
                <p>Your attendance record will appear here!</p>
              </div>
            )}
          </div>
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
            <h3>No announcements</h3>
            <p>Stay tuned — camp news is on the way!</p>
          </div>
        )}
      </div>
    </div>
  );
}
