import { useState, useEffect, useMemo } from 'react';
import {
  Users, Home, Activity, Calendar, Megaphone, Plus, Trash2, Edit3, X, Send,
  BarChart3, UserPlus, ClipboardList, KeyRound, Mail, Sun, Search, Palette,
  MessageSquare, ChevronRight, CheckCircle2, Circle, Heart, Clock,
} from 'lucide-react';
import api from '../api';
import AnnouncementCard from '../components/AnnouncementCard';
import CredentialsModal from '../components/CredentialsModal';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

const TIME_SLOTS = [
  '7:30 AM - 8:00 AM', '8:00 AM - 8:30 AM', '8:30 AM - 9:00 AM', '9:00 AM - 9:30 AM',
  '9:30 AM - 10:00 AM', '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM', '11:00 AM - 11:30 AM',
  '11:30 AM - 12:00 PM', '12:00 PM - 12:30 PM', '12:30 PM - 1:00 PM', '1:00 PM - 1:30 PM',
  '1:30 PM - 2:00 PM', '2:00 PM - 2:30 PM', '2:30 PM - 3:00 PM', '3:00 PM - 3:30 PM',
];

function teamSwatch(color) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 12, height: 12, borderRadius: '50%',
        background: color || '#FF6B2C',
        border: '2px solid var(--white)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
        verticalAlign: 'middle',
        marginRight: 6,
      }}
    />
  );
}

