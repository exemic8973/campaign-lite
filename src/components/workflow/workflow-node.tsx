"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Play,
  Mail,
  Clock,
  GitBranch,
  UserPen,
  Globe,
  StopCircle,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  trigger: Play,
  sendEmail: Mail,
  delay: Clock,
  condition: GitBranch,
  updateContact: UserPen,
  webhook: Globe,
  end: StopCircle,
};

const colors: Record<string, string> = {
  trigger: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  sendEmail: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  delay: "text-card-foreground bg-card",
  condition: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  updateContact: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
  webhook: "border-rose-500 bg-rose-50 dark:bg-rose-950/30",
  end: "border-zinc-400 bg-zinc-50 dark:bg-zinc-900",
};

export const WorkflowNodeComponent = memo(({ data, selected }: any) => {
  const nodeType = data?.type || "trigger";
  const nodeLabel = data?.label || nodeType;
  const Icon = iconMap[nodeType] || Play;
  const color = colors[nodeType] || colors.trigger;

  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 min-w-[160px] shadow-sm transition-shadow ${
        color} ${selected ? "shadow-md ring-2 ring-primary" : ""}`
      }
    >
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!border-2 !border-background !w-3 !h-3"
        />
      )}

      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{nodeLabel}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{nodeType}</p>
        </div>
      </div>

      {nodeType !== "end" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!border-2 !border-background !w-3 !h-3"
        />
      )}

      {nodeType === "condition" && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="yes"
            className="!border-2 !border-emerald-500 !w-3 !h-3 !-left-4"
            style={{ top: "50%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="no"
            className="!border-2 !border-rose-500 !w-3 !h-3 !-right-4"
            style={{ top: "50%" }}
          />
        </>
      )}
    </div>
  );
});

WorkflowNodeComponent.displayName = "WorkflowNodeComponent";
