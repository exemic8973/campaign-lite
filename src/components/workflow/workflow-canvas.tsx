"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNodeComponent } from "./workflow-node";
import { NodePalette } from "./node-palette";

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "workflowNode",
    position: { x: 250, y: 0 },
    data: { type: "trigger", label: "Manual Trigger", config: "{}" },
  },
  {
    id: "end-1",
    type: "workflowNode",
    position: { x: 250, y: 400 },
    data: { type: "end", label: "End", config: "{}" },
  },
];

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
} as any;

interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  readonly?: boolean;
}

export function WorkflowCanvas({
  initialNodes: externalNodes,
  initialEdges: externalEdges,
  onChange,
  readonly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    externalNodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    externalEdges || []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(
        {
          ...params,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: true,
        },
        edges
      );
      setEdges(newEdges);
      onChange?.(nodes, newEdges);
    },
    [edges, nodes, onChange, setEdges]
  );

  const onNodesChangeHandler = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Debounced onChange handled by parent
    },
    [onNodesChange]
  );

  const addNode = useCallback(
    (type: string, label: string) => {
      const configs: Record<string, string> = {
        trigger: '{"type":"manual"}',
        sendEmail: '{"templateId":"","subject":""}',
        delay: '{"duration":1,"unit":"minutes"}',
        condition: '{"field":"email","operator":"contains","value":""}',
        updateContact: '{"action":"set","field":"","value":""}',
        webhook: '{"url":"","method":"GET"}',
        end: "{}",
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: "workflowNode",
        position: { x: 250, y: 200 + nodes.length * 100 },
        data: { type, label, config: configs[type] || "{}" },
      };
      setNodes([...nodes, newNode]);
      onChange?.([...nodes, newNode], edges);
    },
    [nodes, edges, onChange, setNodes]
  );

  return (
    <div className="flex h-full gap-4">
      {!readonly && <NodePalette onAddNode={addNode} />}
      <div className="flex-1 rounded-xl border bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