function initials(name) {
  return (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ campers: 0, counselors: 0, teams: 0, activities: 0 });
  const [campers, setCampers] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [counselorSchedule, setCounselorSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [credentialsToShow, setCredentialsToShow] = useState(null);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [s, c, co, t, a, sc, csc, an] = await Promise.all([
        api.get('/stats'),
        api.get('/campers'),
        api.get('/counselors'),
        api.get('/teams'),
        api.get('/activities'),
        api.get('/schedule'),
        api.get('/counselor-schedule'),
        api.get('/announcements'),
      ]);
      setStats(s.data);
      setCampers(c.data.campers);
      setCounselors(co.data.counselors);
      setTeams(t.data.teams);
      setActivities(a.data.activities);
      setSchedule(sc.data.schedule);
      setCounselorSchedule(csc.data.schedule);
      setAnnouncements(an.data.announcements);
    } catch (err) {
      console.error('Failed to load admin data', err);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'campers', label: 'Camper Management', icon: <Users size={16} /> },
    { key: 'counselors', label: 'Counselor Management', icon: <UserPlus size={16} /> },
    { key: 'teams', label: 'Teams', icon: <Home size={16} /> },
    { key: 'schedules', label: 'Schedules', icon: <Calendar size={16} /> },
    { key: 'announcements', label: 'Announcements', icon: <Megaphone size={16} /> },
    { key: 'daily', label: 'Daily Status', icon: <Sun size={16} /> },
  ];

  return (
    <div className="dashboard">
      <div className="welcome-card" style={{ background: 'linear-gradient(135deg, var(--primary), #E55A1B)' }}>
        <div className="welcome-info">
          <div>
            <h2>Admin Dashboard ⭐</h2>
            <p>Full control — manage campers, counselors, teams, schedules, and more.</p>
          </div>
        </div>
        <div className="welcome-icon">🛡️</div>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab stats={stats} teams={teams} announcements={announcements} />
      )}
      {activeTab === 'campers' && (
        <CamperManagementTab
          campers={campers}
          teams={teams}
          counselors={counselors}
          announcements={announcements}
          onReload={loadAllData}
          onCredentials={setCredentialsToShow}
        />
      )}
      {activeTab === 'counselors' && (
        <CounselorManagementTab
          counselors={counselors}
          teams={teams}
          campers={campers}
          announcements={announcements}
          onReload={loadAllData}
          onCredentials={setCredentialsToShow}
        />
      )}
      {activeTab === 'teams' && (
        <TeamsTab teams={teams} counselors={counselors} onReload={loadAllData} />
      )}
      {activeTab === 'schedules' && (
        <SchedulesTab
          schedule={schedule}
          counselorSchedule={counselorSchedule}
          teams={teams}
          activities={activities}
          counselors={counselors}
          onReload={loadAllData}
        />
      )}
      {activeTab === 'announcements' && (
        <AnnouncementsTab
          announcements={announcements}
          campers={campers}
          counselors={counselors}
          onReload={loadAllData}
        />
      )}
      {activeTab === 'daily' && (
        <DailyStatusTab teams={teams} />
      )}

      {credentialsToShow && (
        <CredentialsModal data={credentialsToShow} onClose={() => setCredentialsToShow(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ──────────────────────────────────────────────────────────────────
function OverviewTab({ stats, teams, announcements }) {
  return (
    <>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><Users size={24} /></div>
          <div className="stat-info"><h3>{stats.campers}</h3><p>Campers</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><UserPlus size={24} /></div>
          <div className="stat-info"><h3>{stats.counselors}</h3><p>Counselors</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Home size={24} /></div>
          <div className="stat-info"><h3>{stats.teams || stats.cabins}</h3><p>Teams</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Activity size={24} /></div>
          <div className="stat-info"><h3>{stats.activities}</h3><p>Activities</p></div>
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <div className="section-header"><h2><Home size={22} /> Teams</h2></div>
          {teams.map((t) => (
            <div className="card" key={t.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="avatar" style={{ background: t.team_color, width: 48, height: 48, fontSize: '1.1rem' }}>
                  {t.name[0]}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
                    {teamSwatch(t.team_color)}{t.name} Team
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                    Counselor: {t.counselor_name || 'Unassigned'} · {t.camper_count} campers
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-header"><h2><Megaphone size={22} /> Recent Announcements</h2></div>
          {announcements.slice(0, 3).map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// CAMPER MANAGEMENT TAB
// ──────────────────────────────────────────────────────────────────
function CamperManagementTab({ campers, teams, counselors, announcements, onReload, onCredentials }) {
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterAttendance, setFilterAttendance] = useState(''); // '', 'at_camp', 'ready', 'picked_up'

  const empty = { name: '', email: '', age: '', team_id: '', guardian_name: '', guardian_phone: '' };
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [profileOf, setProfileOf] = useState(null);

  const teamById = useMemo(() => {
    const m = new Map();
    teams.forEach((t) => m.set(Number(t.id), t));
    return m;
  }, [teams]);

  const counselorByTeam = useMemo(() => {
    const m = new Map();
    counselors.forEach((c) => { if (c.team_id) m.set(Number(c.team_id), c); });
    return m;
  }, [counselors]);

  const filtered = useMemo(() => {
    return campers.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.username.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTeam && Number(c.team_id) !== Number(filterTeam)) return false;
      if (filterAge && Number(c.age) !== Number(filterAge)) return false;
      if (filterAttendance && (c.pickup_status || 'at_camp') !== filterAttendance) return false;
      return true;
    });
  }, [campers, search, filterTeam, filterAge, filterAttendance]);

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', email: c.email || '', age: c.age || '',
      team_id: c.team_id || '', guardian_name: c.guardian_name || '',
      guardian_phone: c.guardian_phone || '',
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/campers/${editing.id}`, {
          name: form.name, email: form.email || null, age: form.age || null,
          team_id: form.team_id || null,
          guardian_name: form.guardian_name || null, guardian_phone: form.guardian_phone || null,
        });
        setShowModal(false);
      } else {
        const res = await api.post('/campers', form);
        setShowModal(false);
        onCredentials({ role: 'camper', user: res.data.camper, credentials: res.data.credentials });
      }
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save camper');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this camper?')) return;
    try { await api.delete(`/campers/${id}`); onReload(); }
    catch { alert('Failed to delete camper'); }
  };

  const reset = async (c) => {
    if (!confirm(`Reset password for ${c.name}?`)) return;
    try {
      const res = await api.post(`/campers/${c.id}/reset-password`);
      onCredentials({ role: 'camper', user: c, credentials: res.data.credentials });
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const uniqueAges = useMemo(() => {
    const set = new Set();
    campers.forEach((c) => { if (c.age) set.add(c.age); });
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [campers]);

  return (
    <div className="section">
      <div className="section-header">
        <h2><Users size={22} /> Camper Management</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Camper</button>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <Search size={14} />
          <input
            placeholder="Search by name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)}>
          <option value="">All Ages</option>
          {uniqueAges.map((a) => <option key={a} value={a}>Age {a}</option>)}
        </select>
        <select value={filterAttendance} onChange={(e) => setFilterAttendance(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="at_camp">At Camp</option>
          <option value="ready">Ready for Pickup</option>
          <option value="picked_up">Picked Up</option>
        </select>
        <span className="filter-count">{filtered.length} of {campers.length}</span>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Guardian</th>
                <th>Age</th>
                <th>Team</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const team = teamById.get(Number(c.team_id));
                const color = team?.team_color || c.team_color || '#A0A0A0';
                return (
                  <tr key={c.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem', background: color }}>
                        {initials(c.name)}
                      </div>
                      <button className="link-btn" onClick={() => setProfileOf(c)}>{c.name}</button>
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
                    <td>
                      {team ? (
                        <span>{teamSwatch(color)}{team.name}</span>
                      ) : <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}
                    </td>
                    <td>
                      <span className={`pickup-badge pickup-${c.pickup_status || 'at_camp'}`}>
                        {c.pickup_status === 'ready' ? '🎒 Ready' : c.pickup_status === 'picked_up' ? '✅ Picked Up' : '🏕️ At Camp'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-ghost btn-sm" onClick={() => setProfileOf(c)} title="View profile">
                          <ChevronRight size={14} /> Profile
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => reset(c)}>
                          <KeyRound size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <span className="emoji">🏕️</span>
            <h3>No campers match</h3>
            <p>Adjust your filters or click "Add Camper" to add the first one.</p>
          </div>
        )}
      </div>

      {showModal && (
        <CamperModal
          editing={editing}
          form={form}
          setForm={setForm}
          teams={teams}
          saving={saving}
          onSave={save}
          onClose={() => setShowModal(false)}
        />
      )}

      {profileOf && (
        <CamperProfileModal
          camper={profileOf}
          team={teamById.get(Number(profileOf.team_id))}
          counselor={counselorByTeam.get(Number(profileOf.team_id))}
          announcements={announcements}
          onClose={() => setProfileOf(null)}
        />
      )}
    </div>
  );
}

function CamperModal({ editing, form, setForm, teams, saving, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Edit Camper' : 'Add New Camper'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={onSave}>
          <div className="modal-body">
            {!editing && (
              <div className="cred-warning">
                <Mail size={16} />
                <span>A temporary password will be generated automatically.</span>
              </div>
            )}
            <div className="form-group">
              <label>Full Name *</label>
              <input className="form-control" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Guardian Name</label>
                <input className="form-control" value={form.guardian_name}
                  onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Guardian Phone</label>
                <input className="form-control" value={form.guardian_phone}
                  onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input className="form-control" type="number" min="5" max="18" value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Team</label>
                <select className="form-control" value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CamperProfileModal({ camper, team, counselor, announcements, onClose }) {
  const [attendance, setAttendance] = useState([]);
  const [specialNotes, setSpecialNotes] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [composeNote, setComposeNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!camper) return;
    (async () => {
      try {
        const [att, sn, an] = await Promise.all([
          api.get('/attendance', { params: { camper_id: camper.id } }),
          api.get(`/special-notes/camper/${camper.id}`),
          api.get(`/notes/to/${camper.id}`),
        ]);
        setAttendance(att.data.attendance);
        setSpecialNotes(sn.data.notes);
        setAdminNotes(an.data.notes);
      } catch (err) {
        console.error('Failed to load camper profile', err);
      }
    })();
  }, [camper]);

  const sendNote = async (e) => {
    e.preventDefault();
    if (!composeNote.trim()) return;
    setSending(true);
    try {
      await api.post('/notes', { to_user_id: camper.id, note_text: composeNote.trim() });
      setComposeNote('');
      const res = await api.get(`/notes/to/${camper.id}`);
      setAdminNotes(res.data.notes);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send note');
    } finally {
      setSending(false);
    }
  };

  // Find which announcements this camper has acknowledged
  const camperAnnouncements = useMemo(() => {
    return announcements.filter((a) =>
      a.audience === 'all' || a.audience === 'campers' ||
      (a.audience === 'specific_camper' && Number(a.target_user_id) === Number(camper.id))
    );
  }, [announcements, camper]);

  const color = team?.team_color || camper.team_color || '#A0A0A0';
  const present = attendance.filter((a) => a.present).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: color, color: 'white' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="avatar" style={{ background: 'rgba(255,255,255,0.25)', color: 'white', width: 44, height: 44, fontSize: '0.9rem' }}>
              {initials(camper.name)}
            </div>
            {camper.name}
          </h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="profile-grid">
            <div className="profile-cell">
              <span className="label">Username</span>
              <span className="value">@{camper.username}</span>
            </div>
            <div className="profile-cell">
              <span className="label">Age</span>
              <span className="value">{camper.age || '—'}</span>
            </div>
            <div className="profile-cell">
              <span className="label">Team</span>
              <span className="value">{teamSwatch(color)}{team?.name || 'Unassigned'}</span>
            </div>
            <div className="profile-cell">
              <span className="label">Counselor</span>
              <span className="value">{counselor?.name || 'Unassigned'}</span>
            </div>
            <div className="profile-cell">
              <span className="label">Attendance</span>
              <span className="value">{present}/{attendance.length} present</span>
            </div>
            <div className="profile-cell">
              <span className="label">Guardian</span>
              <span className="value">{camper.guardian_name || '—'} {camper.guardian_phone ? `· ${camper.guardian_phone}` : ''}</span>
            </div>
          </div>

          <h3 className="profile-section-title"><Heart size={16} /> Family Special Notes</h3>
          {specialNotes.length > 0 ? specialNotes.map((n) => (
            <div className="note-card parent-note" key={n.id}>
              <div className="note-meta">From {n.guardian_name || 'Family'} · {new Date(n.updated_at).toLocaleString()}</div>
              <div className="note-body">{n.note || <em>(empty)</em>}</div>
            </div>
          )) : (
            <div className="muted">No family notes yet.</div>
          )}

          <h3 className="profile-section-title"><MessageSquare size={16} /> Admin Notes to this Camper</h3>
          <form onSubmit={sendNote} className="compose-note">
            <textarea
              placeholder="Write a private note for this camper…"
              value={composeNote}
              onChange={(e) => setComposeNote(e.target.value)}
              rows={2}
            />
            <button type="submit" className="btn btn-primary" disabled={sending}>
              <Send size={14} /> Send
            </button>
          </form>
          {adminNotes.length > 0 ? adminNotes.map((n) => (
            <div className="note-card" key={n.id}>
              <div className="note-meta">
                {new Date(n.created_at).toLocaleString()} {n.read_at && <span className="muted">· read</span>}
              </div>
              <div className="note-body">{n.note_text}</div>
            </div>
          )) : (
            <div className="muted">No admin notes yet.</div>
          )}

          <h3 className="profile-section-title"><Megaphone size={16} /> Announcement Acknowledgements</h3>
          {camperAnnouncements.length === 0 ? (
            <div className="muted">No announcements directed at this camper.</div>
          ) : (
            <CamperAckList camperId={camper.id} announcements={camperAnnouncements} />
          )}
        </div>
      </div>
    </div>
  );
}

function CamperAckList({ camperId, announcements }) {
  const [ackMap, setAckMap] = useState({});
  useEffect(() => {
    (async () => {
      const map = {};
      for (const a of announcements) {
        try {
          const res = await api.get(`/announcements/${a.id}/acknowledgements`);
          const u = res.data.users.find((x) => Number(x.user_id) === Number(camperId));
          map[a.id] = !!u?.acknowledged_at;
        } catch { /* ignore */ }
      }
      setAckMap(map);
    })();
  }, [camperId, announcements]);

  return (
    <ul className="ack-list">
      {announcements.map((a) => (
        <li key={a.id}>
          {ackMap[a.id] ? (
            <CheckCircle2 size={16} className="ack-yes" />
          ) : (
            <Circle size={16} className="ack-no" />
          )}
          <strong>{a.title}</strong>
          <span className="muted">
            · {ackMap[a.id] ? 'Acknowledged' : 'Pending'}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ──────────────────────────────────────────────────────────────────
// COUNSELOR MANAGEMENT TAB
// ──────────────────────────────────────────────────────────────────
function CounselorManagementTab({ counselors, teams, campers, announcements, onReload, onCredentials }) {
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const empty = { name: '', email: '', phone: '', age: '', team_id: '' };
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [profileOf, setProfileOf] = useState(null);

  const teamById = useMemo(() => {
    const m = new Map();
    teams.forEach((t) => m.set(Number(t.id), t));
    return m;
  }, [teams]);

  const filtered = useMemo(() => counselors.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.username || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTeam && Number(c.team_id) !== Number(filterTeam)) return false;
    return true;
  }), [counselors, search, filterTeam]);

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '',
      age: c.age || '', team_id: c.team_id || '',
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/counselors/${editing.id}`, {
          name: form.name, email: form.email || null, phone: form.phone || null,
          age: form.age || null, team_id: form.team_id || null,
        });
        setShowModal(false);
      } else {
        const res = await api.post('/counselors', form);
        setShowModal(false);
        onCredentials({ role: 'counselor', user: res.data.counselor, credentials: res.data.credentials });
      }
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save counselor');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this counselor?')) return;
    try { await api.delete(`/counselors/${id}`); onReload(); }
    catch { alert('Failed to delete counselor'); }
  };

  const reset = async (c) => {
    if (!confirm(`Reset password for ${c.name}?`)) return;
    try {
      const res = await api.post(`/counselors/${c.id}/reset-password`);
      onCredentials({ role: 'counselor', user: c, credentials: res.data.credentials });
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2><UserPlus size={22} /> Counselor Management</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Counselor</button>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <Search size={14} />
          <input
            placeholder="Search by name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="filter-count">{filtered.length} of {counselors.length}</span>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Team</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const team = teamById.get(Number(c.team_id));
                const color = team?.team_color || c.team_color || '#A0A0A0';
                return (
                  <tr key={c.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem', background: color }}>
                        {initials(c.name)}
                      </div>
                      <button className="link-btn" onClick={() => setProfileOf(c)}>{c.name}</button>
                    </td>
                    <td>@{c.username}</td>
                    <td style={{ fontSize: '0.85rem' }}>{c.email || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{c.phone || '—'}</td>
                    <td>
                      {team ? <span>{teamSwatch(color)}{team.name}</span> : <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-ghost btn-sm" onClick={() => setProfileOf(c)} title="View profile">
                          <ChevronRight size={14} /> Profile
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => reset(c)}>
                          <KeyRound size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <span className="emoji">🧭</span>
            <h3>No counselors yet</h3>
            <p>Add a counselor to get started.</p>
          </div>
        )}
      </div>

      {showModal && (
        <CounselorModal
          editing={editing} form={form} setForm={setForm} teams={teams}
          saving={saving} onSave={save} onClose={() => setShowModal(false)}
        />
      )}

      {profileOf && (
        <CounselorProfileModal
          counselor={profileOf}
          team={teamById.get(Number(profileOf.team_id))}
          campers={campers}
          announcements={announcements}
          onClose={() => setProfileOf(null)}
        />
      )}
    </div>
  );
}

function CounselorModal({ editing, form, setForm, teams, saving, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Edit Counselor' : 'Add New Counselor'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={onSave}>
          <div className="modal-body">
            {!editing && (
              <div className="cred-warning">
                <Mail size={16} />
                <span>A temporary password will be generated automatically.</span>
              </div>
            )}
            <div className="form-group">
              <label>Full Name *</label>
              <input className="form-control" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input className="form-control" type="number" min="16" max="80" value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Assigned Team</label>
              <select className="form-control" value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                <option value="">Unassigned</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CounselorProfileModal({ counselor, team, campers, announcements, onClose }) {
  const [adminNotes, setAdminNotes] = useState([]);
  const [composeNote, setComposeNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/notes/to/${counselor.id}`);
        setAdminNotes(res.data.notes);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [counselor]);

  const teamCampers = campers.filter((c) => Number(c.team_id) === Number(counselor.team_id));

  const sendNote = async (e) => {
    e.preventDefault();
    if (!composeNote.trim()) return;
    setSending(true);
    try {
      await api.post('/notes', { to_user_id: counselor.id, note_text: composeNote.trim() });
      setComposeNote('');
      const res = await api.get(`/notes/to/${counselor.id}`);
      setAdminNotes(res.data.notes);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send note');
    } finally {
      setSending(false);
    }
  };

  const counselorAnnouncements = announcements.filter((a) =>
    a.audience === 'all' || a.audience === 'counselors' ||
    (a.audience === 'specific_counselor' && Number(a.target_user_id) === Number(counselor.id))
  );

  const color = team?.team_color || counselor.team_color || '#A0A0A0';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: color, color: 'white' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="avatar" style={{ background: 'rgba(255,255,255,0.25)', color: 'white', width: 44, height: 44, fontSize: '0.9rem' }}>
              {initials(counselor.name)}
            </div>
            {counselor.name}
          </h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="profile-grid">
            <div className="profile-cell"><span className="label">Username</span><span className="value">@{counselor.username}</span></div>
            <div className="profile-cell"><span className="label">Email</span><span className="value">{counselor.email || '—'}</span></div>
            <div className="profile-cell"><span className="label">Phone</span><span className="value">{counselor.phone || '—'}</span></div>
            <div className="profile-cell"><span className="label">Team</span><span className="value">{teamSwatch(color)}{team?.name || 'Unassigned'}</span></div>
          </div>

          <h3 className="profile-section-title"><Users size={16} /> Campers in {team?.name || 'this team'}</h3>
          {teamCampers.length > 0 ? (
            <div className="cabin-mates">
              {teamCampers.map((c) => (
                <div className="cabin-mate" key={c.id}>
                  <div className="avatar" style={{ background: color }}>{initials(c.name)}</div>
                  <div className="cabin-mate-info">
                    <h4>{c.name}</h4>
                    <p>Age {c.age}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="muted">No campers on this team yet.</div>}

          <h3 className="profile-section-title"><MessageSquare size={16} /> Admin Notes to this Counselor</h3>
          <form onSubmit={sendNote} className="compose-note">
            <textarea
              placeholder="Write a private note for this counselor…"
              value={composeNote}
              onChange={(e) => setComposeNote(e.target.value)}
              rows={2}
            />
            <button type="submit" className="btn btn-primary" disabled={sending}>
              <Send size={14} /> Send
            </button>
          </form>
          {adminNotes.length > 0 ? adminNotes.map((n) => (
            <div className="note-card" key={n.id}>
              <div className="note-meta">{new Date(n.created_at).toLocaleString()} {n.read_at && <span className="muted">· read</span>}</div>
              <div className="note-body">{n.note_text}</div>
            </div>
          )) : <div className="muted">No admin notes yet.</div>}

          <h3 className="profile-section-title"><Megaphone size={16} /> Announcement Acknowledgements</h3>
          {counselorAnnouncements.length === 0 ? <div className="muted">No announcements directed at this counselor.</div> : (
            <CamperAckList camperId={counselor.id} announcements={counselorAnnouncements} />
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// TEAMS TAB
// ──────────────────────────────────────────────────────────────────
function TeamsTab({ teams, counselors, onReload }) {
  const empty = { name: '', team_color: '#FF6B2C', counselor_id: '' };
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name || '', team_color: t.team_color || '#FF6B2C', counselor_id: t.counselor_id || '' });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/teams/${editing.id}`, {
          name: form.name, team_color: form.team_color, counselor_id: form.counselor_id || null,
        });
      } else {
        await api.post('/teams', {
          name: form.name, team_color: form.team_color, counselor_id: form.counselor_id || null,
        });
      }
      setShowModal(false);
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this team? Campers will be unassigned.')) return;
    try { await api.delete(`/teams/${id}`); onReload(); }
    catch { alert('Failed to delete team'); }
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2><Home size={22} /> Teams</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Team</button>
      </div>
      <div className="teams-grid">
        {teams.map((t) => (
          <div className="team-card" key={t.id} style={{ borderTop: `4px solid ${t.team_color}` }}>
            <div className="team-card-header">
              <div className="avatar" style={{ background: t.team_color, width: 56, height: 56, fontSize: '1.3rem' }}>
                {t.name[0]}
              </div>
              <div>
                <h3>{t.name} Team</h3>
                <div className="team-color-row">
                  <Palette size={12} />
                  <code>{t.team_color}</code>
                </div>
              </div>
            </div>
            <div className="team-card-body">
              <div className="muted">Counselor: <strong>{t.counselor_name || 'Unassigned'}</strong></div>
              <div className="muted">{t.camper_count} campers</div>
            </div>
            <div className="team-card-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Edit3 size={14} /> Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="empty-state">
            <span className="emoji">🏠</span>
            <h3>No teams yet</h3>
            <p>Click "Add Team" to create the first one.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Team' : 'New Team'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Team Name *</label>
                  <input className="form-control" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Team Color *</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      className="color-swatch"
                      value={form.team_color}
                      onChange={(e) => setForm({ ...form, team_color: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={form.team_color}
                      onChange={(e) => setForm({ ...form, team_color: e.target.value })}
                      style={{ maxWidth: 140 }}
                    />
                    <div className="avatar" style={{ background: form.team_color, width: 36, height: 36, fontSize: '0.9rem' }}>
                      {(form.name || 'T')[0]}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Counselor</label>
                  <select className="form-control" value={form.counselor_id}
                    onChange={(e) => setForm({ ...form, counselor_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SCHEDULES TAB (Camper team schedule + counselor schedule)
// ──────────────────────────────────────────────────────────────────
function SchedulesTab({ schedule, counselorSchedule, teams, activities, counselors, onReload }) {
  const [sub, setSub] = useState('team');
  return (
    <div className="section">
      <div className="section-header">
        <h2><Calendar size={22} /> Schedules</h2>
        <div className="subtabs">
          <button className={`subtab ${sub === 'team' ? 'active' : ''}`} onClick={() => setSub('team')}>Team Schedule</button>
          <button className={`subtab ${sub === 'counselor' ? 'active' : ''}`} onClick={() => setSub('counselor')}>Counselor Schedule</button>
        </div>
      </div>

      {sub === 'team' ? (
        <TeamScheduleBuilder schedule={schedule} teams={teams} activities={activities} onReload={onReload} />
      ) : (
        <CounselorScheduleBuilder schedule={counselorSchedule} counselors={counselors} onReload={onReload} />
      )}
    </div>
  );
}

function TeamScheduleBuilder({ schedule, teams, activities, onReload }) {
  const [filterTeam, setFilterTeam] = useState(teams[0]?.id || '');
  useEffect(() => { if (!filterTeam && teams[0]) setFilterTeam(teams[0].id); }, [teams]);

  const [form, setForm] = useState({ activity_id: '', date: weekDates[0], time_slot: TIME_SLOTS[3] });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => schedule.filter((s) =>
    !filterTeam || Number(s.team_id) === Number(filterTeam)
  ), [schedule, filterTeam]);

  const grid = useMemo(() => {
    // Build {date -> {slot -> entry}}
    const m = {};
    weekDates.forEach((d) => { m[d] = {}; });
    filtered.forEach((s) => {
      const slot = s.time_slot;
      if (!slot || !m[s.date]) return;
      m[s.date][slot] = s;
    });
    return m;
  }, [filtered]);

  const add = async (e) => {
    e.preventDefault();
    if (!filterTeam) return alert('Pick a team first');
    setSaving(true);
    try {
      await api.post('/schedule', {
        team_id: filterTeam,
        activity_id: form.activity_id,
        date: form.date,
        time_slot: form.time_slot,
      });
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add schedule entry');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Remove this schedule entry?')) return;
    try { await api.delete(`/schedule/${id}`); onReload(); }
    catch { alert('Failed to delete entry'); }
  };

  const activeTeam = teams.find((t) => Number(t.id) === Number(filterTeam));
  const teamColor = activeTeam?.team_color || '#FF6B2C';

  return (
    <>
      <div className="filter-bar">
        <label style={{ fontWeight: 700 }}>Team:</label>
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {activeTeam && (
          <span>{teamSwatch(teamColor)}<strong>{activeTeam.name}</strong></span>
        )}
      </div>

      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              {dayNames.map((d, i) => <th key={i}>{d}<div className="muted small">{weekDates[i].slice(5)}</div></th>)}
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
                          <button onClick={() => del(entry.id)} title="Remove" className="schedule-pill-x">
                            <X size={12} />
                          </button>
                          {entry.location && <div className="muted small">📍 {entry.location}</div>}
                        </div>
                      ) : (
                        <span className="empty-cell">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Add Activity</h3>
      <form onSubmit={add} className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
          <label>Activity</label>
          <select className="form-control" required value={form.activity_id}
            onChange={(e) => setForm({ ...form, activity_id: e.target.value })}>
            <option value="">Pick…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
          <label>Day</label>
          <select className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
            {weekDates.map((d, i) => <option key={d} value={d}>{dayNames[i]}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
          <label>Time Slot</label>
          <select className="form-control" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })}>
            {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Plus size={16} /> Add
        </button>
      </form>
    </>
  );
}

function CounselorScheduleBuilder({ schedule, counselors, onReload }) {
  const [counselorId, setCounselorId] = useState(counselors[0]?.id || '');
  useEffect(() => { if (!counselorId && counselors[0]) setCounselorId(counselors[0].id); }, [counselors]);

  const [form, setForm] = useState({ duty: '', date: weekDates[0], time_slot: TIME_SLOTS[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const filtered = schedule.filter((s) => !counselorId || Number(s.counselor_id) === Number(counselorId));
  const grid = useMemo(() => {
    const m = {};
    weekDates.forEach((d) => { m[d] = {}; });
    filtered.forEach((s) => { if (m[s.date]) m[s.date][s.time_slot] = s; });
    return m;
  }, [filtered]);

  const add = async (e) => {
    e.preventDefault();
    if (!counselorId) return alert('Pick a counselor first');
    setSaving(true);
    try {
      await api.post('/counselor-schedule', {
        counselor_id: counselorId,
        date: form.date,
        time_slot: form.time_slot,
        duty: form.duty,
        notes: form.notes || null,
      });
      setForm({ ...form, duty: '', notes: '' });
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Remove this duty?')) return;
    try { await api.delete(`/counselor-schedule/${id}`); onReload(); }
    catch { alert('Failed to delete'); }
  };

  return (
    <>
      <div className="filter-bar">
        <label style={{ fontWeight: 700 }}>Counselor:</label>
        <select value={counselorId} onChange={(e) => setCounselorId(e.target.value)}>
          {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Time</th>
              {dayNames.map((d, i) => <th key={i}>{d}<div className="muted small">{weekDates[i].slice(5)}</div></th>)}
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
                        <div className="schedule-pill" style={{ background: 'rgba(52,152,219,0.15)', borderLeft: '3px solid var(--info)' }}>
                          <strong>{entry.duty}</strong>
                          <button onClick={() => del(entry.id)} className="schedule-pill-x"><X size={12} /></button>
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

      <h3 style={{ marginTop: '1.5rem' }}>Add Duty</h3>
      <form onSubmit={add} className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
          <label>Duty</label>
          <input className="form-control" required placeholder="e.g. Activity Facilitation" value={form.duty}
            onChange={(e) => setForm({ ...form, duty: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
          <label>Day</label>
          <select className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
            {weekDates.map((d, i) => <option key={d} value={d}>{dayNames[i]}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
          <label>Time Slot</label>
          <select className="form-control" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })}>
            {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
          <label>Notes</label>
          <input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><Plus size={16} /> Add</button>
      </form>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS TAB
// ──────────────────────────────────────────────────────────────────
function AnnouncementsTab({ announcements, campers, counselors, onReload }) {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', target_user_id: '' });
  const [posting, setPosting] = useState(false);
  const [ackOpenFor, setAckOpenFor] = useState(null);

  const post = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setPosting(true);
    try {
      const body = { title: form.title, body: form.body, audience: form.audience };
      if (form.audience === 'specific_camper' || form.audience === 'specific_counselor') {
        body.target_user_id = form.target_user_id;
      }
      await api.post('/announcements', body);
      setForm({ title: '', body: '', audience: 'all', target_user_id: '' });
      onReload();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try { await api.delete(`/announcements/${id}`); onReload(); }
    catch { alert('Failed to delete announcement'); }
  };

  const showAcks = async (a) => {
    try {
      const res = await api.get(`/announcements/${a.id}/acknowledgements`);
      setAckOpenFor(res.data);
    } catch (err) {
      alert('Failed to load acknowledgements');
    }
  };

  return (
    <>
      <div className="section">
        <div className="section-header"><h2><Send size={22} /> Post Announcement</h2></div>
        <div className="card">
          <form onSubmit={post} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group" style={{ maxWidth: 260 }}>
                <label>Audience</label>
                <select className="form-control" value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value, target_user_id: '' })}>
                  <option value="all">Everyone</option>
                  <option value="campers">Campers Only</option>
                  <option value="counselors">Counselors Only</option>
                  <option value="specific_camper">Specific Camper</option>
                  <option value="specific_counselor">Specific Counselor</option>
                </select>
              </div>
            </div>
            {form.audience === 'specific_camper' && (
              <div className="form-group">
                <label>Target Camper *</label>
                <select className="form-control" required value={form.target_user_id}
                  onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}>
                  <option value="">Pick a camper…</option>
                  {campers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {form.audience === 'specific_counselor' && (
              <div className="form-group">
                <label>Target Counselor *</label>
                <select className="form-control" required value={form.target_user_id}
                  onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}>
                  <option value="">Pick a counselor…</option>
                  {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Message</label>
              <textarea className="form-control" value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} required />
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
        <div className="section-header"><h2><Megaphone size={22} /> All Announcements</h2></div>
        {announcements.length > 0 ? (
          announcements.map((a) => (
            <AnnouncementCard
              key={a.id} announcement={a} canDelete onDelete={del}
              onClick={() => showAcks(a)}
            />
          ))
        ) : (
          <div className="empty-state">
            <span className="emoji">📢</span>
            <h3>No announcements</h3>
            <p>Post the first camp announcement above!</p>
          </div>
        )}
      </div>

      {ackOpenFor && (
        <AckModal data={ackOpenFor} onClose={() => setAckOpenFor(null)} />
      )}
    </>
  );
}

function AckModal({ data, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Acknowledgements: {data.announcement.title}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="ack-summary">
            <div className="stat-pill ack-on">
              <CheckCircle2 size={16} /> {data.accepted} accepted
            </div>
            <div className="stat-pill ack-off">
              <Circle size={16} /> {data.pending} pending
            </div>
            <div className="stat-pill">Total {data.total}</div>
          </div>
          {data.users.length === 0 ? (
            <div className="muted">No audience members.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Role</th><th>Status</th><th>When</th></tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>
                      {u.acknowledged_at ? (
                        <span className="badge-present">✓ Acknowledged</span>
                      ) : (
                        <span className="badge-absent">○ Pending</span>
                      )}
                    </td>
                    <td className="muted">{u.acknowledged_at ? new Date(u.acknowledged_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DAILY STATUS TAB
// ──────────────────────────────────────────────────────────────────
function DailyStatusTab({ teams }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState('07:30');
  const [to, setTo] = useState('15:30');
  const [teamFilter, setTeamFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { date, from, to };
      if (teamFilter) params.team_id = teamFilter;
      const res = await api.get('/daily-status', { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date, from, to, teamFilter]);

  return (
    <div className="section">
      <div className="section-header"><h2><Sun size={22} /> Daily Camp Status</h2></div>

      <div className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group">
          <label>Date</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>From</label>
          <input type="time" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} min="07:30" max="15:30" />
        </div>
        <div className="form-group">
          <label>To</label>
          <input type="time" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} min="07:30" max="15:30" />
        </div>
        <div className="form-group">
          <label>Team</label>
          <select className="form-control" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">All Teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="muted" style={{ padding: '1rem' }}>Loading…</div>}

      {data && (
        <>
          <h3 className="profile-section-title"><Clock size={16} /> Activities in this window</h3>
          {data.activities.length > 0 ? (
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Time</th><th>Activity</th><th>Team</th><th>Location</th></tr></thead>
                <tbody>
                  {data.activities.map((a) => (
                    <tr key={a.id}>
                      <td>{a.time_slot}</td>
                      <td><strong>{a.activity_name}</strong></td>
                      <td>{teamSwatch(a.team_color)}{a.team_name}</td>
                      <td>{a.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="muted">No team activities in this window.</div>}

          <h3 className="profile-section-title"><UserPlus size={16} /> Counselors on Duty</h3>
          {data.duties.length > 0 ? (
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Time</th><th>Counselor</th><th>Duty</th><th>Team</th></tr></thead>
                <tbody>
                  {data.duties.map((d) => (
                    <tr key={d.id}>
                      <td>{d.time_slot}</td>
                      <td>{d.counselor_name}</td>
                      <td>{d.duty}</td>
                      <td>{d.team_color ? teamSwatch(d.team_color) : null}{d.team_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="muted">No counselor duties in this window.</div>}

          <h3 className="profile-section-title"><Users size={16} /> Attendance Summary</h3>
          {data.attendance.length > 0 ? (
            <div className="cards-grid">
              {data.attendance.map((row) => (
                <div className="stat-card" key={row.team_id || 'na'}>
                  <div className="stat-icon" style={{ background: (row.team_color || '#999') + '22', color: row.team_color || '#666' }}>
                    <Home size={20} />
                  </div>
                  <div className="stat-info">
                    <h3>{row.present_count}/{row.total}</h3>
                    <p>{row.team_name || 'Unassigned'} — {row.absent_count} absent</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="muted">No attendance recorded for this date.</div>}

          <h3 className="profile-section-title"><Megaphone size={16} /> Active Announcements</h3>
          {data.announcements.length > 0 ? (
            data.announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
          ) : <div className="muted">No active announcements.</div>}
        </>
      )}
    </div>
  );
}
