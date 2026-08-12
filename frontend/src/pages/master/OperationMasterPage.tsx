import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getOperationMasters, createOperationMaster, updateOperationMaster, deleteOperationMaster } from '@/api/operation-master.api';
import { Plus, Edit2, Trash2, ExternalLink, Search } from 'lucide-react';

export default function OperationMasterPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { setPageTitle('Operations Master'); }, [setPageTitle]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading } = useQuery({ 
    queryKey: ['operation-masters', debouncedSearch], 
    queryFn: () => getOperationMasters({ size: 50, search: debouncedSearch }) 
  });
  const operations = data?.data?.content || [];

  const createMut = useMutation({
    mutationFn: (d: any) => createOperationMaster(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operation-masters'] }); setShowForm(false); setEditing(null); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => updateOperationMaster(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operation-masters'] }); setShowForm(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOperationMaster(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operation-masters'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const d = {
      operationName: fd.get('operationName'),
      operationCode: fd.get('operationCode'),
      department: fd.get('department'),
      skillLevel: fd.get('skillLevel'),
      instructions: fd.get('instructions'),
      isOutsourced: fd.get('isOutsourced') === 'on',
    };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>All Operations</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--ash)" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Search operation name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: 250, padding: '8px 12px 8px 36px',
                borderRadius: 6, border: '1px solid var(--stone)', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} style={{ marginRight: 6 }} /> Add Operation
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
            {editing ? 'Edit Operation' : 'New Operation'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Operation Name *</label>
                <input className="input" name="operationName" defaultValue={editing?.operationName || ''} required placeholder="e.g. Cutting" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Code *</label>
                <input className="input" name="operationCode" defaultValue={editing?.operationCode || ''} required placeholder="e.g. CUT" style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Department</label>
                <input className="input" name="department" defaultValue={editing?.department || ''} placeholder="e.g. Machining" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Skill Level</label>
                <select className="input" name="skillLevel" defaultValue={editing?.skillLevel || ''}>
                  <option value="">Select...</option>
                  <option>Basic</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Expert</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                <input type="checkbox" name="isOutsourced" id="isOutsourced" defaultChecked={editing?.isOutsourced || false} />
                <label htmlFor="isOutsourced" style={{ fontSize: 13, color: 'var(--slate)' }}>Outsourced Operation</label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Instructions</label>
                <textarea className="input" name="instructions" rows={2} defaultValue={editing?.instructions || ''} style={{ minHeight: 60, padding: '8px 12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th>Operation Name</th>
              <th>Code</th>
              <th>Department</th>
              <th>Skill Req.</th>
              <th>Outsourced</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>))}</tr>
              ))
            ) : operations.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No operations found</td></tr>
            ) : (
              operations.map((op: any) => (
                <tr key={op.id}>
                  <td>
                    {op.partMaster ? (
                      <div style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                        {op.partMaster.partNo}
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>{op.partMaster.partName}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--ash)' }}>Global</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{op.operationName}</td>
                  <td><span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)', fontFamily: 'JetBrains Mono, monospace' }}>{op.operationCode}</span></td>
                  <td>{op.department || '—'}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 500, color:
                        op.skillLevel === 'Expert' ? 'var(--status-rejected)' :
                        op.skillLevel === 'Advanced' ? 'var(--status-in-progress)' :
                        op.skillLevel === 'Intermediate' ? 'var(--status-pending)' : 'var(--ash)'
                    }}>{op.skillLevel || '—'}</span>
                  </td>
                  <td>
                    {op.isOutsourced ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--status-queued)' }}>
                        <ExternalLink size={12} /> Outsourced
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--status-completed)' }}>In-house</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditing(op); setShowForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)' }}><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this operation?')) deleteMut.mutate(op.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
