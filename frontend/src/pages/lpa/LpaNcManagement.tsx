import React, { useState, useEffect } from 'react';
import { lpaApi, type LpaNcResponse } from '@/api/lpa.api';
import { AlertCircle, Clock, CheckCircle2, Flame, UploadCloud, X, Loader2, Paperclip, FileText, Download, ArrowUpRight } from 'lucide-react';
import { PdfPreviewer } from '@/components/PdfPreviewer';

export function LpaNcManagement() {
  const [ncs, setNcs] = useState<LpaNcResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNc, setSelectedNc] = useState<LpaNcResponse | null>(null);

  // Modal State
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [assignedActionOwner, setAssignedActionOwner] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [uploading, setUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  const getValidUrl = (url: string | null | undefined) => {
    if (!url) return '';
    return url.replace('http://localhost:8080', '');
  };

  useEffect(() => {
    fetchNcs();
  }, []);

  const fetchNcs = async () => {
    setLoading(true);
    try {
      const res = await lpaApi.getNonConformances();
      setNcs(res.data || []);
    } catch (e) {
      console.error('Failed to fetch NCs', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle size={16} color="#dc2626" />;
      case 'PENDING_APPROVAL': return <Clock size={16} color="#ca8a04" />;
      case 'CLOSED': return <CheckCircle2 size={16} color="#16a34a" />;
      case 'ESCALATED': return <Flame size={16} color="#ea580c" />;
      default: return <AlertCircle size={16} color="var(--slate)" />;
    }
  };

  const getStatusBadge = (status: string) => {
    let bg = 'var(--linen)', text = 'var(--copper-bronze)', border = 'var(--silk)';
    if (status === 'OPEN') { bg = 'rgba(239, 68, 68, 0.1)'; text = '#dc2626'; border = 'rgba(239, 68, 68, 0.2)'; }
    if (status === 'PENDING_APPROVAL') { bg = 'rgba(234, 179, 8, 0.1)'; text = '#ca8a04'; border = 'rgba(234, 179, 8, 0.2)'; }
    if (status === 'CLOSED') { bg = 'rgba(34, 197, 94, 0.1)'; text = '#16a34a'; border = 'rgba(34, 197, 94, 0.2)'; }
    if (status === 'ESCALATED') { bg = 'rgba(249, 115, 22, 0.1)'; text = '#ea580c'; border = 'rgba(249, 115, 22, 0.2)'; }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', background: bg, color: text, border: `1px solid ${border}`
      }}>
        {getStatusIcon(status)}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const openModal = (nc: LpaNcResponse) => {
    setSelectedNc(nc);
    setCorrectiveAction(nc.correctiveAction || '');
    setAssignedActionOwner(nc.assignedActionOwner || '');
    setApprovedBy(nc.approvedBy || '');
    setEvidenceUrl(nc.evidenceFileUrl || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await lpaApi.uploadFile(file);
      setEvidenceUrl(res.data);
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (newStatus?: string) => {
    if (!selectedNc) return;
    setSaving(true);
    try {
      const statusToSave = newStatus || selectedNc.actionStatus;
      await lpaApi.updateNcAction(selectedNc.answerId, {
        correctiveAction,
        assignedActionOwner,
        approvedBy,
        evidenceFileUrl: evidenceUrl,
        actionStatus: statusToSave
      });
      setSelectedNc(null);
      fetchNcs();
    } catch (e) {
      alert("Failed to save NC updates");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
        <Loader2 size={32} color="var(--copper-bronze)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--silk)' }}>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Auditor</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target & Question</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {ncs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--ash)', fontSize: 14 }}>No Non-Conformances found!</td>
              </tr>
            ) : (
              ncs.map(nc => (
                <tr key={nc.answerId} style={{ borderBottom: '1px solid var(--silk)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{new Date(nc.auditDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--ash)' }}>{nc.auditedByName}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{nc.targetName}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{nc.questionText}</div>
                    {(nc.correctiveAction || nc.evidenceFileUrl || nc.approvedBy) && (
                      <div style={{ marginTop: 10, padding: 10, background: 'var(--cream)', borderRadius: 6, border: '1px solid #fca5a5' }}>
                        {nc.correctiveAction && <div style={{ fontSize: 11, color: 'var(--charcoal)', marginBottom: 4 }}><strong>Action Taken:</strong> {nc.correctiveAction}</div>}
                        {nc.approvedBy && <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 4 }}><strong>Approved By:</strong> {nc.approvedBy}</div>}
                        {nc.evidenceFileUrl && (
                          <div style={{ marginTop: 6 }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPreviewFileUrl(getValidUrl(nc.evidenceFileUrl)); }} 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                            >
                              <Paperclip size={12} />
                              VIEW EVIDENCE
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {nc.targetClosureDate ? (
                      <span style={{
                        fontSize: 13, fontWeight: 500,
                        color: (new Date(nc.targetClosureDate) < new Date() && nc.actionStatus !== 'CLOSED') ? '#dc2626' : 'var(--slate)'
                      }}>
                        {new Date(nc.targetClosureDate).toLocaleDateString()}
                      </span>
                    ) : <span style={{ color: 'var(--ash)' }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getStatusBadge(nc.actionStatus)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button 
                      onClick={() => openModal(nc)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: 'transparent', color: 'var(--copper-bronze)', border: '1px solid var(--copper-bronze)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {nc.actionStatus === 'CLOSED' ? 'View / Edit' : 'Update'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedNc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(4px)', padding: 16
        }}>
          <div style={{
            background: 'var(--warm-white)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle color="var(--copper-bronze)" size={20} />
                Manage Action Item
              </h3>
              <button onClick={() => setSelectedNc(null)} style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--cream)', padding: 16, borderRadius: 12, border: '1px solid var(--silk)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase', marginBottom: 4 }}>Defect Found</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 8 }}>{selectedNc.questionText}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>Target: {selectedNc.targetName}</div>
                {selectedNc.remarks && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8, fontWeight: 600 }}>Remarks: {selectedNc.remarks}</div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>Assigned To (Owner)</label>
                  <input 
                    type="text" 
                    value={assignedActionOwner} 
                    onChange={e => setAssignedActionOwner(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid var(--silk)',
                      borderRadius: 8, fontSize: 13, color: 'var(--charcoal)', outline: 'none', boxSizing: 'border-box'
                    }}
                    placeholder="E.g., John Smith"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>Approved / Closed By</label>
                  <input 
                    type="text" 
                    value={approvedBy} 
                    onChange={e => setApprovedBy(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid var(--silk)',
                      borderRadius: 8, fontSize: 13, color: 'var(--charcoal)', outline: 'none', boxSizing: 'border-box'
                    }}
                    placeholder="E.g., Jane Doe (Quality Manager)"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>Corrective Action Taken</label>
                  <textarea 
                    value={correctiveAction} 
                    onChange={e => setCorrectiveAction(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid var(--silk)',
                      borderRadius: 8, fontSize: 13, color: 'var(--charcoal)', outline: 'none', boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                    placeholder="Describe how the issue was resolved..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>Evidence (Photo / PDF)</label>
                  {evidenceUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 8 }}>
                      <CheckCircle2 size={20} color="#16a34a" />
                      <button 
                        onClick={(e) => { e.preventDefault(); setPreviewFileUrl(getValidUrl(evidenceUrl)); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#15803d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        <FileText size={16} />
                        View Attached Evidence
                      </button>
                      <button onClick={() => setEvidenceUrl('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: 24, border: '2px dashed var(--silk)', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--cream)', transition: 'background 0.15s'
                    }}>
                      {uploading ? (
                        <Loader2 size={24} color="var(--ash)" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          <UploadCloud size={24} color="var(--ash)" style={{ marginBottom: 8 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>Click to upload evidence file</span>
                        </>
                      )}
                      <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf" disabled={uploading} />
                    </label>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>Approved By (Supervisor)</label>
                  <input 
                    type="text" 
                    value={approvedBy} 
                    onChange={e => setApprovedBy(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid var(--silk)',
                      borderRadius: 8, fontSize: 13, color: 'var(--charcoal)', outline: 'none', boxSizing: 'border-box'
                    }}
                    placeholder="Supervisor Name"
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--silk)', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setSelectedNc(null)}
                style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--slate)', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              
              <button 
                onClick={() => handleSave('PENDING_APPROVAL')}
                disabled={saving}
                style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#eab308', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Submit for Approval
              </button>

              <button 
                onClick={() => handleSave('CLOSED')}
                disabled={saving}
                style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Approve & Close
              </button>
            </div>
          </div>
        </div>
      )}
      {previewFileUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: 24
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1000, height: '85vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--silk)', background: 'var(--warm-white)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--charcoal)' }}>
                <Paperclip size={18} color="var(--copper-bronze)" />
                Evidence Preview
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a href={previewFileUrl} download style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', textDecoration: 'none', background: 'var(--cream)', width: 32, height: 32, borderRadius: 6, border: '1px solid var(--silk)', transition: 'all 0.15s' }}>
                  <Download size={16} />
                </a>
                <a href={previewFileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', textDecoration: 'none', background: 'var(--cream)', width: 32, height: 32, borderRadius: 6, border: '1px solid var(--silk)', transition: 'all 0.15s' }}>
                  <ArrowUpRight size={16} />
                </a>
                <div style={{ width: 1, height: 24, background: 'var(--silk)', margin: '0 4px' }} />
                <button onClick={() => setPreviewFileUrl(null)} style={{ background: 'var(--dust)', border: 'none', cursor: 'pointer', color: '#fff', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
              {previewFileUrl.toLowerCase().endsWith('.pdf') ? (
                (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))) ? (
                  <PdfPreviewer url={previewFileUrl} />
                ) : (
                  <iframe src={`${previewFileUrl}#toolbar=0&navpanes=0`} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }} title="PDF Preview">
                    <p style={{ padding: 20, textAlign: 'center' }}>Your device does not support inline PDFs. <a href={previewFileUrl} download style={{ color: '#2563eb', textDecoration: 'underline' }}>Download PDF</a></p>
                  </iframe>
                )
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <img src={previewFileUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
