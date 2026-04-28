import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/api/customers.api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function CustomerMasterPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { setPageTitle('Customers'); }, [setPageTitle]);

  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers({ size: 50 }) });
  const customers = data?.data?.content || [];

  const createMut = useMutation({
    mutationFn: (d: any) => createCustomer(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); setEditing(null); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => updateCustomer(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const d = { name: fd.get('name'), gstNumber: fd.get('gstNumber'), address: fd.get('address'), contactPerson: fd.get('contactPerson'), email: fd.get('email'), phone: fd.get('phone') };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>All Customers</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add Customer
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
            {editing ? 'Edit Customer' : 'New Customer'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Company Name *</label>
                <input className="input" name="name" defaultValue={editing?.name || ''} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>GST Number</label>
                <input className="input font-mono" name="gstNumber" defaultValue={editing?.gstNumber || ''} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Contact Person</label>
                <input className="input" name="contactPerson" defaultValue={editing?.contactPerson || ''} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Phone</label>
                <input className="input font-mono" name="phone" defaultValue={editing?.phone || ''} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Email</label>
                <input className="input" name="email" type="email" defaultValue={editing?.email || ''} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Address</label>
                <input className="input" name="address" defaultValue={editing?.address || ''} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>GST Number</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>))}</tr>
              ))
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No customers found</td></tr>
            ) : (
              customers.map((c: any) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{c.name}</td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{c.gstNumber || '—'}</td>
                  <td>{c.contactPerson || '—'}</td>
                  <td style={{ fontSize: 13 }}>{c.email || '—'}</td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditing(c); setShowForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)' }}><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this customer?')) deleteMut.mutate(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }}><Trash2 size={14} /></button>
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
