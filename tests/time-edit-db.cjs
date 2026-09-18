const fs = require("fs"),
  pg = require("pg"),
  assert = require("node:assert/strict");
const root = process.cwd();
process.loadEnvFile(root + "/.env.supabase.local");
const url = new URL(
  fs.readFileSync(root + "/supabase/.temp/pooler-url", "utf8").trim(),
);
url.password = process.env.SUPABASE_DB_PASSWORD;
const c = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
(async () => {
  await c.connect();
  try {
    await c.query("begin");
    for (const name of [
      "nc_users",
      "nc_projects",
      "nc_time_entries",
      "nc_invoice_times",
      "nc_audit",
    ])
      await c.query(
        `create temporary table ${name} (like public.${name} including defaults including constraints including identity)`,
      );
    await c.query(
      "alter table pg_temp.nc_time_entries drop column if exists version",
    );
    const sql = fs
      .readFileSync(
        root + "/supabase/migrations/20260918120000_edit_time_entries.sql",
        "utf8",
      )
      .replace(/^begin;$/m, "")
      .replace(/^commit;$/m, "")
      .replace(/^notify .*$/m, "")
      .replaceAll("public.nc_", "pg_temp.nc_")
      .replaceAll("set search_path=public", "set search_path=pg_temp,public");
    await c.query(sql);
    const u = "11111111-1111-4111-8111-111111111111",
      p = "22222222-2222-4222-8222-222222222222";
    await c.query(
      "insert into pg_temp.nc_users(id,username,password_hash,role) values($1,'edit-test-admin','not-a-password','global_admin')",
      [u],
    );
    await c.query(
      "insert into pg_temp.nc_projects(id,customer_id,name) values($1,$1,'Fiktives Projekt')",
      [p],
    );
    const t = (
      await c.query(
        "insert into pg_temp.nc_time_entries(user_id,project_id,kind,description,started_at) values($1,$2,'external','Forgotten timer','2026-09-17 12:21:22.384671+02') returning *",
        [u, p],
      )
    ).rows[0];
    const args = [
      u,
      t.id,
      0,
      p,
      "external",
      "active",
      "Corrected work",
      "2026-09-17 12:21:22.384671+02",
      "2026-09-17 18:45+02",
      "Timer not stopped",
      null,
      null,
      null,
      null,
    ];
    const call =
      "select pg_temp.nc_edit_time(" +
      args.map((_, i) => "$" + (i + 1)).join(",") +
      ")";
    async function reject(values, pattern) {
      await c.query("savepoint negative");
      await assert.rejects(c.query(call, values), pattern);
      await c.query("rollback to negative");
    }
    await reject(
      args.map((v, i) => (i === 0 ? p : v)),
      /UNAUTHORIZED/,
    );
    await reject(
      args.map((v, i) => (i === 8 ? "2026-09-17 10:00+02" : v)),
      /vergangenen Zeitraum/,
    );
    await reject(
      args.map((v, i) => (i === 9 ? "" : v)),
      /Änderungsgrund/,
    );
    await c.query(call, args);
    let after = (
      await c.query("select * from pg_temp.nc_time_entries where id=$1", [t.id])
    ).rows[0];
    assert.equal(after.stopped_at.toISOString(), "2026-09-17T16:45:00.000Z");
    assert.equal(after.version, 1);
    assert.equal(after.user_id, u);
    const audit = (
      await c.query(
        "select detail from pg_temp.nc_audit where action='time.edit' and entity_id=$1",
        [t.id],
      )
    ).rows[0].detail;
    assert.equal(audit.before.stopped_at, null);
    assert.equal(audit.reason, args[9]);
    assert.equal(audit.after.version, 1);
    await reject(args, /inzwischen geändert/);
    await c.query(
      "update pg_temp.nc_time_entries set approved_at=now(),approved_by=$2,approved_rate_cents=15000 where id=$1",
      [t.id, u],
    );
    args[2] = 2;
    args[8] = "2026-09-17 18:30+02";
    await c.query(call, args);
    after = (
      await c.query("select * from pg_temp.nc_time_entries where id=$1", [t.id])
    ).rows[0];
    assert.equal(after.approved_at, null);
    assert.equal(after.approved_by, null);
    assert.equal(after.approved_rate_cents, null);
    assert.equal(after.version, 3);
    assert.equal(
      (
        await c.query(
          "select count(*)::int n from pg_temp.nc_audit where detail->>'approval_revoked'='true'",
        )
      ).rows[0].n,
      1,
    );
    await c.query(
      "insert into pg_temp.nc_time_entries(user_id,project_id,kind,description,started_at,stopped_at) values($1,$2,'external','Other time','2026-09-17 19:00+02','2026-09-17 20:00+02')",
      [u, p],
    );
    args[2] = 3;
    await reject(
      args.map((v, i) => (i === 8 ? "2026-09-17 19:30+02" : v)),
      /überschneidet/,
    );
    await reject(
      args.map((v, i) => (i === 10 ? 1 : i === 11 ? "Scope change" : v)),
      /constraint/,
    );
    await c.query(
      "insert into pg_temp.nc_invoice_times(time_id,invoice_id) values($1,$2)",
      [t.id, p],
    );
    await reject(args, /Rechnung zugeordnet/);
    assert.equal(
      (
        await c.query(
          "select has_function_privilege('anon','pg_temp.nc_edit_time(uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,text,integer,text,integer,text)','execute') allowed",
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await c.query(
          "select has_function_privilege('authenticated','pg_temp.nc_edit_time(uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,text,integer,text,integer,text)','execute') allowed",
        )
      ).rows[0].allowed,
      false,
    );
    console.log(
      "PASS: retroactive stop, exact timestamps, audit before/after, stale version conflict, approval reset, interval validation, overlap protection, assignment constraints, invoiced lock, admin and RPC permissions. Production data untouched.",
    );
  } finally {
    await c.query("rollback");
    await c.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
