// Run against an isolated PostgreSQL engine: node tests/recurring-billing-db.mjs /path/to/pglite/dist/index.js
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table nc_customers(id uuid primary key default gen_random_uuid());
    create table nc_projects(id uuid primary key default gen_random_uuid(), customer_id uuid references nc_customers(id), name text);
    create table nc_subscriptions(id uuid primary key default gen_random_uuid(),project_id uuid not null references nc_projects(id),plan text not null check(plan in ('Care','Care Plus','Care Dedicated')),monthly_cents integer not null check(monthly_cents>0),included_minutes integer not null default 0, starts_on date not null,ends_on date,active boolean not null default true, check(ends_on is null or ends_on>=starts_on),constraint nc_subscription_month_start check(extract(day from starts_on)=1 and starts_on>=date '2020-01-01'));
    create unique index nc_one_subscription on nc_subscriptions(project_id) where active;
    create table nc_invoices(id uuid primary key default gen_random_uuid(),customer_id uuid not null references nc_customers(id),project_id uuid not null references nc_projects(id),subscription_id uuid references nc_subscriptions(id),period text,subject text,net_cents bigint,items jsonb,status text default 'draft',unique(subscription_id,period));
  `);
  await db.exec(
    await fs.readFile(
      new URL(
        "../supabase/migrations/20261008120000_recurring_customer_billing.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const customer = (
    await db.query("insert into nc_customers default values returning id")
  ).rows[0].id;
  const other = (
    await db.query("insert into nc_customers default values returning id")
  ).rows[0].id;
  const project = (
    await db.query(
      "insert into nc_projects(customer_id,name) values($1,'Synthetic project') returning id",
      [customer],
    )
  ).rows[0].id;
  const product = (
    await db.query("select id from nc_billing_products where name='Domain'")
  ).rows[0].id;
  const dates = (
    await db.query(
      "select (now() at time zone 'Europe/Berlin')::date::text as today, (date_trunc('month',now() at time zone 'Europe/Berlin') - interval '1 month' + interval '7 days')::date::text as previous, (date_trunc('month',now() at time zone 'Europe/Berlin') + interval '1 month')::date::text as next",
    )
  ).rows[0];
  async function cost(overrides = {}) {
    const p = {
      customer,
      project: null,
      product,
      cents: 50,
      factor: 1.13,
      starts: dates.previous,
      ends: dates.today,
      active: true,
      ...overrides,
    };
    return (
      await db.query(
        "insert into nc_recurring_costs(customer_id,project_id,product_id,label,cost_cents,factor,starts_on,ends_on,active) values($1,$2,$3,'Synthetic domain',$4,$5,$6,$7,$8) returning *",
        [
          p.customer,
          p.project,
          p.product,
          p.cents,
          p.factor,
          p.starts,
          p.ends,
          p.active,
        ],
      )
    ).rows[0];
  }
  const row = await cost();
  assert.equal(Number(row.monthly_cents), 57);
  const future = await cost({ starts: dates.next, ends: null });
  const paused = await cost({ active: false });
  await assert.rejects(cost({ customer: other, project }), /gehört nicht/);
  await assert.rejects(cost({ ends: "2019-01-01" }), /check constraint/);
  await db.query(
    "insert into nc_subscriptions(project_id,plan,monthly_cents,starts_on,ends_on) values($1,'Custom software care',19900,$2,$3)",
    [project, dates.previous, dates.today],
  );
  await assert.rejects(
    db.query(
      "insert into nc_subscriptions(project_id,plan,monthly_cents,starts_on) values($1,'Overlap',29900,$2)",
      [project, dates.today],
    ),
    /bereits ein Betreuungsvertrag/,
  );
  // An ended contract allows a later successor; future contracts are not billed early.
  await db.query(
    "insert into nc_subscriptions(project_id,plan,monthly_cents,starts_on) values($1,'Successor',29900,$2)",
    [project, dates.next],
  );
  const generated = Number(
    (await db.query("select nc_generate_billing() as n")).rows[0].n,
  );
  assert.equal(generated, 4, "two months of custom care + customer-wide costs");
  assert.equal(
    Number((await db.query("select nc_generate_billing() as n")).rows[0].n),
    0,
    "repeat runs do not duplicate invoices",
  );
  const invoices = (
    await db.query(
      "select * from nc_invoices where recurring_cost_id=$1 order by period",
      [row.id],
    )
  ).rows;
  assert.equal(invoices.length, 2);
  assert.equal(invoices[0].project_id, null);
  assert.equal(Number(invoices[0].net_cents), 57);
  assert.equal(invoices[0].items[0].unit_cents, 57);
  assert.equal(
    (
      await db.query(
        "select * from nc_invoices where recurring_cost_id in ($1,$2)",
        [future.id, paused.id],
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update nc_recurring_costs set cost_cents=1000,factor=1.3 where id=$1",
    [row.id],
  );
  await db.query("select nc_generate_billing()");
  assert.equal(
    Number(
      (
        await db.query("select net_cents from nc_invoices where id=$1", [
          invoices[0].id,
        ])
      ).rows[0].net_cents,
    ),
    57,
    "historical invoices retain agreed price",
  );
  await assert.rejects(
    db.query("update nc_recurring_costs set customer_id=$1 where id=$2", [
      other,
      row.id,
    ]),
    /keinem anderen/,
  );
  // Ending on the first day still includes that month; no periods after termination.
  const ended = await cost({
    starts: dates.previous,
    ends: dates.previous,
    project,
  });
  assert.equal(
    Number((await db.query("select nc_generate_billing() as n")).rows[0].n),
    1,
  );
  assert.equal(
    (
      await db.query("select * from nc_invoices where recurring_cost_id=$1", [
        ended.id,
      ])
    ).rows.length,
    1,
  );
  const privileges = (
    await db.query(
      "select has_table_privilege('anon','nc_recurring_costs','SELECT') as anon, has_table_privilege('authenticated','nc_billing_products','UPDATE') as authenticated, relrowsecurity from pg_class where oid='nc_recurring_costs'::regclass",
    )
  ).rows[0];
  assert.deepEqual(privileges, {
    anon: false,
    authenticated: false,
    relrowsecurity: true,
  });
  console.log(
    "PASS: migration, exact rounding, customer/project ownership, custom and successor care, future/paused/ended costs, monthly catch-up, duplicate prevention, frozen invoice history, restricted access",
  );
} finally {
  await db.close();
}
