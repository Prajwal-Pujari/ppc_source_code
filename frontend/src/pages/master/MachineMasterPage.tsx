import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Search, Target, Monitor } from 'lucide-react';
import { machinesApi, type MachineMaster } from '@/api/machines.api';
import toast from 'react-hot-toast';

export default function MachineMasterPage() {
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineMaster | null>(null);

  const [formData, setFormData] = useState({
    machineName: '',
    machineCode: '',
    department: '',
  });

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await machinesApi.getAll();
      setMachines(res.data);
    } catch (error) {
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (machine?: MachineMaster) => {
    if (machine) {
      setEditingMachine(machine);
      setFormData({
        machineName: machine.machineName,
        machineCode: machine.machineCode,
        department: machine.department || '',
      });
    } else {
      setEditingMachine(null);
      setFormData({ machineName: '', machineCode: '', department: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machineName || !formData.machineCode) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingMachine && editingMachine.id) {
        await machinesApi.update(editingMachine.id, formData as MachineMaster);
        toast.success('Machine updated');
      } else {
        await machinesApi.create(formData as MachineMaster);
        toast.success('Machine created');
      }
      setIsModalOpen(false);
      fetchMachines();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save machine');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    try {
      await machinesApi.delete(id);
      toast.success('Machine deleted');
      fetchMachines();
    } catch (error) {
      toast.error('Failed to delete machine');
    }
  };

  const filteredMachines = machines.filter(m => 
    m.machineName.toLowerCase().includes(search.toLowerCase()) || 
    m.machineCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* ─── Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Machine Master</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            Manage factory machines & equipment
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} color="var(--ash)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 32, minHeight: 36, fontSize: 13 }}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary"
            style={{ fontSize: 13, minHeight: 36, padding: '0 16px' }}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> Add Machine
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Machine Name</th>
              <th>Code</th>
              <th>Department</th>
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>Loading machines...</td></tr>
            ) : filteredMachines.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Monitor size={32} style={{ opacity: 0.2 }} />
                    <p>No machines found</p>
                  </div>
                </td>
              </tr>
            ) : filteredMachines.map((machine) => (
              <tr key={machine.id}>
                <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,105,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Monitor size={14} color="var(--copper-bronze)" />
                    </div>
                    {machine.machineName}
                  </div>
                </td>
                <td className="font-mono" style={{ fontSize: 13, color: 'var(--copper-bronze)' }}>
                  {machine.machineCode}
                </td>
                <td style={{ color: 'var(--slate)' }}>{machine.department || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => handleOpenModal(machine)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(machine.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Modal ─── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(28,26,24,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--silk)', background: 'var(--bone-white)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Monitor size={18} color="var(--copper-bronze)" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>
                {editingMachine ? 'Edit Machine' : 'Add Machine'}
              </h3>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Machine Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.machineName}
                  onChange={e => setFormData({...formData, machineName: e.target.value})}
                  className="input"
                  placeholder="e.g. CNC Lathe 01"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Machine Code <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.machineCode}
                  onChange={e => setFormData({...formData, machineCode: e.target.value})}
                  className="input input-mono"
                  style={{ textTransform: 'uppercase' }}
                  placeholder="e.g. CNC-01"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  className="input"
                  placeholder="e.g. Turning, Milling"
                />
              </div>

              <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--silk)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMachine ? 'Update Machine' : 'Create Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
