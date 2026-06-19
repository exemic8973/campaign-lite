"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  totalSteps: number;
  currentStep: number;
  startedAt: string;
  completedAt: string | null;
  logs: { id: string; nodeId: string | null; status: string; output: string | null; error: string | null }[];
}

export function WorkflowListClient() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows/executions")
      .then((r) => r.json())
      .then((data) => {
        setExecutions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (executions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {executions.slice(0, 5).map((ex) => (
            <div key={ex.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-3">
                {ex.status === "completed" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : ex.status === "failed" ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">
                    {ex.status === "completed" ? "Completed" : ex.status === "failed" ? "Failed" : "Running"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ex.startedAt ? new Date(ex.startedAt).toLocaleString() : ""}
                    {ex.totalSteps > 0 && ` | ${ex.totalSteps} steps`}
                  </p>
                </div>
              </div>
              {ex.logs && ex.logs.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {ex.logs.length} steps
                  </summary>
                  <div className="mt-2 space-y-1">
                    {ex.logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        <Badge variant={log.status === "completed" ? "success" : log.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {log.status}
                        </Badge>
                        <span className="truncate max-w-[200px]">
                          {log.output ? (() => { try { const o = JSON.parse(log.output); return o.subject || o.action || o.triggered ? "Completed" : o.ended ? "End" : Object.keys(o)[0] || "Done"; } catch { return log.output?.substring(0, 40) || "Done"; } })() : log.error || "Processing..."}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
