import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Clock, Check, X } from 'lucide-react';
import { shiftsApi, type FactoryShift } from '../../api/shifts.api';
import toast from 'react-hot-toast';

export default function PqcSettingsPage() {
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ shiftName: '', startTime: '', endTime: '' });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await shiftsApi.getAll();
      setShifts(res.data);
    } catch (error) {
      toast.error('Failed to load shifts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await shiftsApi.delete(id);
      toast.success('Shift removed');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to remove shift');
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.shiftName || !newShift.startTime || !newShift.endTime) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;
      await shiftsApi.create({
        shiftName: newShift.shiftName,
        startTime: formatTime(newShift.startTime),
        endTime: formatTime(newShift.endTime)
      });
      toast.success('Shift added successfully');
      setNewShift({ shiftName: '', startTime: '', endTime: '' });
      fetchShifts();
    } catch (error) {
      toast.error('Failed to add shift');
    }
  };

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      <div style={{ textAlign: 'center' }}>
        <h1 className="text-3xl font-light text-[var(--charcoal)] tracking-tight">Shift Management</h1>
        <p className="text-[var(--copper-bronze)] mt-2 font-mono text-sm">Configure standard operating shifts</p>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--copper-bronze)]" />
            <span className="font-semibold text-[var(--charcoal)]">Active Shifts</span>
          </div>
          <span className="badge badge-outline">{shifts.length} Configured</span>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--warm-white)] border-b border-[var(--linen)]">
              <th className="py-3 px-6 text-xs font-semibold text-[var(--charcoal)] uppercase tracking-wider w-1/3">Shift Name</th>
              <th className="py-3 px-6 text-xs font-semibold text-[var(--charcoal)] uppercase tracking-wider w-1/4">Start Time</th>
              <th className="py-3 px-6 text-xs font-semibold text-[var(--charcoal)] uppercase tracking-wider w-1/4">End Time</th>
              <th className="py-3 px-6 text-xs font-semibold text-[var(--charcoal)] uppercase tracking-wider w-1/6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--linen)]">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-[var(--ash)]">Loading shifts...</td></tr>
            ) : shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-[var(--warm-white)] transition-colors group">
                <td className="py-4 px-6 font-medium text-[var(--charcoal)]">{shift.shiftName}</td>
                <td className="py-4 px-6 font-mono text-[var(--copper-bronze)]">{shift.startTime.substring(0, 5)}</td>
                <td className="py-4 px-6 font-mono text-[var(--copper-bronze)]">{shift.endTime.substring(0, 5)}</td>
                <td className="py-4 px-6 text-right">
                  <button 
                    onClick={() => handleDelete(shift.id)}
                    className="p-1.5 text-[var(--ash)] hover:text-[#8B3A3A] hover:bg-[#F8EEEE] rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            
            {/* Inline Add Row */}
            <tr className="bg-[#FAF8F5]">
              <td className="py-3 px-4">
                <input
                  type="text"
                  value={newShift.shiftName}
                  onChange={(e) => setNewShift({...newShift, shiftName: e.target.value})}
                  className="form-input bg-white border-dashed text-sm focus:border-[var(--copper-bronze)]"
                  placeholder="New Shift Name..."
                />
              </td>
              <td className="py-3 px-4">
                <input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                  className="form-input bg-white border-dashed text-sm font-mono focus:border-[var(--copper-bronze)]"
                />
              </td>
              <td className="py-3 px-4">
                <input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                  className="form-input bg-white border-dashed text-sm font-mono focus:border-[var(--copper-bronze)]"
                />
              </td>
              <td className="py-3 px-4 text-right">
                <button 
                  onClick={handleAddShift}
                  disabled={!newShift.shiftName || !newShift.startTime || !newShift.endTime}
                  className="btn btn-primary py-1.5 px-3 text-sm flex items-center justify-center gap-1 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
