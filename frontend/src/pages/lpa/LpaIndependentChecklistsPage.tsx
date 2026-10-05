import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lpaApi } from '@/api/lpa.api';
import type { LpaAuditType, LpaQuestionSet } from '@/api/lpa.api';
import { ShieldAlert, Box, Plus } from 'lucide-react';
import { ManageIndependentChecklistModal } from '@/components/ui/ManageIndependentChecklistModal';

export function LpaIndependentChecklistsPage({ auditType }: { auditType: 'SYSTEM_AUDIT' | 'SUPPLIER_AUDIT' }) {
  const isSystem = auditType === 'SYSTEM_AUDIT';

  // State
  const [questionSets, setQuestionSets] = useState<LpaQuestionSet[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);

  // Fetch Data
  const { data: qsData, refetch } = useQuery({
    queryKey: ['lpa-question-sets'],
    queryFn: () => lpaApi.getQuestionSets(),
  });

  useEffect(() => {
    const list = Array.isArray(qsData) ? qsData : (qsData as any)?.data || [];
    setQuestionSets(list.filter((qs: LpaQuestionSet) => qs.auditType === auditType));
  }, [qsData, auditType]);

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSystem ? <ShieldAlert className="text-[var(--copper-bronze)]" size={24} /> : <Box className="text-[var(--copper-bronze)]" size={24} />}
            {isSystem ? 'System Audit Checklists' : 'Supplier Audit Checklists'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4 }}>
            {isSystem ? 'Manage plant-wide system audit templates and checkpoints.' : 'Manage supplier evaluation and audit templates.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowManageModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
              color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(184,115,51,0.25)', transition: 'all 0.15s',
            }}
          >
            <Plus size={18} /> Manage {isSystem ? 'System Checklists' : 'Supplier Checklists'}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--warm-white)', borderRadius: 12, border: '1px solid var(--silk)', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {questionSets.map(qs => (
            <div key={qs.id} style={{
              padding: '16px 20px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--silk)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                  {qs.auditType.replace('_', ' ')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ash)', fontFamily: 'monospace' }}>
                  {qs.defaultFrequency || 'MONTHLY'}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--charcoal)', marginTop: 4 }}>{qs.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate)', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span>{qs.questions?.length || 0} checkpoints</span>
              </div>
            </div>
          ))}
          {questionSets.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ash)', fontSize: 14, gridColumn: '1 / -1' }}>
              No checklists found for this category. Click 'Manage' above to create one.
            </div>
          )}
        </div>
      </div>
      
      {showManageModal && (
        <ManageIndependentChecklistModal
          auditType={auditType}
          questionSets={questionSets}
          onClose={() => setShowManageModal(false)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
