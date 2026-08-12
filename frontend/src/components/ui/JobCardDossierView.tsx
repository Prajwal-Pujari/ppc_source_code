import { useQuery } from '@tanstack/react-query';
import { getGauge, getGaugeOperations, getGaugeNcRecords } from '@/api/gauges.api';
import { JobCardPrintableView } from './JobCardPrintableView';

export function JobCardDossierView({ gaugeId }: { gaugeId: string }) {
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

  const { data: gaugeData } = useQuery({ 
    queryKey: ['gauge', gaugeId], 
    queryFn: () => getGauge(gaugeId) 
  });
  
  const { data: opsData } = useQuery({ 
    queryKey: ['gauge-ops', gaugeId], 
    queryFn: () => getGaugeOperations(gaugeId), 
    enabled: !!gaugeData?.data 
  });
  
  const { data: ncData } = useQuery({ 
    queryKey: ['gauge-nc', gaugeId], 
    queryFn: () => getGaugeNcRecords(gaugeId), 
    enabled: !!gaugeData?.data 
  });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  const ncRecords = ncData?.data || [];

  if (!gauge) return null;

  return (
    <JobCardPrintableView 
      gauge={gauge}
      ops={ops}
      ncRecords={ncRecords}
      baseUrl={baseUrl}
    />
  );
}
