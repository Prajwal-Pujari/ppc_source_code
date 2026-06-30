import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGauges, updateGauge } from '@/api/gauges.api';
import { getUsersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Search, CheckCircle, Clock, FileText, CheckCheck, X, ShieldCheck, UserCheck, Building2, CheckSquare, Square, AlertTriangle, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CalibrationApprovalPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGaugeIds, setSelectedGaugeIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Signature customization inputs for modal
  const [calibratorSignInput, setCalibratorSignInput] = useState('');
  const [calibratorNameInput, setCalibratorNameInput] = useState('');
  const [adminSignInput, setAdminSignInput] = useState('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Fetch Gauges
  const { data: gaugesRes, isLoading } = useQuery({
    queryKey: ['gauges-approval'],
    queryFn: () => getGauges({ size: 500 })
  });

  // Fetch Users (to get calibrators)
  const { data: usersRes } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => getUsersApi()
  });

  const allGauges = gaugesRes?.data?.content || [];
  const allUsers = usersRes?.data || [];
  const calibrationWorkers = allUsers.filter((u: any) => u.isCalibrationWorker || u.role === 'WORKER');

  // Filter Gauges relevant to calibration approval
  const relevantGauges = useMemo(() => {
    return allGauges.filter((g: any) => {
      const matchesSearch = !searchQuery || 
        g.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.purchaseOrder?.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.purchaseOrder?.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.gaugeTypeName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allGauges, searchQuery]);

  const pendingGauges = useMemo(() => {
    return relevantGauges.filter((g: any) => {
      if (g.isCalibrationApproved) return false;
      // Show only if calibration data entry & operation are completed
      return Boolean(g.calibratorName || g.calibratorSign || g.status === 'COMPLETED' || g.status === 'DISPATCH_READY' || g.status === 'READY_FOR_DISPATCH');
    });
  }, [relevantGauges]);

  const approvedGauges = useMemo(() => {
    return relevantGauges.filter((g: any) => g.isCalibrationApproved);
  }, [relevantGauges]);

  const displayedGauges = activeTab === 'pending' ? pendingGauges : approvedGauges;

  // Group displayed gauges by Customer and Work Order
  const groupedGauges = useMemo(() => {
    const groups: Record<string, { customerName: string; woNumber: string; gauges: any[] }> = {};
    displayedGauges.forEach((g: any) => {
      const custName = g.purchaseOrder?.customerName || g.purchaseOrder?.customer?.name || 'Standard / Stock Orders';
      const woNum = g.purchaseOrder?.poNumber || 'General Work Order';
      const key = `${custName}___${woNum}`;
      if (!groups[key]) {
        groups[key] = { customerName: custName, woNumber: woNum, gauges: [] };
      }
      groups[key].gauges.push(g);
    });
    return groups;
  }, [displayedGauges]);

  const handleTabChange = (tab: 'pending' | 'approved') => {
    setActiveTab(tab);
    setSelectedGaugeIds([]);
  };

  const toggleSelectGauge = (id: string) => {
    setSelectedGaugeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectGroup = (gaugesInGroup: any[]) => {
    const groupIds = gaugesInGroup.map(g => g.id);
    const allSelected = groupIds.every(id => selectedGaugeIds.includes(id));
    if (allSelected) {
      setSelectedGaugeIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedGaugeIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleOpenApprovalModal = (gaugeIdsToApprove: string[]) => {
    if (gaugeIdsToApprove.length === 0) return;
    setSelectedGaugeIds(gaugeIdsToApprove);

    // Set defaults from first selected gauge or user store
    const firstGauge = allGauges.find((g: any) => g.id === gaugeIdsToApprove[0]);
    const matchingWorker = allUsers.find((u: any) => u.fullName === firstGauge?.calibratorName) || allUsers.find((u: any) => (u.isCalibrationWorker || u.role === 'WORKER') && u.signatureUrl) || calibrationWorkers[0] || allUsers[0];
    const matchingAdmin = allUsers.find((u: any) => (u.id === currentUser?.id || u.role === 'ADMIN' || u.fullName === 'System Administrator') && u.signatureUrl) || allUsers.find((u: any) => u.id === currentUser?.id || u.role === 'ADMIN') || currentUser;

    setCalibratorNameInput(firstGauge?.calibratorName || matchingWorker?.fullName || 'Quality Inspector');
    setCalibratorSignInput(firstGauge?.calibratorSign || (matchingWorker as any)?.signatureUrl || matchingWorker?.fullName || 'Certified Calibrator');
    setAdminSignInput(firstGauge?.approvedByAdminSign || (matchingAdmin as any)?.signatureUrl || (matchingAdmin as any)?.fullName || 'Admin Manager');

    setIsConfirmModalOpen(true);
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; updates: Record<string, any> }) => {
      return await Promise.all(payload.ids.map(id => updateGauge(id, payload.updates)));
    },
    onSuccess: (_, variables) => {
      addNotification('Success', `Successfully approved and digitally signed ${variables.ids.length} calibration report(s)!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['gauges-approval'] });
      setIsConfirmModalOpen(false);
      setSelectedGaugeIds([]);
    },
    onError: (err: any) => {
      addNotification('Error', err?.response?.data?.message || 'Failed to complete approval process', 'error');
    }
  });

  const handleConfirmApproval = () => {
    if (selectedGaugeIds.length === 0) return;
    bulkApproveMutation.mutate({
      ids: selectedGaugeIds,
      updates: {
        isCalibrationApproved: true,
        approvedByAdminName: currentUser?.fullName || 'Admin Manager',
        approvedByAdminSign: adminSignInput,
        calibratorName: calibratorNameInput,
        calibratorSign: calibratorSignInput
      }
    });
  };

  const selectedGaugesList = useMemo(() => {
    return allGauges.filter((g: any) => selectedGaugeIds.includes(g.id));
  }, [allGauges, selectedGaugeIds]);

  return (
    <div style={{ padding: 32, maxWidth: 1350, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={28} color="var(--copper-dark)" />
            Customer Calibration Report Approvals
          </h1>
          <p style={{ margin: 0, color: 'var(--slate)', fontSize: 14 }}>
            Review completed calibration observations grouped by Customer & Work Order. Digitally sign single or multiple reports.
          </p>
        </div>

        {activeTab === 'pending' && selectedGaugeIds.length > 0 && (
          <button
            onClick={() => handleOpenApprovalModal(selectedGaugeIds)}
            className="btn btn-primary"
            style={{ background: '#3A6B4A', borderColor: '#3A6B4A', padding: '10px 24px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(58, 107, 74, 0.3)' }}
          >
            <CheckCheck size={18} /> Approve Selected ({selectedGaugeIds.length})
          </button>
        )}
      </div>

      {/* Stats Bar (Two Pages/Tabs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 28 }}>
        <div 
          onClick={() => handleTabChange('pending')}
          style={{ 
            background: activeTab === 'pending' ? 'var(--copper-light)' : 'white',
            border: `2px solid ${activeTab === 'pending' ? 'var(--copper-dark)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Admin Sign & Approval</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', marginTop: 4 }}>{pendingGauges.length}</div>
            <div style={{ fontSize: 12, color: 'var(--copper-dark)', marginTop: 4, fontWeight: 500 }}>Select reports below to verify and sign</div>
          </div>
          <Clock size={40} color="var(--copper-dark)" opacity={0.8} />
        </div>

        <div 
          onClick={() => handleTabChange('approved')}
          style={{ 
            background: activeTab === 'approved' ? '#EBF4EE' : 'white',
            border: `2px solid ${activeTab === 'approved' ? '#3A6B4A' : 'var(--border)'}`,
            borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3A6B4A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved & Certified Reports</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1C1A18', marginTop: 4 }}>{approvedGauges.length}</div>
            <div style={{ fontSize: 12, color: '#3A6B4A', marginTop: 4, fontWeight: 500 }}>Ready for final printing and dispatch</div>
          </div>
          <CheckCircle size={40} color="#3A6B4A" opacity={0.8} />
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--slate)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 42, width: '100%', height: 42, fontSize: 14 }}
            placeholder="Search by Customer Name, Work Order Number, Gauge Sr No, or Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="btn" style={{ padding: '8px 16px', fontSize: 13 }}>Clear Search</button>
        )}
      </div>

      {/* Grouped Gauge Lists */}
      {isLoading ? (
        <div style={{ background: 'white', padding: 60, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)', color: 'var(--slate)' }}>
          Loading customer calibration data...
        </div>
      ) : Object.keys(groupedGauges).length === 0 ? (
        <div style={{ background: 'white', padding: 60, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
          <Building2 size={48} color="var(--slate)" style={{ opacity: 0.4, margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--charcoal)', fontSize: 18 }}>No calibration reports found</h3>
          <p style={{ margin: 0, color: 'var(--slate)', fontSize: 14 }}>
            There are currently no gauges in the {activeTab === 'pending' ? 'Pending Approval' : 'Approved'} tab matching your criteria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedGauges).map(([groupKey, group]) => {
            const groupIds = group.gauges.map(g => g.id);
            const selectedInGroup = group.gauges.filter(g => selectedGaugeIds.includes(g.id));
            const isAllGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedGaugeIds.includes(id));
            const isSomeGroupSelected = selectedInGroup.length > 0;

            return (
              <div key={groupKey} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                {/* Customer Group Header */}
                <div style={{ background: 'var(--bone-white)', padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {activeTab === 'pending' && (
                      <button
                        type="button"
                        onClick={() => toggleSelectGroup(group.gauges)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: isAllGroupSelected ? '#3A6B4A' : 'var(--slate)' }}
                        title={isAllGroupSelected ? "Deselect entire group" : "Select all in this work order"}
                      >
                        {isAllGroupSelected ? <CheckSquare size={20} color="#3A6B4A" /> : isSomeGroupSelected ? <CheckSquare size={20} opacity={0.5} /> : <Square size={20} />}
                      </button>
                    )}
                    <Building2 size={22} color="var(--copper-dark)" />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {group.customerName}
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: '#E6E1DA', color: 'var(--charcoal)' }}>
                          WO: {group.woNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
                      {group.gauges.length} Gauge{group.gauges.length > 1 ? 's' : ''}
                    </span>
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => handleOpenApprovalModal(selectedInGroup.length > 0 ? selectedInGroup.map(g => g.id) : groupIds)}
                        className="btn"
                        style={{ padding: '6px 14px', fontSize: 12, background: selectedInGroup.length > 0 ? '#3A6B4A' : 'var(--charcoal)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <CheckCheck size={14} /> {selectedInGroup.length > 0 ? `Approve Selected (${selectedInGroup.length})` : `Approve Work Order (${group.gauges.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Table of Gauges under this Customer */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFAF8', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>
                      {activeTab === 'pending' && <th style={{ padding: '12px 16px', width: 48, textAlign: 'center' }}>Select</th>}
                      <th style={{ padding: '12px 20px', textAlign: 'left' }}>Gauge ID / Sr No</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left' }}>Specification</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left' }}>Mfg No / Item</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left' }}>Sign Status</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.gauges.map((gauge: any) => {
                      const isSelected = selectedGaugeIds.includes(gauge.id);
                      return (
                        <tr key={gauge.id} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? '#F2F8F4' : 'transparent', transition: 'background 0.15s' }}>
                          {activeTab === 'pending' && (
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toggleSelectGauge(gauge.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {isSelected ? <CheckSquare size={18} color="#3A6B4A" /> : <Square size={18} color="var(--slate)" />}
                              </button>
                            </td>
                          )}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--charcoal)', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
                              {gauge.serialNumber}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>{gauge.gaugeTypeName}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--charcoal)' }}>{gauge.nominalSize} {gauge.sizeUnit}</span>
                            <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{gauge.materialGrade || 'Standard Material'}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>
                              {gauge.manufactureNumber || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>Item #{gauge.itemNumber || '1'}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {gauge.isCalibrationApproved ? (
                              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#EBF4EE', color: '#3A6B4A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCheck size={12} /> Signed by {gauge.approvedByAdminName || 'Admin'}
                              </span>
                            ) : (
                              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: 'var(--copper-light)', color: 'var(--copper-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> Pending Admin Sign
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => navigate(`/calibration-report/${gauge.id}`)}
                                className="btn" 
                                style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bone-white)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <FileText size={13} /> View Data
                              </button>
                              {!gauge.isCalibrationApproved ? (
                                <button
                                  onClick={() => handleOpenApprovalModal([gauge.id])}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <ShieldCheck size={13} /> Review & Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => navigate(`/print/po/${gauge.purchaseOrder?.id || gauge.id}/calibration`)}
                                  className="btn"
                                  style={{ padding: '6px 12px', fontSize: 12, background: '#EBF4EE', color: '#3A6B4A', border: '1px solid #3A6B4A', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Printer size={13} /> Certificate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Pop-up Modal */}
      {isConfirmModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EBF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={26} color="#3A6B4A" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--charcoal)' }}>Confirm Digital Sign & Approval</h3>
                  <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>You are about to certify <b style={{ color: '#3A6B4A' }}>{selectedGaugeIds.length}</b> gauge calibration report(s)</div>
                </div>
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={22} /></button>
            </div>

            {/* Warning Alert */}
            <div style={{ background: '#FFFDF0', border: '1px solid #FFE58F', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#D48806" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: '#5C3D00', lineHeight: 1.4 }}>
                <b>Please double check before confirming:</b> Approving these reports applies your digital signature and certifies that all measurements conform to customer specification standards.
              </div>
            </div>

            {/* Selected Gauges List Summary */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 8 }}>
                Selected Reports for Certification ({selectedGaugesList.length})
              </label>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bone-white)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#E6E1DA', textAlign: 'left', fontWeight: 700, color: 'var(--charcoal)' }}>
                      <th style={{ padding: '8px 12px' }}>Sr No</th>
                      <th style={{ padding: '8px 12px' }}>Customer / WO</th>
                      <th style={{ padding: '8px 12px' }}>Specification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGaugesList.map((g: any) => (
                      <tr key={g.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{g.serialNumber}</td>
                        <td style={{ padding: '8px 12px' }}>{g.purchaseOrder?.customerName || '—'} ({g.purchaseOrder?.poNumber || '—'})</td>
                        <td style={{ padding: '8px 12px' }}>{g.nominalSize} {g.sizeUnit} ({g.gaugeTypeName})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures Review & Input */}
            <div className="grid-2-cols-tablet" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {/* Calibrator Selection */}
              <div style={{ background: '#FAFAF8', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={15} color="var(--copper-dark)" /> Calibrator Signature Details
                  </span>
                </label>
                
                <select
                  className="input"
                  style={{ fontSize: 13, marginBottom: 8, width: '100%', background: 'white' }}
                  value={allUsers.find((u: any) => u.fullName === calibratorNameInput)?.id || ''}
                  onChange={(e) => {
                    const selUser = allUsers.find((u: any) => u.id === e.target.value);
                    if (selUser) {
                      setCalibratorNameInput(selUser.fullName);
                      setCalibratorSignInput(selUser.signatureUrl || selUser.fullName);
                    }
                  }}
                >
                  <option value="">-- Select Calibrator / Worker --</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} {u.signatureUrl ? '(✓ Signed)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  className="input"
                  value={calibratorNameInput}
                  onChange={(e) => setCalibratorNameInput(e.target.value)}
                  placeholder="Calibrator Full Name"
                  style={{ fontSize: 13, marginBottom: 8, width: '100%' }}
                />

                {calibratorSignInput.startsWith('data:image') || calibratorSignInput.startsWith('http') ? (
                  <div style={{ padding: 8, background: 'white', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img src={calibratorSignInput} alt="Calibrator Sign" style={{ height: 32, maxWidth: 140, objectFit: 'contain' }} />
                    <span style={{ fontSize: 11, color: '#3A6B4A', fontWeight: 700 }}>✓ Digital Image Attached</span>
                  </div>
                ) : (
                  <input
                    className="input"
                    value={calibratorSignInput}
                    onChange={(e) => setCalibratorSignInput(e.target.value)}
                    placeholder="Sign / Title"
                    style={{ fontSize: 13, width: '100%' }}
                  />
                )}
              </div>

              {/* Admin Selection */}
              <div style={{ background: '#FAFAF8', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} color="#3A6B4A" /> Admin Authorization Signature
                  </span>
                </label>

                <select
                  className="input"
                  style={{ fontSize: 13, marginBottom: 8, width: '100%', background: 'white' }}
                  value={allUsers.find((u: any) => u.signatureUrl === adminSignInput || u.fullName === adminSignInput)?.id || ''}
                  onChange={(e) => {
                    const selUser = allUsers.find((u: any) => u.id === e.target.value);
                    if (selUser) {
                      setAdminSignInput(selUser.signatureUrl || selUser.fullName);
                    }
                  }}
                >
                  <option value="">-- Select Admin / Approver --</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role}) {u.signatureUrl ? '(✓ Signed)' : ''}
                    </option>
                  ))}
                </select>

                {adminSignInput.startsWith('data:image') || adminSignInput.startsWith('http') ? (
                  <div style={{ padding: 8, background: 'white', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <img src={adminSignInput} alt="Admin Sign" style={{ height: 32, maxWidth: 140, objectFit: 'contain' }} />
                    <span style={{ fontSize: 11, color: '#3A6B4A', fontWeight: 700 }}>✓ Digital Image Attached</span>
                  </div>
                ) : (
                  <input
                    className="input"
                    value={adminSignInput}
                    onChange={(e) => setAdminSignInput(e.target.value)}
                    placeholder="Admin Signature / Title"
                    style={{ fontSize: 13, marginBottom: 8, width: '100%' }}
                  />
                )}
                <div style={{ fontSize: 11, color: 'var(--slate)', fontStyle: 'italic' }}>
                  * Applies to all {selectedGaugeIds.length} selected certificates.
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={bulkApproveMutation.isPending}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmApproval}
                disabled={bulkApproveMutation.isPending}
                style={{ background: '#3A6B4A', borderColor: '#3A6B4A', padding: '10px 24px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <CheckCheck size={18} /> {bulkApproveMutation.isPending ? 'Confirming & Signing...' : `Confirm Approval (${selectedGaugeIds.length} Reports)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
