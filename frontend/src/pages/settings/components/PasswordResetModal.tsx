import { useState } from 'react';
import { resetUserPasswordApi } from '@/api/users.api';
import { useNotificationStore } from '@/store/notificationStore';
import { KeyRound, Eye, EyeOff, X, RefreshCw, Check } from 'lucide-react';

interface Props {
  user: { id: string; name: string; username: string };
  onClose: () => void;
  onSuccess: (updatedPassword?: string) => void;
}

export default function PasswordResetModal({ user, onClose, onSuccess }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      addNotification('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetUserPasswordApi(user.id, newPassword.trim());
      addNotification('Success', `Password for @${user.username} has been updated`, 'success');
      onSuccess(newPassword.trim());
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="sidebar-overlay" 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border)'
        }}
        className="fade-in"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(184, 115, 51, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={18} color="var(--copper-dark)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--charcoal)' }}>Change / Reset Password</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                For {user.name} (@{user.username})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>New Password</label>
              <button 
                type="button" 
                onClick={generatePassword} 
                style={{ background: 'none', border: 'none', color: 'var(--copper-dark)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={12} /> Auto-Generate
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="input"
                style={{ width: '100%', paddingRight: 40, fontFamily: showPassword ? 'monospace' : 'inherit' }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--slate)', margin: '6px 0 0 0' }}>
              Only you (Administrator) will be able to view this password.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn" 
              style={{ background: 'var(--warm-white)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || newPassword.length < 6} 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={16} /> {loading ? 'Updating...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
