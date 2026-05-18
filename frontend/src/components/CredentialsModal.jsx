import { useState } from 'react';
import { X, Copy, Check, ShieldAlert, Mail, Phone } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={handle} title="Copy">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function CredentialsModal({ data, onClose }) {
  if (!data) return null;

  const { user, credentials, role } = data;
  const fullBlock =
    `CM2 Summer Camp — Login Details\n` +
    `Name: ${user.name}\n` +
    `Role: ${role}\n` +
    `Username: ${credentials.username}\n` +
    `Temporary Password: ${credentials.temp_password}\n` +
    `Login URL: ${window.location.origin}/\n\n` +
    `Please log in and change your password on first sign-in.`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✅ {role === 'counselor' ? 'Counselor' : 'Camper'} Account Created</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="cred-warning">
            <ShieldAlert size={18} />
            <span>
              This password is shown <strong>only once</strong>. Copy it now and hand it to the family / staff member.
            </span>
          </div>

          <div className="cred-row">
            <label>Name</label>
            <div className="cred-value">{user.name}</div>
          </div>

          {user.email && (
            <div className="cred-row">
              <label><Mail size={14} /> Email</label>
              <div className="cred-value">{user.email}</div>
            </div>
          )}

          {(user.phone || user.guardian_phone) && (
            <div className="cred-row">
              <label><Phone size={14} /> {role === 'counselor' ? 'Phone' : 'Guardian Phone'}</label>
              <div className="cred-value">{user.phone || user.guardian_phone}</div>
            </div>
          )}

          <div className="cred-row">
            <label>Username</label>
            <div className="cred-value cred-mono">
              <code>{credentials.username}</code>
              <CopyButton text={credentials.username} />
            </div>
          </div>

          <div className="cred-row">
            <label>Temporary Password</label>
            <div className="cred-value cred-mono">
              <code>{credentials.temp_password}</code>
              <CopyButton text={credentials.temp_password} />
            </div>
          </div>

          <div className="cred-row">
            <label>Login URL</label>
            <div className="cred-value cred-mono">
              <code>{window.location.origin}/</code>
              <CopyButton text={`${window.location.origin}/`} />
            </div>
          </div>

          <div className="cred-row">
            <label>Copy All</label>
            <div className="cred-value">
              <CopyButton text={fullBlock} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
