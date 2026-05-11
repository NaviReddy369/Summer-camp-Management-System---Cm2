import { useState, useEffect } from 'react';
import {
  Users, Home, Activity, Calendar, Megaphone, Plus, Trash2, Edit3, X, Send,
  BarChart3, UserPlus, ClipboardList
} from 'lucide-react';
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

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ campers: 0, counselors: 0, cabins: 0, activities: 0 });
  const [campers, setCampers] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [showCamperModal, setShowCamperModal] = useState(false);
  const [editingCamper, setEditingCamper] = useState(null);
  const [camperForm, setCamperForm] = useState({ name: '', username: '', password: '', cabin_id: '', age: '' });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ cabin_id: '', activity_id: '', date: '' });

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', audience: 'all' });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [statsRes, campersRes, cabinsRes, activitiesRes, schedRes, annRes] = await Promise.all([
        api.get('/stats'),
        api.get('/campers'),
        api.get('/cabins'),
        api.get('/activities'),
        api.get('/schedule'),
        api.get('/announcements'),
      ]);
      setStats(statsRes.data);
      setCampers(campersRes.data.campers);
      setCabins(cabinsRes.data.cabins);
      setActivities(activitiesRes.data.activities);
      setSchedule(schedRes.data.schedule);
      setAnnouncements(annRes.data.announcements);
    } catch (err) {
      console.error('Failed to load admin data');
    }
  };

  // Camper CRUD
  const openAddCamper = () => {
    setEditingCamper(null);
    setCamperForm({ name: '', username: '', password: '', cabin_id: '', age: '' });
    setShowCamperModal(true);
  };
  const openEditCamper = (c) => {
    setEditingCamper(c);
    setCamperForm({ name: c.name, username: c.username, password: '', cabin_id: c.cabin_id || '', age: c.age || '' });
    setShowCamperModal(true);
  };
  const saveCamper = async (e) => {
    e.preventDefault();
    try {
      if (editingCamper) {
        await api.put(`/campers/${editingCamper.id}`, {
          name: camperForm.name,
          cabin_id: camperForm.cabin_id || null,
          age: camperForm.age || null,
        });
      } else {
        await api.post('/campers', camperForm);
      }
      setShowCamperModal(false);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save camper');
    }
  };
  const deleteCamper = async (id) => {
    if (!confirm('Remove this camper?')) return;
    try {
      await api.delete(`/campers/${id}`);
      loadAllData();
    } catch (err) {
      alert('Failed to delete camper');
    }
  };

  // Schedule
  const addScheduleEntry = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedule', scheduleForm);
      setShowScheduleModal(false);
      setScheduleForm({ cabin_id: '', activity_id: '', date: '' });
      loadAllData();
    } catch (err) {
      alert('Failed to add schedule entry');
    }
  };
  const deleteScheduleEntry = async (id) => {
    try {
      await api.delete(`/schedule/${id}`);
      loadAllData();
    } catch (err) {
      alert('Failed to delete schedule entry');
    }
  };

  // Announcements
  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.body) return;
    setPosting(true);
    try {
      await api.post('/announcements', newAnnouncement);
      setNewAnnouncement({ title: '', body: '', audience: 'all' });
      loadAllData();
    } catch (err) {
      alert('Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };
  const deleteAnnouncement = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      loadAllData();
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  const getScheduleForDay = (date) => schedule.filter((s) => s.date === date);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'campers', label: 'Campers', icon: <Users size={16} /> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar size={16} /> },
    { key: 'announcements', label: 'Announcements', icon: <Megaphone size={16} /> },
  ];

  return (
    <div className="dashboard">
      <div className="welcome-card" style={{ background: 'linear-gradient(135deg, var(--primary), #E55A1B)' }}>
        <div className="welcome-info">
          <h2>Admin Dashboard ⭐</h2>
          <p>Full control — manage campers, cabins, schedules, and more.</p>
        </div>
        <div className="welcome-icon">🛡️</div>
      </div>

      {/* Tab Navigation */}
      <div className="login-tabs" style={{ marginBottom: '2rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--white)', boxShadow: 'var(--shadow-sm)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`login-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          <div className="cards-grid">
            <div className="stat-card">
              <div className="stat-icon orange"><Users size={24} /></div>
              <div className="stat-info">
                <h3>{stats.campers}</h3>
                <p>Campers</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><UserPlus size={24} /></div>
              <div className="stat-info">
                <h3>{stats.counselors}</h3>
                <p>Counselors</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Home size={24} /></div>
              <div className="stat-info">
                <h3>{stats.cabins}</h3>
                <p>Cabins</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><Activity size={24} /></div>
              <div className="stat-info">
                <h3>{stats.activities}</h3>
                <p>Activities</p>
              </div>
            </div>
          </div>

          <div className="two-col">
            <div className="section">
              <div className="section-header">
                <h2><Home size={22} /> Cabins</h2>
              </div>
              {cabins.map((c) => (
                <div className="card" key={c.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="avatar" style={{ background: c.theme_color, width: 48, height: 48, fontSize: '1.1rem' }}>
                      {c.name[0]}
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>{c.name} Cabin</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                        Counselor: {c.counselor_name || 'Unassigned'} &middot; {c.camper_count} campers
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="section">
              <div className="section-header">
                <h2><Megaphone size={22} /> Recent Announcements</h2>
              </div>
              {announcements.slice(0, 3).map((a) => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* CAMPERS */}
      {activeTab === 'campers' && (
        <div className="section">
          <div className="section-header">
            <h2><Users size={22} /> Camper Management</h2>
            <button className="btn btn-primary" onClick={openAddCamper}>
              <Plus size={16} /> Add Camper
            </button>
          </div>
          <div className="card" style={{ overflow: 'auto' }}>
            {campers.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Age</th>
                    <th>Cabin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem', background: getAvatarColor(c.name) }}>
                          {c.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        {c.name}
                      </td>
                      <td>@{c.username}</td>
                      <td>{c.age || '—'}</td>
                      <td>{c.cabin_name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditCamper(c)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteCamper(c.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <span className="emoji">🏕️</span>
                <h3>No campers yet</h3>
                <p>No activities yet — the fun is coming! 🏕️</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="section">
          <div className="section-header">
            <h2><Calendar size={22} /> Weekly Schedule Builder</h2>
            <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
              <Plus size={16} /> Add Entry
            </button>
          </div>
          <div className="schedule-grid">
            {weekDates.map((date, i) => (
              <div className="schedule-day" key={date}>
                <div className="schedule-day-header">{dayNames[i]}</div>
                <div className="schedule-day-body">
                  {getScheduleForDay(date).length > 0 ? (
                    getScheduleForDay(date).map((s) => (
                      <div className="schedule-item" key={s.id} style={{ position: 'relative' }}>
                        <strong>{s.activity_name}</strong>
                        <div className="time">{s.time_slot}</div>
                        <div className="location">📍 {s.location}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--info)', fontWeight: 700, marginTop: 2 }}>
                          {s.cabin_name}
                        </div>
                        <button
                          onClick={() => deleteScheduleEntry(s.id)}
                          style={{
                            position: 'absolute', top: 4, right: 4, background: 'none', border: 'none',
                            color: 'var(--gray-300)', cursor: 'pointer', padding: 2
                          }}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                      No activities
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Activities List */}
          <div style={{ marginTop: '2rem' }}>
            <div className="section-header">
              <h2><ClipboardList size={22} /> All Activities</h2>
            </div>
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>Day</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.location}</td>
                      <td>{a.time_slot}</td>
                      <td>{a.day_of_week}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <>
          <div className="section">
            <div className="section-header">
              <h2><Send size={22} /> Post Announcement</h2>
            </div>
            <div className="card">
              <form onSubmit={postAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-row">
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
                  <div className="form-group" style={{ maxWidth: 200 }}>
                    <label>Audience</label>
                    <select
                      className="form-control"
                      value={newAnnouncement.audience}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, audience: e.target.value })}
                    >
                      <option value="all">Everyone</option>
                      <option value="camper">Campers Only</option>
                      <option value="counselor">Counselors Only</option>
                    </select>
                  </div>
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
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary" type="submit" disabled={posting}>
                    <Send size={16} /> {posting ? 'Posting...' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="section">
            <div className="section-header">
              <h2><Megaphone size={22} /> All Announcements</h2>
            </div>
            {announcements.length > 0 ? (
              announcements.map((a) => (
                <AnnouncementCard key={a.id} announcement={a} canDelete onDelete={deleteAnnouncement} />
              ))
            ) : (
              <div className="empty-state">
                <span className="emoji">📢</span>
                <h3>No announcements</h3>
                <p>Post the first camp announcement above!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* CAMPER MODAL */}
      {showCamperModal && (
        <div className="modal-overlay" onClick={() => setShowCamperModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCamper ? 'Edit Camper' : 'Add New Camper'}</h2>
              <button className="modal-close" onClick={() => setShowCamperModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveCamper}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Alex Rivera"
                    value={camperForm.name}
                    onChange={(e) => setCamperForm({ ...camperForm, name: e.target.value })}
                    required
                  />
                </div>
                {!editingCamper && (
                  <>
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        className="form-control"
                        placeholder="e.g. camper7"
                        value={camperForm.username}
                        onChange={(e) => setCamperForm({ ...camperForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        className="form-control"
                        type="password"
                        placeholder="Set a password"
                        value={camperForm.password}
                        onChange={(e) => setCamperForm({ ...camperForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label>Age</label>
                    <input
                      className="form-control"
                      type="number"
                      min="5"
                      max="18"
                      placeholder="Age"
                      value={camperForm.age}
                      onChange={(e) => setCamperForm({ ...camperForm, age: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cabin</label>
                    <select
                      className="form-control"
                      value={camperForm.cabin_id}
                      onChange={(e) => setCamperForm({ ...camperForm, cabin_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {cabins.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCamperModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingCamper ? 'Save Changes' : 'Add Camper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Schedule Entry</h2>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addScheduleEntry}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cabin</label>
                  <select
                    className="form-control"
                    value={scheduleForm.cabin_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, cabin_id: e.target.value })}
                    required
                  >
                    <option value="">Select Cabin</option>
                    {cabins.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Activity</label>
                  <select
                    className="form-control"
                    value={scheduleForm.activity_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, activity_id: e.target.value })}
                    required
                  >
                    <option value="">Select Activity</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} — {a.day_of_week} {a.time_slot}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    className="form-control"
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
