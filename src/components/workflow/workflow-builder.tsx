"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { ArrowLeft, Save, Play } from "lucide-react";
import { Node, Edge } from "@xyflow/react";

interface WorkflowPageProps {
  workflowId?: string;
}

export function WorkflowBuilder({ workflowId }: WorkflowPageProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("manual");
  const [status, setStatus] = useState("draft");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (workflowId) {
      setLoading(true);
      fetch(`/api/workflows/${workflowId}`)
        .then((r) => r.json())
        .then((data) => {
          setName(data.name);
          setDescription(data.description || "");
          setTriggerType(data.triggerType || "manual");
          setStatus(data.status || "draft");
          if (data.nodes) {
            setNodes(
              data.nodes.map((n: any) => ({
                id: n.id,
                type: "workflowNode",
                position: { x: n.positionX, y: n.positionY },
                data: { type: n.type, label: n.label, config: n.config },
              }))
            );
          }
          if (data.edges) {
            setEdges(
              data.edges.map((e: any) => ({
                id: e.id,
                source: e.sourceNodeId,
                target: e.targetNodeId,
                label: e.label || undefined,
                animated: true,
                markerEnd: { type: "arrowclosed" },
              }))
            );
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [workflowId]);

  const handleCanvasChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    const payload: any = { name, description, triggerType, status, nodes, edges };
    const url = workflowId
      ? `/api/workflows/${workflowId}`
      : "/api/workflows";
    const method = workflowId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        workflowId
          ? payload
          : { name, description, triggerType }
      ),
    });

    if (res.ok) {
      const data = await res.json();
      if (!workflowId) {
        router.push(`/workflows/${data.id}`);
      }
    }
    setSaving(false);
  };

  const handleExecute = async () => {
    if (!workflowId) return;
    setExecuting(true);
    await handleSave();
    await fetch(`/api/workflows/${workflowId}/execute`, { method: "POST" });
    setExecuting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading workflow...</div>;
  }

  return (
    <div className="space-y-4 h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workflows")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow name"
              className="text-lg font-semibold border-0 px-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workflowId && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExecute}
              disabled={executing}
            >
              <Play className="h-4 w-4" />
              {executing ? "Running..." : "Run"}
            </Button>
          )}
          <Button className="gap-2" onClick={handleSave} disabled={saving || !name}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Config bar */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Trigger</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <WorkflowCanvas
          initialNodes={nodes.length > 0 ? nodes : undefined}
          initialEdges={edges.length > 0 ? edges : undefined}
          onChange={handleCanvasChange}
        />
      </div>
    </div>
  );
}
