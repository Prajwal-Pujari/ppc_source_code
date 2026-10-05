import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, MarkerType, Handle, Position, useReactFlow, BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { Connection, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { lpaApi, type LpaQuestionSet } from '@/api/lpa.api';
import { getUsersApi } from '@/api/users.api';
import { X, Save, Layers, Trash2, Plus } from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.content && Array.isArray(res.content)) return res.content;
  return [];
};

const CustomChecklistNode = ({ data, id }: any) => {
  const { setNodes } = useReactFlow();

  const handleChecklistChange = (e: any) => {
    const qsId = e.target.value;
    const selectedQs = data.availableChecklists?.find((q: any) => q.id === qsId);
    const targetName = selectedQs ? (selectedQs.operationMaster?.operationName || selectedQs.machineMaster?.machineName || selectedQs.gaugeMaster?.gaugeName || 'General Facility') : '';
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, qs: selectedQs, label: selectedQs?.name, target: targetName } } : n));
  };

  const handleDelete = () => {
    setNodes((nds) => nds.filter(n => n.id !== id));
  };

  return (
    <div style={{ padding: '10px 15px', borderRadius: 8, background: '#fff', border: '2px solid var(--copper-bronze)', width: 220, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--copper-bronze)', width: 12, height: 12, border: '2px solid #fff', right: -7 }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--copper-bronze)' }}>CHECKLIST NODE</div>
        <button className="nodrag" onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 0 }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <select 
          className="nodrag"
          value={data.qs?.id || ''} 
          onChange={handleChecklistChange}
          style={{ width: '100%', padding: '6px', fontSize: 12, borderRadius: 4, border: '1px solid var(--silk)', background: 'var(--cream)', fontWeight: 600 }}
        >
          <option value="">-- Select Checklist --</option>
          {data.availableChecklists?.map((q: any) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
      </div>

      {data.target && (
        <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 8, padding: '4px', background: 'var(--linen)', borderRadius: 4 }}>
          <strong>Target:</strong> {data.target}
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', marginBottom: 2, display: 'block' }}>Frequency</label>
          <select 
            value={data.frequency || 'DAILY'} 
            onChange={(e) => {
              setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, frequency: e.target.value } } : n));
            }}
            className="nodrag"
            style={{ width: '100%', padding: '4px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--silk)', background: 'var(--cream)' }}
          >
            <option value="SHIFT_WISE">Shift-Wise</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', marginBottom: 2, display: 'block' }}>First Due Date</label>
          <input 
            type="date"
            value={data.nextDueDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, nextDueDate: e.target.value } } : n));
            }}
            className="nodrag"
            style={{ width: '100%', padding: '4px 6px', fontSize: 11, borderRadius: 4, border: '1px solid var(--silk)', background: 'var(--cream)' }}
          />
        </div>
      </div>
    </div>
  );
};

const CustomUserNode = ({ data }: any) => {
  return (
    <div style={{ padding: '10px 15px', borderRadius: 8, background: '#fff', border: '2px solid var(--slate)', width: 200, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--copper-bronze)', width: 12, height: 12, border: '2px solid #fff', left: -7 }} />
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', marginBottom: 4 }}>ASSIGNEE (EMPLOYEE)</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{data.label}</div>
    </div>
  );
};

const CustomRoleNode = ({ data }: any) => {
  return (
    <div style={{ padding: '10px 15px', borderRadius: 8, background: '#fff', border: '2px dashed var(--charcoal)', width: 200, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--charcoal)', width: 12, height: 12, border: '2px solid #fff', left: -7 }} />
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 4 }}>ASSIGNEE (ROLE)</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{data.label}</div>
    </div>
  );
};

