import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser, db, sameOrigin } from "@/lib/server";
import { portalStaff } from "@/lib/portal-server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    await portalStaff();
    if (Number(request.headers.get("content-length") || 0) > 4500000)
      return NextResponse.json(
        { error: "PDF darf höchstens 4 MB groß sein." },
        { status: 413 },
      );
    const form = await request.formData();
    const customer_id = z.string().uuid().parse(form.get("customer_id"));
    const title = z.string().trim().min(2).max(200).parse(form.get("title"));
    const kind = z.enum(["Vertrag", "Dokument"]).parse(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 4194304 || file.size < 5)
      throw Error("PDF fehlt");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw Error("Nur PDF");
    const c = db();
    const path = customer_id + "/" + randomUUID() + ".pdf";
    const upload = await c.storage
      .from("nc-documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw upload.error;
    const r = await c
      .from("nc_documents")
      .insert({
        customer_id,
        title,
        kind,
        file_path: path,
        file_name: file.name.slice(0, 150),
        customer_visible: false,
      });
    if (r.error) {
      await c.storage.from("nc-documents").remove([path]);
      throw r.error;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Upload fehlgeschlagen. Bitte Kunde, Titel und PDF (max. 4 MB) prüfen.",
      },
      { status: 400 },
    );
  }
}
export async function GET(request: Request) {
  const u = await currentUser();
  if (!u) return new Response(null, { status: 401 });
  const id = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return new Response(null, { status: 404 });
  const c = db();
  let q = c
    .from("nc_documents")
    .select("file_path,file_name")
    .eq("id", id.data);
  if (u.role === "customer" && u.customer_id)
    q = q.eq("customer_id", u.customer_id).eq("customer_visible", true);
  else if (!["global_admin", "employee"].includes(u.role))
    return new Response(null, { status: 403 });
  const { data } = await q.maybeSingle();
  if (!data?.file_path) return new Response(null, { status: 404 });
  const file = await c.storage.from("nc-documents").download(data.file_path);
  if (file.error) return new Response(null, { status: 404 });
  return new Response(file.data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(data.file_name || "document.pdf")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
