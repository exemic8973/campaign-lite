"use client";

import {
  Play,
  Mail,
  Clock,
  GitBranch,
  UserPen,
  Globe,
  StopCircle,
} from "lucide-react";

const nodeTypes = [
  { type: "trigger", label: "Trigger", icon: Play, color: "border-emerald-500 hover:bg-emerald-50" },
  { type: "sendEmail", label: "Send Email", icon: Mail, color: "border-blue-500 hover:bg-blue-50" },
  { type: "delay", label: "Delay", icon: Clock, color: "border-zinc-300 hover:bg-accent" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "border-amber-500 hover:bg-amber-50" },
  { type: "updateContact", label: "Update Contact", icon: UserPen, color: "border-violet-500 hover:bg-violet-50" },
  { type: "webhook", label: "Webhook", icon: Globe, color: "border-rose-500 hover:bg-rose-50" },
  { type: "end", label: "End", icon: StopCircle, color: "border-zinc-400 hover:bg-zinc-50" },
];

interface NodePaletteProps {
  onAddNode: (type: string, label: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="w-48 shrink-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
        Drag nodes onto canvas
      </p>
      {nodeTypes.map((nt) => {
        const Icon = nt.icon;
        return (
          <button
            key={nt.type}
            onClick={() => onAddNode(nt.type, nt.label)}
            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${nt.color}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {nt.label}
          </button>
        );
      })}
    </div>
  );
}