const nodeTypes = {
  checklist: CustomChecklistNode,
  user: CustomUserNode,
  role: CustomRoleNode,
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={() => setEdges((es) => es.filter((e) => e.id !== id))}
            style={{
              width: 20,
              height: 20,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = {
  custom: CustomEdge,
};

export function LpaBulkScheduleFlow({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableChecklists, setAvailableChecklists] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const qsRes = await lpaApi.getQuestionSets();
        const uRes = await getUsersApi();
        const qs = getArray(qsRes);
        const usrs = getArray(uRes);
        setAvailableChecklists(qs);
        
        const initialNodes: Node[] = [];
        
        const roles = [
          { id: 'ADMIN', label: 'Plant Admin' },
          { id: 'SUPERVISOR', label: 'Shift Supervisor' },
          { id: 'QUALITY_INSPECTOR', label: 'Quality Inspector' },
          { id: 'WORKER', label: 'Operator / Worker' },
        ];

        roles.forEach((r, i) => {
          initialNodes.push({
            id: `r-${r.id}`,
            type: 'role',
            position: { x: 350, y: 50 + i * 120 },
            data: { label: r.label, id: r.id },
            targetPosition: 'left' as any,
          });
        });

        usrs.forEach((u: any, i: number) => {
          initialNodes.push({
            id: `u-${u.id}`,
            type: 'user',
            position: { x: 350, y: 50 + (roles.length + i) * 120 },
            data: { label: u.fullName || u.username, id: u.id },
            targetPosition: 'left' as any,
          });
        });

        setNodes(initialNodes);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [setNodes]);

  const handleAddChecklistNode = () => {
    const newNode = {
      id: `qs-new-${Date.now()}`,
      type: 'checklist',
      position: { x: 50, y: 50 + nodes.filter(n => n.type === 'checklist').length * 200 },
      data: { availableChecklists },
      sourcePosition: 'right' as any,
    };
    setNodes(nds => [...nds, newNode]);
  };

  const onConnect = useCallback((params: Connection) => {
    if(params.source.startsWith('qs-') && (params.target.startsWith('u-') || params.target.startsWith('r-'))) {
      const edge = { 
        ...params, 
        id: `e-${params.source}-${params.target}`,
        type: 'custom',
        animated: true,
        style: { stroke: 'var(--copper-bronze)', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--copper-bronze)' }
      };
      setEdges((eds) => addEdge(edge, eds));
    } else {
      alert("Invalid Connection: You must connect a Checklist to an Assignee (Employee or Role).");
    }
  }, [setEdges]);

  const handleSaveBulk = async () => {
    if(edges.length === 0) {
      alert("No schedules mapped.");
      return;
    }
    setSaving(true);
    try {
      for (const edge of edges) {
        let userId = null;
        let roleId = null;
        
        if (edge.target.startsWith('u-')) {
          userId = edge.target.replace('u-', '');
        } else if (edge.target.startsWith('r-')) {
          roleId = edge.target.replace('r-', '');
        }
        
        const qsNode = nodes.find(n => n.id === edge.source);
        if (!qsNode || !qsNode.data.qs) {
          alert('One or more Checklist nodes have no template selected.');
          setSaving(false);
          return;
        }

        const qs = qsNode.data.qs as any;
        const qsId = qs.id;
        const assignedFreq = qsNode?.data?.frequency || 'DAILY';
        const assignedDate = qsNode?.data?.nextDueDate ? new Date(qsNode.data.nextDueDate as string).toISOString() : new Date().toISOString();
        
        const payload = {
          auditType: qs?.auditType || 'LAYERED_PROCESS',
          questionSetId: qsId,
          operationMasterId: qs?.operationMaster?.id || null,
          gaugeMasterId: qs?.gaugeMaster?.id || null,
          machineMasterId: qs?.machineMaster?.id || null,
          assignedToId: userId,
          assignedRole: roleId,
          frequency: assignedFreq,
          nextDueDate: assignedDate,
        };
        console.log("Deploying payload:", payload);
        await lpaApi.createSchedule(payload);
      }
      onSaved();
    } catch (e: any) {
      console.error("DEPLOY ERROR:", e?.response?.data || e.message || e);
      const errMsg = e?.response?.data?.message || e?.message || "Unknown error";
      alert("Error saving schedules: " + errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--silk)', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 min-content' }}>
          <Layers size={26} color="var(--copper-bronze)" style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--charcoal)', fontWeight: 800 }}>Visual Bulk Scheduler</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate)' }}>Draw lines from Checklists to Assignees.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ padding: '8px 16px', fontSize: 13 }}>
            <X size={16} style={{ marginRight: 6 }} /> Cancel
          </button>
          <button
            onClick={handleAddChecklistNode}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'var(--cream)', color: 'var(--charcoal)', border: '1px solid var(--silk)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
          >
            <Plus size={16} /> Add Checklist Node
          </button>
          <button className="btn btn-primary" onClick={handleSaveBulk} disabled={saving || edges.length === 0} style={{ padding: '8px 16px', fontSize: 13 }}>
            <Save size={16} style={{ marginRight: 6 }} /> {saving ? 'Deploying...' : `Deploy ${edges.length}`}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading Workspace...</div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            proOptions={{ hideAttribution: true }}
            fitView
          >
            <Background color="var(--ash)" gap={16} />
            <MiniMap 
              style={{ height: 100, width: 150, borderRadius: 12, border: '1px solid var(--silk)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}
              nodeColor={(n: any) => {
                if(n.type === 'checklist') return '#B87333'; // copper bronze
                return '#94a3b8'; // slate
              }}
            />
            <Controls position="bottom-left" />
            
            <div style={{ position: 'absolute', bottom: 1, right: 14, fontSize: 8, fontWeight: 800, color: 'var(--copper-bronze)', opacity: 0.8, letterSpacing: '1px', zIndex: 10, background: 'rgba(255,255,255,0.7)', padding: '4px 10px', borderRadius: 6, pointerEvents: 'none' }}>
              LPA AQS
            </div>
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
