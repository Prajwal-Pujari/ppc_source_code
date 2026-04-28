import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { getPurchaseOrders } from '@/api/purchase-orders.api';
import { Plus } from 'lucide-react';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-pending',
  CONFIRMED: 'badge-queued',
  IN_PROGRESS: 'badge-in-progress',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-rejected',
};

const priorityStyle: Record<string, { color: string }> = {
  NORMAL: { color: 'var(--priority-normal)' },
  HIGH: { color: 'var(--priority-high)' },
  URGENT: { color: 'var(--priority-urgent)' },
};

export default function PurchaseOrderListPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const navigate = useNavigate();

  useEffect(() => { setPageTitle('Purchase Orders'); }, [setPageTitle]);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => getPurchaseOrders({ size: 50 }),
  });

  const orders = data?.data?.content || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>All Orders</h2>
        <button className="btn btn-primary" onClick={() => navigate('/purchase-orders/new')}>
          <Plus size={16} style={{ marginRight: 6 }} /> New PO
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Customer</th>
              <th>Order Date</th>
              <th>Delivery</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Gauges</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>
                  No purchase orders found
                </td>
              </tr>
            ) : (
              orders.map((po: any) => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)' }}>
                    {po.poNumber}
                  </td>
                  <td>{po.customerName || '—'}</td>
                  <td className="font-mono" style={{ fontSize: 13 }}>{po.orderDate}</td>
                  <td className="font-mono" style={{ fontSize: 13 }}>{po.expectedDeliveryDate || '—'}</td>
                  <td>
                    <span style={{
                      fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.05em', ...priorityStyle[po.priority],
                    }}>
                      {po.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[po.status] || 'badge-pending'}`}>
                      {po.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="font-mono">{po.status === 'DRAFT' ? '—' : po.totalGauges}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, flex: 1, borderRadius: 3,
                        background: 'var(--silk)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: 'var(--status-completed)',
                          width: po.totalGauges > 0 ? `${(po.completedGauges / po.totalGauges) * 100}%` : '0%',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--ash)', minWidth: 40 }}>
                        {po.completedGauges}/{po.status === 'DRAFT' ? '—' : po.totalGauges}
                      </span>
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
