import { prisma } from "./db";

export async function seedDemoWorkflow(organizationId: string) {
  // Check if already seeded
  const existing = await prisma.workflow.findFirst({
    where: { organizationId, name: "Welcome Series" },
  });
  if (existing) return existing;

  const workflow = await prisma.workflow.create({
    data: {
      name: "Welcome Series",
      description: "Send a welcome email when someone signs up - with a 1-minute delay and tag update",
      status: "active",
      triggerType: "manual",
      organizationId,
    },
  });

  // Create nodes
  const trigger = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "trigger", label: "Manual Trigger", config: '{"type":"manual"}', positionX: 250, positionY: 0 },
  });
  const sendEmail = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "sendEmail", label: "Send Welcome Email", config: '{"templateId":"","subject":"Welcome to our community!"}', positionX: 250, positionY: 120 },
  });
  const delay = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "delay", label: "Wait 1 minute", config: '{"duration":1,"unit":"minutes"}', positionX: 250, positionY: 240 },
  });
  const updateTag = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "updateContact", label: "Tag as Welcomed", config: '{"action":"tag","field":"tags","value":"welcomed"}', positionX: 250, positionY: 360 },
  });
  const end = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "end", label: "End", config: "{}", positionX: 250, positionY: 480 },
  });

  // Connect: trigger → sendEmail → delay → updateTag → end
  await prisma.workflowEdge.createMany({
    data: [
      { workflowId: workflow.id, sourceNodeId: trigger.id, targetNodeId: sendEmail.id },
      { workflowId: workflow.id, sourceNodeId: sendEmail.id, targetNodeId: delay.id },
      { workflowId: workflow.id, sourceNodeId: delay.id, targetNodeId: updateTag.id },
      { workflowId: workflow.id, sourceNodeId: updateTag.id, targetNodeId: end.id },
    ],
  });

  return workflow;
}

export async function seedDemoWorkflowWithCondition(organizationId: string) {
  const existing = await prisma.workflow.findFirst({
    where: { organizationId, name: "VIP Re-engagement" },
  });
  if (existing) return existing;

  const workflow = await prisma.workflow.create({
    data: {
      name: "VIP Re-engagement",
      description: "Check if contact has VIP tag, send different emails based on result",
      status: "active",
      triggerType: "manual",
      organizationId,
    },
  });

  const trigger = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "trigger", label: "Manual Trigger", config: '{"type":"manual"}', positionX: 250, positionY: 0 },
  });
  const condition = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "condition", label: "Is VIP?", config: '{"field":"tags","operator":"has","value":"vip"}', positionX: 250, positionY: 120 },
  });
  const vipEmail = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "sendEmail", label: "VIP Offer Email", config: '{"templateId":"","subject":"Exclusive offer for you!"}', positionX: 100, positionY: 240 },
  });
  const standardEmail = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "sendEmail", label: "Standard Follow-up", config: '{"templateId":"","subject":"We miss you!"}', positionX: 400, positionY: 240 },
  });
  const end1 = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "end", label: "End", config: "{}", positionX: 100, positionY: 360 },
  });
  const end2 = await prisma.workflowNode.create({
    data: { workflowId: workflow.id, type: "end", label: "End", config: "{}", positionX: 400, positionY: 360 },
  });

  await prisma.workflowEdge.createMany({
    data: [
      { workflowId: workflow.id, sourceNodeId: trigger.id, targetNodeId: condition.id },
      { workflowId: workflow.id, sourceNodeId: condition.id, targetNodeId: vipEmail.id, label: "yes" },
      { workflowId: workflow.id, sourceNodeId: condition.id, targetNodeId: standardEmail.id, label: "no" },
      { workflowId: workflow.id, sourceNodeId: vipEmail.id, targetNodeId: end1.id },
      { workflowId: workflow.id, sourceNodeId: standardEmail.id, targetNodeId: end2.id },
    ],
  });

  return workflow;
}
