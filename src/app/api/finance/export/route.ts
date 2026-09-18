import { admin } from "@/lib/server";
import { financeSnapshot, financeHeaders } from "@/lib/finance/server";
import {
  summarize,
  journalLines,
  csvCell,
  inPeriod,
  money,
} from "@/lib/finance/model";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
export async function GET(request: Request) {
  try {
    await admin();
    const q = new URL(request.url).searchParams;
    const s = await financeSnapshot(),
      period = q.get("period") || "",
      scope = q.get("scope") || "all",
      type = q.get("type") || "summary";
    if (period && !/^\d{4}(-\d{2})?$/.test(period))
      throw Error("Ungültiger Zeitraum.");
    const records = s.records.filter(
      (r) => (scope === "all" || r.brand === scope) && inPeriod(r, period),
    );
    const full = summarize(s.records, s.brands, s.allocation, period);
    const scopedRows = full.rows.filter(
      (r) => scope === "all" || r.code === scope,
    );
    const sum = {
      ...full,
      rows: scopedRows,
      income: scopedRows.reduce((n, r) => n + r.income, 0),
      cost: scopedRows.reduce((n, r) => n + r.cost, 0),
    };
    const warnings = [
      ...s.sources
        .filter(
          (x) =>
            x.code !== "nex" &&
            (x.status !== "connected" ||
              !x.last_sync ||
              Date.now() - Date.parse(x.last_sync) > 86400000),
        )
        .map((x) => x.name + ": nicht vollständig aktuell"),
      ...(records.some((r) => r.missing)
        ? ["Quellbelege fehlen im letzten Abgleich"]
        : []),
      ...(records.some(
        (r) =>
          r.state === "draft" &&
          r.kind === "document" &&
          ["incoming_invoice", "outgoing_invoice"].includes(
            r.data.document_kind,
          ),
      )
        ? ["Ungebuchte Rechnungen vorhanden"]
        : []),
    ];
    let rows: unknown[][];
    if (type === "journal")
      rows = [
        [
          "ID",
          "Quelle",
          "Kostenstelle",
          "Datum",
          "Beleg",
          "Konto",
          "Soll EUR",
          "Haben EUR",
        ],
        ...records.flatMap((r) =>
          journalLines(r).map((l) => [
            r.id,
            r.source,
            r.brand,
            r.data.date,
            r.data.reference || r.data.title,
            l.account,
            l.amount > 0 ? (l.amount / 100).toFixed(2) : "",
            l.amount < 0 ? (-l.amount / 100).toFixed(2) : "",
          ]),
        ),
      ];
    else if (type === "payments")
      rows = [
        [
          "Beleg-ID",
          "Empfänger",
          "IBAN",
          "Betrag EUR",
          "Verwendungszweck",
          "Fällig",
        ],
        ...records
          .filter(
            (r) =>
              r.source === "nex" &&
              !r.reversal_id &&
              r.data.payment_status !== "paid" &&
              s.payments.some(
                (p) => p.document_id === r.id && p.state === "approved",
              ),
          )
          .map((r) => [
            r.id,
            r.data.party,
            r.data.iban,
            (
              (r.data.gross -
                s.matches
                  .filter((m) => m.document_id === r.id)
                  .reduce((n, m) => n + m.amount, 0)) /
              100
            ).toFixed(2),
            r.data.reference,
            r.data.due_date,
          ]),
      ];
    else
      rows = [
        [
          "Kostenstelle",
          "Einnahmen netto EUR",
          "Kosten netto EUR",
          "Interne Umlage EUR",
          "Ergebnis EUR",
        ],
        ...sum.rows
          .filter((r) => scope === "all" || r.code === scope)
          .map((r) => [
            r.name,
            (r.income / 100).toFixed(2),
            (r.cost / 100).toFixed(2),
            (r.allocated / 100).toFixed(2),
            (r.result / 100).toFixed(2),
          ]),
        [
          "Gesamt",
          (sum.income / 100).toFixed(2),
          (sum.cost / 100).toFixed(2),
          (sum.rows.reduce((n, r) => n + r.allocated, 0) / 100).toFixed(2),
          (sum.rows.reduce((n, r) => n + r.result, 0) / 100).toFixed(2),
        ],
        [],
        [
          "Vorläufige Abschlussvorbereitung – kein festgestellter Jahresabschluss",
        ],
        ["Datenstand", s.captured_at],
        ...warnings.map((w) => ["Offener Punkt", w]),
      ];
    const name = "nex-" + type + "-" + (period || "gesamt");
    if (q.get("format") === "pdf") {
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      const font = await doc.embedFont(
        await readFile(process.cwd() + "/public/fonts/NotoSans-Regular.ttf"),
        { subset: true },
      );
      const logo = await doc.embedPng(
        await readFile(process.cwd() + "/public/brand/nex-consulting-logo.png"),
      );
      let page = doc.addPage([842, 595]),
        y = 510;
      const header = () => {
        page.drawImage(logo, { x: 42, y: 520, width: 160, height: 96 });
        page.drawText("NEX Consulting KG · Abschlussvorbereitung", {
          x: 42,
          y: 490,
          size: 17,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(
          (period || "Gesamtstand") +
            " · " +
            (scope === "all"
              ? "Gesamtfirma · alle Marken"
              : s.brands.find((b) => b.code === scope)?.name || scope) +
            " · " +
            new Date(s.captured_at).toLocaleString("de-DE", {
              timeZone: "Europe/Berlin",
            }),
          { x: 42, y: 466, size: 9, font },
        );
        y = 442;
      };
      header();
      const wrap = (text: string, width: number) => {
        const lines: string[] = [];
        let line = "";
        for (const char of text.replace(/[\u0000-\u001f]/g, " ")) {
          if (font.widthOfTextAtSize(line + char, 9) > width) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
        lines.push(line);
        return lines;
      };
      const textLine = (text: string) => {
        for (const line of wrap(text, 752)) {
          if (y < 55) {
            page = doc.addPage([842, 595]);
            header();
          }
          page.drawText(line, {
            x: 42,
            y,
            size: 9,
            font,
            color: rgb(0.25, 0.29, 0.32),
          });
          y -= 16;
        }
      };
      if (type === "summary") {
        const xs = [42, 322, 435, 548, 660],
          widths = [280, 113, 113, 112, 140];
        page.drawRectangle({
          x: 42,
          y: y - 12,
          width: 758,
          height: 32,
          color: rgb(0.12, 0.16, 0.19),
        });
        [
          "Kostenstelle",
          "Einnahmen netto",
          "Kosten netto",
          "Interne Umlage",
          "Ergebnis",
        ].forEach((t, i) =>
          page.drawText(t, {
            x: xs[i] + 10,
            y,
            size: 9,
            font,
            color: rgb(0.92, 0.82, 0.61),
          }),
        );
        y -= 40;
        const tableRows = [
          ...sum.rows,
          {
            name: "Gesamt",
            income: sum.income,
            cost: sum.cost,
            allocated: sum.rows.reduce((n, r) => n + r.allocated, 0),
            result: sum.rows.reduce((n, r) => n + r.result, 0),
          },
        ];
        tableRows.forEach((row, index) => {
          if (y < 80) {
            page = doc.addPage([842, 595]);
            header();
          }
          const total = index === tableRows.length - 1;
          page.drawRectangle({
            x: 42,
            y: y - 13,
            width: 758,
            height: 31,
            color: total
              ? rgb(0.95, 0.91, 0.81)
              : index % 2
                ? rgb(0.97, 0.98, 0.98)
                : rgb(1, 1, 1),
          });
          [
            row.name,
            money(row.income),
            money(row.cost),
            money(row.allocated),
            money(row.result),
          ].forEach((t, i) =>
            page.drawText(t, {
              x:
                i === 0
                  ? xs[i] + 10
                  : xs[i] + widths[i] - 10 - font.widthOfTextAtSize(t, 9),
              y,
              size: 9,
              font,
              color: rgb(0.12, 0.16, 0.19),
            }),
          );
          y -= 32;
        });
        y -= 16;
        textLine(
          "Vorläufige Abschlussvorbereitung – kein festgestellter Jahresabschluss.",
        );
        textLine(
          "Gebuchte Nettobeträge; interne Umlagen ändern das Gesamtergebnis nicht.",
        );
        y -= 10;
        for (const warning of warnings) textLine("Offener Punkt: " + warning);
      } else {
        for (const row of rows) textLine(row.map(String).join("  |  "));
      }
      doc.getPages().forEach((p, i) => {
        p.drawLine({
          start: { x: 42, y: 35 },
          end: { x: 800, y: 35 },
          thickness: 0.5,
          color: rgb(0.75, 0.68, 0.5),
        });
        p.drawText("NEX Consulting KG · BUILD WHAT’S NEX(T).", {
          x: 42,
          y: 21,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        p.drawText(`${i + 1} / ${doc.getPageCount()}`, {
          x: 765,
          y: 21,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      });
      return new Response(Buffer.from(await doc.save()), {
        headers: {
          ...financeHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${name}.pdf"`,
        },
      });
    }
    return new Response(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n"),
      {
        headers: {
          ...financeHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.csv"`,
        },
      },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Export fehlgeschlagen." },
      {
        status: e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 400,
        headers: financeHeaders,
      },
    );
  }
}
