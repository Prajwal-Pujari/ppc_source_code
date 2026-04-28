import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { Shield, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await loginApi(data.username, data.password);
      if (res.success && res.data) {
        setAuth(
          {
            id: res.data.user.id,
            username: res.data.user.username,
            fullName: res.data.user.fullName,
            role: res.data.user.role,
            employeeCode: res.data.user.employeeCode,
            factoryId: res.data.user.factoryId,
          },
          res.data.accessToken,
          res.data.refreshToken
        );
        navigate(res.data.user.role === 'WORKER' ? '/my-tasks' : '/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bone-white)',
    }}>
      <div style={{
        width: 420, padding: 48,
        background: 'var(--warm-white)', borderRadius: 16,
        boxShadow: 'var(--shadow-ambient)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--copper-bronze), var(--copper-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--charcoal)' }}>
            PPC
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4 }}>
            AQS Product
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>
              Username
            </label>
            <input
              {...register('username')}
              className="input"
              placeholder="Enter username"
              autoFocus
            />
            {errors.username && (
              <span style={{ fontSize: 12, color: 'var(--status-rejected)', marginTop: 4, display: 'block' }}>
                {errors.username.message}
              </span>
            )}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password')}
                type={showPassword ? "text" : "password"}
                className="input"
                placeholder="Enter password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span style={{ fontSize: 12, color: 'var(--status-rejected)', marginTop: 4, display: 'block' }}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', fontSize: 14 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--dust)', marginTop: 32 }}>
          Default: admin / Admin@123
        </p>
      </div>
    </div>
  );
}
