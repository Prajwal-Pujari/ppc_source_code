import { useRef, useState, useEffect } from 'react';
import { X, Upload, Pencil, Trash2, Check } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { updateUserSignatureApi } from '@/api/users.api';

interface SignatureModalProps {
  userId: string;
  userName: string;
  existingSignature?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignatureModal({ userId, userName, existingSignature, onClose, onSuccess }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'DRAW' | 'UPLOAD'>(existingSignature ? 'UPLOAD' : 'DRAW');
  const [signatureData, setSignatureData] = useState<string | null>(existingSignature || null);
  const [isSaving, setIsSaving] = useState(false);
  const addNotification = useNotificationStore(s => s.addNotification);

  useEffect(() => {
    if (mode === 'DRAW' && canvasRef.current && !signatureData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white'; // White background by default for canvas
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [mode, signatureData]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvasToData();
    }
  };

  const saveCanvasToData = () => {
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      addNotification('Error', 'Image too large. Max 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSignatureData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (mode === 'DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSave = async () => {
    if (!signatureData) {
      addNotification('Warning', 'Please provide a signature before saving.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserSignatureApi(userId, signatureData);
      addNotification('Success', 'Signature updated successfully.', 'success');
      onSuccess();
    } catch (error) {
      addNotification('Error', 'Failed to save signature.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bone-white)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--charcoal)' }}>Manage Signature</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ash)' }}>{userName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <button
              onClick={() => { setMode('DRAW'); setSignatureData(null); }}
              className="btn"
              style={{ flex: 1, background: mode === 'DRAW' ? 'var(--silk)' : 'white', border: `1px solid ${mode === 'DRAW' ? 'var(--copper-bronze)' : 'var(--border)'}`, color: mode === 'DRAW' ? 'var(--copper-bronze)' : 'var(--slate)', display: 'flex', gap: 8, justifyContent: 'center' }}
            >
              <Pencil size={16} /> Draw Signature
            </button>
            <button
              onClick={() => { setMode('UPLOAD'); setSignatureData(null); }}
              className="btn"
              style={{ flex: 1, background: mode === 'UPLOAD' ? 'var(--silk)' : 'white', border: `1px solid ${mode === 'UPLOAD' ? 'var(--copper-bronze)' : 'var(--border)'}`, color: mode === 'UPLOAD' ? 'var(--copper-bronze)' : 'var(--slate)', display: 'flex', gap: 8, justifyContent: 'center' }}
            >
              <Upload size={16} /> Upload Image
            </button>
          </div>

          <div style={{ border: '2px dashed var(--border)', borderRadius: 12, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: '#f8f9fa' }}>
            {mode === 'DRAW' ? (
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            ) : signatureData ? (
              <img src={signatureData} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary"
                  style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 auto' }}
                >
                  <Upload size={16} /> Choose Image
                </button>
                <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 12 }}>Supports PNG/JPG with transparent background</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            {signatureData && (
              <button
                onClick={handleClear}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} /> Clear Signature
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bone-white)' }}>
          <button onClick={onClose} className="btn" style={{ background: 'white', border: '1px solid var(--border)' }}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving || !signatureData} className="btn btn-primary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSaving ? 'Saving...' : <><Check size={16} /> Save Signature</>}
          </button>
        </div>
      </div>
    </div>
  );
}
