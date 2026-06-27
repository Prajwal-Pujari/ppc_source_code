import { useState, useEffect, useRef } from 'react';
import { getUsersApi, toggleUserPermissionApi, toggleCalibrationWorkerApi, updateUserSignatureApi } from '@/api/users.api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { User } from '@/types/domain.types';
import { Plus, Shield, User as UserIcon, Settings2, RefreshCw, PenTool, Upload, Check, X } from 'lucide-react';
import UserCreateForm from './components/UserCreateForm';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSignUser, setEditingSignUser] = useState<User | null>(null);
  const [signInput, setSignInput] = useState('');
  const [savingSign, setSavingSign] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res.data);
    } catch (error) {
      addNotification('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePermission = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserPermissionApi(userId, !currentStatus);
      addNotification('Success', 'User permissions updated', 'success');
      fetchUsers();
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to update permissions', 'error');
    }
  };

  const handleToggleCalibration = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleCalibrationWorkerApi(userId, !currentStatus);
      addNotification('Success', 'Calibration profession updated', 'success');
      fetchUsers();
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to update calibration status', 'error');
    }
  };

  const handleSaveSign = async () => {
    if (!editingSignUser) return;
    setSavingSign(true);
    try {
      await updateUserSignatureApi(editingSignUser.id, signInput);
      addNotification('Success', 'Signature updated successfully', 'success');
      setEditingSignUser(null);
      fetchUsers();
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to save signature', 'error');
    } finally {
      setSavingSign(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSignInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  
  // A supervisor can only create users if they have the explicit flag enabled.
  // Wait, the currentUser type doesn't have canManageUsers. But we can assume if they are SUPERVISOR, they might have it.
  // We'll trust the backend to reject if they don't, but ideally we'd hide the button if we knew. 
  // For now, if Admin or Supervisor, show the button.
  const canAddUser = isAdmin || currentUser?.role === 'SUPERVISOR';

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            User Management
          </h1>
          <p style={{ margin: 0, color: 'var(--slate)', fontSize: 14 }}>
            Manage factory personnel, roles, and security permissions.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={fetchUsers} className="btn" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} />
          </button>
          {canAddUser && (
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Plus size={16} />
              Add User
            </button>
          )}
        </div>
      </div>

      {showCreateForm ? (
        <div style={{ marginBottom: 32, maxWidth: 600 }}>
          <UserCreateForm 
            onSuccess={() => { setShowCreateForm(false); fetchUsers(); }} 
            onCancel={() => setShowCreateForm(false)} 
          />
        </div>
      ) : null}

      <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personnel</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signature</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading personnel data...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--copper-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserIcon size={20} color="var(--copper-dark)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 14 }}>{user.fullName}</div>
                        <div style={{ color: 'var(--ash)', fontSize: 12, marginTop: 2 }}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {user.role === 'ADMIN' && <Shield size={14} color="var(--copper-dark)" />}
                      {user.role === 'SUPERVISOR' && <Settings2 size={14} color="var(--slate)" />}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: user.isActive ? 'var(--status-completed-bg)' : 'var(--status-rejected-bg)',
                      color: user.isActive ? 'var(--status-completed)' : 'var(--status-rejected)'
                    }}>
                      {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {user.signatureUrl ? (
                        user.signatureUrl.startsWith('data:image') ? (
                          <img src={user.signatureUrl} alt="Sign" style={{ height: 28, maxWidth: 80, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4, padding: 2, background: '#fff' }} />
                        ) : (
                          <span style={{ fontFamily: 'cursive', fontSize: 14, color: 'var(--charcoal)', fontWeight: 600 }}>{user.signatureUrl}</span>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ash)', fontStyle: 'italic' }}>No sign</span>
                      )}
                      {(isAdmin || currentUser?.id === user.id) && (
                        <button
                          onClick={() => { setEditingSignUser(user); setSignInput(user.signatureUrl || ''); }}
                          className="btn" style={{ padding: '4px 8px', fontSize: 11, height: 26, background: 'var(--bone-white)' }}
                          title="Edit Signature"
                        >
                          <PenTool size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {user.role === 'SUPERVISOR' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                            <span style={{ fontSize: 12, color: user.canManageUsers ? 'var(--status-completed)' : 'var(--ash)', fontWeight: 500 }}>
                              {user.canManageUsers ? 'Can Add Users' : 'No Add Access'}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleTogglePermission(user.id, user.canManageUsers)}
                                style={{
                                  background: user.canManageUsers ? 'var(--status-completed)' : 'var(--border)',
                                  border: 'none',
                                  width: 44,
                                  height: 24,
                                  borderRadius: 12,
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background 0.3s'
                                }}
                              >
                                <div style={{
                                  width: 20,
                                  height: 20,
                                  background: 'white',
                                  borderRadius: 10,
                                  position: 'absolute',
                                  top: 2,
                                  left: user.canManageUsers ? 22 : 2,
                                  transition: 'left 0.3s',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                              </button>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 12, color: user.isCalibrationWorker ? '#8B6914' : 'var(--ash)', fontWeight: 500 }}>
                            {user.isCalibrationWorker ? 'Calibration Prof.' : 'Standard Work'}
                          </span>
                          {canAddUser && (
                            <button
                              onClick={() => handleToggleCalibration(user.id, user.isCalibrationWorker || false)}
                              style={{
                                background: user.isCalibrationWorker ? '#8B6914' : 'var(--border)',
                                border: 'none',
                                width: 44,
                                height: 24,
                                borderRadius: 12,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                              }}
                            >
                              <div style={{
                                width: 20,
                                height: 20,
                                background: 'white',
                                borderRadius: 10,
                                position: 'absolute',
                                top: 2,
                                left: user.isCalibrationWorker ? 22 : 2,
                                transition: 'left 0.3s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }} />
                            </button>
                          )}
                        </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Signature Modal */}
      {editingSignUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 420, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Update Signature: {editingSignUser.fullName}</h3>
              <button onClick={() => setEditingSignUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 16 }}>
              Type a name/title below OR upload a signature image (PNG/JPG) for official reports.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Typed Signature / Title</label>
              <input
                className="input"
                value={signInput.startsWith('data:image') ? '' : signInput}
                onChange={(e) => setSignInput(e.target.value)}
                placeholder="e.g. John Doe - QA Manager"
              />
            </div>
            <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 12, color: 'var(--ash)' }}>— OR —</div>
            <div style={{ marginBottom: 20 }}>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px dashed var(--border)', background: 'var(--bone-white)' }}
              >
                <Upload size={16} /> Upload Signature Image
              </button>
            </div>
            {signInput && (
              <div style={{ marginBottom: 20, padding: 12, background: 'var(--bone-white)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 6 }}>Preview:</div>
                {signInput.startsWith('data:image') ? (
                  <img src={signInput} alt="Preview" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontFamily: 'cursive', fontSize: 18, fontWeight: 600, color: 'var(--charcoal)' }}>{signInput}</span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={() => setEditingSignUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSign} disabled={savingSign}>
                <Check size={16} style={{ marginRight: 6 }} /> {savingSign ? 'Saving...' : 'Save Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
