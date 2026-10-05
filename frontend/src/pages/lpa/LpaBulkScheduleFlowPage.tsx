import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LpaBulkScheduleFlow } from './LpaBulkScheduleFlow';

export function LpaBulkScheduleFlowPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: 'calc(100vh - 64px)', margin: '-24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <LpaBulkScheduleFlow 
        onClose={() => navigate('/lpa/schedules')} 
        onSaved={() => navigate('/lpa/schedules')} 
      />
    </div>
  );
}
