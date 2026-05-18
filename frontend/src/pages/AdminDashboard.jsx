import { useState, useEffect } from 'react';
import {
  Users, Home, Activity, Calendar, Megaphone, Plus, Trash2, Edit3, X, Send,
  BarChart3, UserPlus, ClipboardList, KeyRound, Mail
} from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';
import CredentialsModal from '../components/CredentialsModal';

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
  const [counselors, setCounselors] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const emptyCamperForm = { name: '', email: '', age: '', cabin_id: '', guardian_name: '', guardian_phone: '' };
  const [showCamperModal, setShowCamperModal] = useState(false);
  const [editingCamper, setEditingCamper] = useState(null);
  const [camperForm, setCamperForm] = useState(emptyCamperForm);
  const [savingCamper, setSavingCamper] = useState(false);

  const emptyCounselorForm = { name: '', email: '', phone: '', age: '', cabin_id: '' };
  const [showCounselorModal, setShowCounselorModal] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState(null);
  const [counselorForm, setCounselorForm] = useState(emptyCounselorForm);
  const [savingCounselor, setSavingCounselor] = useState(false);

  const [credentialsToShow, setCredentialsToShow] = useState(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ cabin_id: '', activity_id: '', date: '' });

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', audience: 'all' });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [statsRes, campersRes, counselorsRes, cabinsRes, activitiesRes, schedRes, annRes] = await Promise.all([
        api.get('/stats'),
        api.get('/campers'),
        api.get('/counselors'),
        api.get('/cabins'),
        api.get('/activities'),
        api.get('/schedule'),
        api.get('/announcements'),
      ]);
      setStats(statsRes.data);
      setCampers(campersRes.data.campers);
      setCounselors(counselorsRes.data.counselors);
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
    setCamperForm(emptyCamperForm);
    setShowCamperModal(true);
  };
  const openEditCamper = (c) => {
    setEditingCamper(c);
    setCamperForm({
      name: c.name || '',
      email: c.email || '',
      age: c.age || '',
      cabin_id: c.cabin_id || '',
      guardian_name: c.guardian_name || '',
      guardian_phone: c.guardian_phone || '',
    });
    setShowCamperModal(true);
  };
  const saveCamper = async (e) => {
    e.preventDefault();
    setSavingCamper(true);
    try {
      if (editingCamper) {
        await api.put(`/campers/${editingCamper.id}`, {
          name: camperForm.name,
          email: camperForm.email || null,
          age: camperForm.age || null,
          cabin_id: camperForm.cabin_id || null,
          guardian_name: camperForm.guardian_name || null,
          guardian_phone: camperForm.guardian_phone || null,
        });
        setShowCamperModal(false);
      } else {
        const res = await api.post('/campers', camperForm);
        setShowCamperModal(false);
        setCredentialsToShow({
          role: 'camper',
          user: res.data.camper,
          credentials: res.data.credentials,
        });
      }
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save camper');
    } finally {
      setSavingCamper(false);
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
  const resetCamperPassword = async (camper) => {
    if (!confirm(`Reset password for ${camper.name}? They will need the new temporary password to log in.`)) return;
    try {
      const res = await api.post(`/campers/${camper.id}/reset-password`);
      setCredentialsToShow({
        role: 'camper',
        user: camper,
        credentials: res.data.credentials,
      });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  // Counselor CRUD
  const openAddCounselor = () => {
    setEditingCounselor(null);
    setCounselorForm(emptyCounselorForm);
    setShowCounselorModal(true);
  };
  const openEditCounselor = (c) => {
    setEditingCounselor(c);
    setCounselorForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      age: c.age || '',
      cabin_id: c.cabin_id || '',
    });
    setShowCounselorModal(true);
  };
  const saveCounselor = async (e) => {
    e.preventDefault();
    setSavingCounselor(true);
    try {
      if (editingCounselor) {
        await api.put(`/counselors/${editingCounselor.id}`, {
          name: counselorForm.name,
          email: counselorForm.email || null,
          phone: counselorForm.phone || null,
          age: counselorForm.age || null,
          cabin_id: counselorForm.cabin_id || null,
        });
        setShowCounselorModal(false);
      } else {
        const res = await api.post('/counselors', counselorForm);
        setShowCounselorModal(false);
        setCredentialsToShow({
          role: 'counselor',
          user: res.data.counselor,
          credentials: res.data.credentials,
        });
      }
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save counselor');
    } finally {
      setSavingCounselor(false);
    }
  };
  const deleteCounselor = async (id) => {
    if (!confirm('Remove this counselor?')) return;
    try {
      await api.delete(`/counselors/${id}`);
      loadAllData();
    } catch (err) {
      alert('Failed to delete counselor');
    }
  };
  const resetCounselorPassword = async (counselor) => {
    if (!confirm(`Reset password for ${counselor.name}?`)) return;
    try {
      const res = await api.post(`/counselors/${counselor.id}/reset-password`);
      setCredentialsToShow({
        role: 'counselor',
        user: counselor,
        credentials: res.data.credentials,
      });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
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
    { key: 'counselors', label: 'Counselors', icon: <UserPlus size={16} /> },
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
                    <th>Email</th>
                    <th>Guardian</th>
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
                      <td style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {c.guardian_name ? (
                          <>
                            <div>{c.guardian_name}</div>
                            <div style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>{c.guardian_phone || ''}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td>{c.age || '—'}</td>
                      <td>{c.cabin_name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditCamper(c)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => resetCamperPassword(c)} title="Reset password">
                            <KeyRound size={14} /> Reset
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
                <p>Click "Add Camper" to create the first one — the office hands out the credentials. 🏕️</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COUNSELORS */}
      {activeTab === 'counselors' && (
        <div className="section">
          <div className="section-header">
            <h2><UserPlus size={22} /> Counselor Management</h2>
            <button className="btn btn-primary" onClick={openAddCounselor}>
              <Plus size={16} /> Add Counselor
            </button>
          </div>
          <div className="card" style={{ overflow: 'auto' }}>
            {counselors.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Cabin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counselors.map((c) => (
                    <tr key={c.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem', background: getAvatarColor(c.name) }}>
                          {c.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        {c.name}
                      </td>
                      <td>@{c.username}</td>
                      <td style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{c.phone || '—'}</td>
                      <td>{c.cabin_name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditCounselor(c)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => resetCounselorPassword(c)}>
                            <KeyRound size={14} /> Reset
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteCounselor(c.id)}>
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
                <span className="emoji">🧭</span>
                <h3>No counselors yet</h3>
                <p>Add your first counselor — they'll get a temporary password to share. 🧭</p>
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
                {!editingCamper && (
                  <div className="cred-warning">
                    <Mail size={16} />
                    <span>
                      A temporary password will be generated automatically. You'll see the credentials after saving — copy them and hand them to the family.
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Alex Rivera"
                    value={camperForm.name}
                    onChange={(e) => setCamperForm({ ...camperForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="parent@example.com"
                    value={camperForm.email}
                    onChange={(e) => setCamperForm({ ...camperForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Guardian Name</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Maria Rivera"
                      value={camperForm.guardian_name}
                      onChange={(e) => setCamperForm({ ...camperForm, guardian_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Guardian Phone</label>
                    <input
                      className="form-control"
                      placeholder="555-1234"
                      value={camperForm.guardian_phone}
                      onChange={(e) => setCamperForm({ ...camperForm, guardian_phone: e.target.value })}
                    />
                  </div>
                </div>
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
                <button type="submit" className="btn btn-primary" disabled={savingCamper}>
                  {savingCamper ? 'Saving...' : editingCamper ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUNSELOR MODAL */}
      {showCounselorModal && (
        <div className="modal-overlay" onClick={() => setShowCounselorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCounselor ? 'Edit Counselor' : 'Add New Counselor'}</h2>
              <button className="modal-close" onClick={() => setShowCounselorModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveCounselor}>
              <div className="modal-body">
                {!editingCounselor && (
                  <div className="cred-warning">
                    <Mail size={16} />
                    <span>
                      A temporary password will be generated automatically. You'll see the credentials after saving.
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Sarah Johnson"
                    value={counselorForm.name}
                    onChange={(e) => setCounselorForm({ ...counselorForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="staff@example.com"
                    value={counselorForm.email}
                    onChange={(e) => setCounselorForm({ ...counselorForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      className="form-control"
                      placeholder="555-1234"
                      value={counselorForm.phone}
                      onChange={(e) => setCounselorForm({ ...counselorForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input
                      className="form-control"
                      type="number"
                      min="16"
                      max="80"
                      placeholder="Age"
                      value={counselorForm.age}
                      onChange={(e) => setCounselorForm({ ...counselorForm, age: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Assigned Cabin</label>
                  <select
                    className="form-control"
                    value={counselorForm.cabin_id}
                    onChange={(e) => setCounselorForm({ ...counselorForm, cabin_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {cabins.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCounselorModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingCounselor}>
                  {savingCounselor ? 'Saving...' : editingCounselor ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL */}
      {credentialsToShow && (
        <CredentialsModal data={credentialsToShow} onClose={() => setCredentialsToShow(null)} />
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
