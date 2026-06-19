import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/session-utils";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  let totalContacts = await prisma.contact.count({ where: { organizationId: orgId } });
  if (totalContacts === 0) {
    const { seedAll } = await import("@/lib/seed-all");
    await seedAll(orgId);
    totalContacts = await prisma.contact.count({ where: { organizationId: orgId } });
  }
  const totalPages = Math.ceil(totalContacts / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your contact list &mdash; {totalContacts} total
        </p>
      </div>
      <ContactsClient initialTotal={totalContacts} />
    </div>
  );
}
