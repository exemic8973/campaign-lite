"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  Filter,
} from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

interface Rule {
  field: string;
  operator: string;
  value: string;
}

interface SegmentRules {
  logic: "and" | "or";
  conditions: Rule[];
}

const FIELDS = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "tags", label: "Tags" },
  { value: "isSubscribed", label: "Subscribed" },
  { value: "createdAt", label: "Created Date" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  email: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not equals" },
  ],
  firstName: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
  ],
  lastName: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
  ],
  phone: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
  ],
  tags: [
    { value: "has", label: "Has tag" },
    { value: "notHas", label: "Does not have" },
  ],
  isSubscribed: [
    { value: "equals", label: "Is" },
  ],
  createdAt: [
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "between", label: "Between" },
  ],
};

export function SegmentsClient({ initialSegments }: { initialSegments: Segment[] }) {
  const [segments, setSegments] = useState(initialSegments);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logic, setLogic] = useState<"and" | "or">("and");
  const [conditions, setConditions] = useState<Rule[]>([
    { field: "email", operator: "contains", value: "" },
  ]);

  const addCondition = () => {
    setConditions([...conditions, { field: "email", operator: "contains", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: keyof Rule, value: string) => {
    const updated = conditions.map((c, i) => {
      if (i !== index) return c;
      if (key === "field") {
        const ops = OPERATORS[value] || OPERATORS.email;
        return { ...c, field: value, operator: ops[0].value, value: "" };
      }
      return { ...c, [key]: value };
    });
    setConditions(updated);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersSegId, setMembersSegId] = useState("");
  const [membersSegName, setMembersSegName] = useState("");
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  const openMembers = async (segId: string, segName: string) => {
    setMembersSegId(segId);
    setMembersSegName(segName);
    // Fetch all contacts and current members
    const [contactsRes, membersRes] = await Promise.all([
      fetch("/api/contacts?limit=100"),
      fetch(`/api/segments/members?segmentId=${segId}`),
    ]);
    const contactsData = await contactsRes.json();
    const membersData = await membersRes.json();
    const contacts = contactsData.contacts || [];
    const members = Array.isArray(membersData) ? membersData : [];
    setAllContacts(contacts);
    setMemberIds(new Set(members.map((m: any) => m.id)));
    setMembersOpen(true);
  };

  const toggleMember = async (contactId: string, add: boolean) => {
    if (add) {
      await fetch("/api/segments/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segmentId: membersSegId, contactId }) });
    } else {
      await fetch(`/api/segments/members?segmentId=${membersSegId}&contactId=${contactId}`, { method: "DELETE" });
    }
    const next = new Set(memberIds);
    add ? next.add(contactId) : next.delete(contactId);
    setMemberIds(next);
  };

  const handleSave = async () => {
    const rules: SegmentRules = { logic, conditions: conditions.filter((c) => c.value) };
    const isEdit = !!editingId;
    const url = isEdit ? `/api/segments?id=${editingId}` : "/api/segments";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, rules }),
    });
    if (res.ok) {
      const segment = await res.json();
      if (isEdit) {
        setSegments(segments.map((s) => (s.id === editingId ? { ...s, ...segment } : s)));
      } else {
        setSegments([segment, ...segments]);
      }
      setOpen(false);
      setEditingId(null);
      setName("");
      setDescription("");
      setConditions([{ field: "email", operator: "contains", value: "" }]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this segment?")) return;
    await fetch(`/api/segments?id=${id}`, { method: "DELETE" });
    setSegments(segments.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setName(""); setDescription(""); setConditions([{ field: "email", operator: "contains", value: "" }]); } }}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Segment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seg-name">Segment Name</Label>
              <Input
                id="seg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP Customers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seg-desc">Description (optional)</Label>
              <Input
                id="seg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Segment description"
              />
            </div>

            {/* Rule builder */}
            <div className="space-y-2">
              <Label>Rules</Label>
              <div className="flex gap-2">
                <Button
                  variant={logic === "and" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogic("and")}
                >
                  Match ALL (AND)
                </Button>
                <Button
                  variant={logic === "or" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogic("or")}
                >
                  Match ANY (OR)
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={condition.field}
                      onValueChange={(v) => updateCondition(index, "field", v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateCondition(index, "operator", v)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(OPERATORS[condition.field] || OPERATORS.email).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      className="flex-1"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, "value", e.target.value)}
                      placeholder="Value"
                    />

                    {conditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={addCondition}
                >
                  <Plus className="h-3 w-3" />
                  Add condition
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={!name}>
              {editingId ? 'Save Segment' : 'Create Segment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Contacts in "{membersSegName}"</DialogTitle></DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {allContacts.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                onClick={() => toggleMember(c.id, !memberIds.has(c.id))}>
                <input type="checkbox" checked={memberIds.has(c.id)} readOnly className="h-4 w-4" />
                <span className="text-sm">{c.firstName || c.lastName ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : c.email}</span>
                <span className="text-xs text-muted-foreground ml-auto">{c.email}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Segment list */}
      {segments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Filter className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No segments yet</p>
          <p className="text-xs text-muted-foreground">
            Create a segment to target specific groups of contacts
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{segment.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(segment.id); setName(segment.name); setDescription(segment.description || ''); setOpen(true); }}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(segment.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
                {segment.description && (
                  <CardDescription>{segment.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-mono">{segment.contactCount}</span>
                  <span>contacts</span>
                </div>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openMembers(segment.id, segment.name)}>
                  Manage contacts
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
