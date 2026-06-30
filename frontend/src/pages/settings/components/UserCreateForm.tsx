import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserApi } from '@/api/users.api';
import { useNotificationStore } from '@/store/notificationStore';
import { Eye, EyeOff, Shield } from 'lucide-react';
import type { UserRole } from '@/types/domain.types';

const userSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'WORKER', 'QUALITY_INSPECTOR', 'VIEWER'] as const),
  canManageUsers: z.boolean(),
  isCalibrationWorker: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserCreateForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'WORKER',
      canManageUsers: false,
      isCalibrationWorker: false,
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: UserForm) => {
    setLoading(true);
    try {
      await createUserApi(data);
      addNotification('Success', 'User created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: 'var(--copper-light)', borderRadius: 8 }}>
          <Shield size={20} color="var(--copper-dark)" />
        </div>
        <h3 style={{ margin: 0, color: 'var(--charcoal)', fontSize: 18, fontWeight: 600 }}>Add New User</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Full Name</label>
            <input {...register('fullName')} className="input" placeholder="e.g. John Doe" />
            {errors.fullName && <span style={{ fontSize: 12, color: 'var(--status-rejected)' }}>{errors.fullName.message}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Username</label>
            <input {...register('username')} className="input" placeholder="e.g. jdoe" />
            {errors.username && <span style={{ fontSize: 12, color: 'var(--status-rejected)' }}>{errors.username.message}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Role</label>
            <select {...register('role')} className="input">
              <option value="WORKER">Worker</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrator</option>
              <option value="QUALITY_INSPECTOR">Quality Inspector</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          {selectedRole === 'SUPERVISOR' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warm-white)', padding: 12, borderRadius: 8 }}>
              <input type="checkbox" {...register('canManageUsers')} id="canManageUsers" style={{ width: 16, height: 16 }} />
              <label htmlFor="canManageUsers" style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 500, cursor: 'pointer' }}>
                Allow this Supervisor to add new users
              </label>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warm-white)', padding: 12, borderRadius: 8 }}>
            <input type="checkbox" {...register('isCalibrationWorker')} id="isCalibrationWorker" style={{ width: 16, height: 16 }} />
            <label htmlFor="isCalibrationWorker" style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 500, cursor: 'pointer' }}>
              Assign Calibration Profession
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                {...register('password')} 
                type={showPassword ? 'text' : 'password'} 
                className="input" 
                placeholder="Secure password" 
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex'
                }}
              >
                {showPassword ? <EyeOff size={16} color="var(--ash)" /> : <Eye size={16} color="var(--ash)" />}
              </button>
            </div>
            {errors.password && <span style={{ fontSize: 12, color: 'var(--status-rejected)' }}>{errors.password.message}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="btn" style={{ background: 'var(--border)', color: 'var(--charcoal)' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
