import "server-only";
import { currentUser, db } from "./server";
import type { PortalData } from "./portal-model";
export async function portalStaff() {
  const user = await currentUser();
  if (!user || !["global_admin", "employee"].includes(user.role))
    throw new Error("UNAUTHORIZED");
  return user;
}
export async function customer() {
  const user = await currentUser();
  if (!user || user.role !== "customer" || !user.customer_id)
    throw new Error("UNAUTHORIZED");
  return user;
}
export async function portalSnapshot(customerId: string): Promise<PortalData> {
  const c = db();
  // Explicit projections: internal fields must never reach the client, including RSC payloads.
  const projects = await c
    .from("nc_projects")
    .select("id")
    .eq("customer_id", customerId);
  if (projects.error) throw projects.error;
  const ids = projects.data.map((p) => p.id);
  const queries = {
    contact: c
      .from("nc_customers")
      .select("id,name,contact,email,address")
      .eq("id", customerId),
    orders: c
      .from("nc_orders")
      .select(
        "id,number,name,status,progress,current_step,completed_steps,next_step,questions,due_date,due_kind,contact,updated_at",
      )
      .eq("customer_id", customerId)
      .eq("customer_visible", true)
      .order("created_at", { ascending: false }),
    websites: c
      .from("nc_websites")
      .select("id,name,domain")
      .eq("customer_id", customerId)
      .eq("customer_visible", true),
    tickets: c
      .from("nc_tickets")
      .select("id,subject,description,status,created_at,updated_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    messages: c
      .from("nc_ticket_messages")
      .select("id,ticket_id,author,body,created_at")
      .eq("customer_id", customerId)
      .eq("customer_visible", true)
      .order("created_at"),
    documents: c
      .from("nc_documents")
      .select("id,title,kind,body,file_name,updated_at")
      .eq("customer_id", customerId)
      .eq("customer_visible", true),
    invoices: c
      .from("nc_invoices")
      .select(
        "id,number,subject,status,net_cents,tax_basis_points,items,issued_at,period",
      )
      .eq("customer_id", customerId)
      .eq("customer_visible", true)
      .in("status", ["issued", "paid", "cancelled"]),
    plans: c
      .from("nc_subscriptions")
      .select("id,plan,monthly_cents,included_minutes,starts_on,ends_on,active")
      .in(
        "project_id",
        ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
      )
      .eq("customer_visible", true),
  };
  const entries = await Promise.all(
    Object.entries(queries).map(async ([key, q]) => {
      const r = await q;
      if (r.error) throw r.error;
      return [key, r.data];
    }),
  );
  return Object.fromEntries(entries);
}
export async function portalAdminSnapshot(): Promise<PortalData> {
  const c = db();
  const names = [
    "customers",
    "projects",
    "websites",
    "orders",
    "order_websites",
    "tickets",
    "ticket_messages",
    "documents",
    "subscriptions",
    "invoices",
  ];
  const entries = await Promise.all(
    names.map(async (name) => {
      const r = await c.from("nc_" + name).select("*");
      if (r.error) throw r.error;
      return [name, r.data];
    }),
  );
  const users = await c
    .from("nc_users")
    .select("id,username,role,customer_id,active");
  if (users.error) throw users.error;
  return { ...Object.fromEntries(entries), users: users.data };
}
