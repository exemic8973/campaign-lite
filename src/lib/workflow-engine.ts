import { prisma } from "./db";

type NodeConfig = Record<string, any>;

interface WorkflowNode {
  id: string;
  type: string;
  config: string;
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
}

function getNextNodes(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.sourceNodeId === nodeId);
}

function parseConfig(config: string): NodeConfig {
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

export async function executeWorkflow(workflowId: string, contactId?: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) throw new Error("Workflow not found");

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      contactId: contactId || null,
      status: "running",
      totalSteps: workflow.nodes.length,
      startedAt: new Date(),
    },
  });

  // Find trigger node (entry point)
  const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "failed", completedAt: new Date() },
    });
    throw new Error("No trigger node found");
  }

  // Process nodes in topological order
  await processNode(execution.id, triggerNode, workflow.nodes, workflow.edges, 0);

  // Mark execution as completed
  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: { status: "completed", completedAt: new Date() },
  });

  return execution;
}

async function processNode(
  executionId: string,
  node: WorkflowNode,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
  step: number
) {
  const config = parseConfig(node.config);

  // Create execution log
  const log = await prisma.workflowExecutionLog.create({
    data: {
      executionId,
      nodeId: node.id,
      status: "running",
      input: JSON.stringify(config),
      startedAt: new Date(),
    },
  });

  try {
    let output: NodeConfig = {};

    switch (node.type) {
      case "trigger":
        output = { triggered: true };
        break;

      case "sendEmail": {
        const { templateId, subject, fromName, fromEmail } = config;
        output = { sent: true, templateId };
        // In production, this would call the email send function
        break;
      }

      case "delay": {
        const { duration = 1, unit = "minutes" } = config;
        const ms = unit === "hours" ? duration * 3600000
          : unit === "days" ? duration * 86400000
          : duration * 60000;
        await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5000))); // Cap at 5s for dev
        output = { delayed: true, duration, unit };
        break;
      }

      case "condition": {
        const { field, operator, value } = config;
        output = { evaluated: true, field, operator, value, result: true };
        // In production, evaluates against contact data
        break;
      }

      case "updateContact": {
        const { action, field, value } = config;
        output = { updated: true, action, field, value };
        break;
      }

      case "webhook": {
        const { url, method = "GET", body } = config;
        output = { called: true, url, method };
        break;
      }

      case "end":
        output = { ended: true };
        break;
    }

    // Mark node completed
    await prisma.workflowExecutionLog.update({
      where: { id: log.id },
      data: {
        status: "completed",
        output: JSON.stringify(output),
        completedAt: new Date(),
      },
    });

    // Find and process next nodes
    const outgoingEdges = getNextNodes(node.id, allEdges);
    for (const edge of outgoingEdges) {
      // Handle condition branching
      if (node.type === "condition" && edge.label) {
        const conditionResult = output.result;
        if ((edge.label === "yes" && !conditionResult) ||
            (edge.label === "no" && conditionResult)) {
          continue; // Skip this branch
        }
      }

      const nextNode = allNodes.find((n) => n.id === edge.targetNodeId);
      if (nextNode) {
        await processNode(executionId, nextNode, allNodes, allEdges, step + 1);
      }
    }
  } catch (err: any) {
    await prisma.workflowExecutionLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        error: err.message,
        completedAt: new Date(),
      },
    });
  }
}
