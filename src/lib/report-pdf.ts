import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { reportSeconds, timeDuration, type ReportTime } from "./time-report";
export async function createTimePdf({
  title,
  period,
  now,
  rows,
  projects,
  window,
}: {
  title: string;
  period: string;
  now: number;
  rows: ReportTime[];
  projects: { id: string; name: string }[];
  window: [number, number];
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await readFile(process.cwd() + "/public/fonts/NotoSans-Regular.ttf"),
    { subset: true },
  );
  const logo = await doc.embedPng(
    await readFile(process.cwd() + "/public/brand/nex-consulting-logo.png"),
  );
  doc.setTitle("NEX Consulting – " + title);
  doc.setCreator("NEX Consulting");
  let page = doc.addPage([595.28, 841.89]),
    y = 780;
  const ink = rgb(0.12, 0.13, 0.13),
    gold = rgb(174 / 255, 136 / 255, 76 / 255);
  function text(value: string, size = 10, color = ink) {
    page.drawText(value, { x: 44, y, size, font, color });
    y -= size + 7;
  }
  function header() {
    page.drawRectangle({ x: 0, y: 821, width: 596, height: 21, color: gold });
    // Clip only the original transparent canvas; artwork and proportions stay intact.
    const scale = 250 / 2917;
    page.pushOperators(
      pushGraphicsState(),
      rectangle(44, 746, 250, 628 * scale),
      clip(),
      endPath(),
    );
    page.drawImage(logo, {
      x: 44 - 104 * scale,
      y: 746 - (1875 - 1252) * scale,
      width: 3125 * scale,
      height: 1875 * scale,
    });
    page.pushOperators(popGraphicsState());
    y = 722;
    text("LEISTUNGS- UND ZEITAUSZUG", 10);
    y -= 10;
  }
  function newline() {
    page = doc.addPage([595.28, 841.89]);
    y = 780;
    header();
  }
  function wrap(value: string, size = 10) {
    const lines: string[] = [];
    let line = "";
    for (const word of value.replace(/[\r\n\t]+/g, " ").split(/ +/)) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= 505) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const ch of word) {
        if (font.widthOfTextAtSize(line + ch, size) > 505) {
          lines.push(line);
          line = "";
        }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function block(value: string, size = 10) {
    for (const line of wrap(value, size)) {
      if (y < 65) newline();
      text(line, size);
    }
  }
  header();
  block(title, 16);
  block(period, 12);
  block(
    "Stand: " +
      new Date(now).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) +
      " · Europe/Berlin",
  );
  y -= 12;
  const sum = (kind: string, approved = false) =>
    rows
      .filter((t) => t.kind === kind && (!approved || t.approved_at))
      .reduce((s, t) => s + reportSeconds(t, window), 0);
  block("Interne Arbeitszeit: " + timeDuration(sum("internal")), 12);
  block("Externe Projektzeit: " + timeDuration(sum("external")), 12);
  block("Davon extern freigegeben: " + timeDuration(sum("external", true)), 12);
  y -= 10;
  block(
    "Interne und externe Zeiten sind getrennte Größen und werden nicht addiert. Laufende Timer sind vorläufig. Dieser Auszug ist keine Rechnung. Monatsgrenzen werden anteilig berücksichtigt.",
    9,
  );
  y -= 20;
  if (!rows.length)
    block("Für diesen Zeitraum wurden noch keine Zeiten erfasst.");
  for (const t of rows) {
    if (y < 170) newline();
    page.drawLine({
      start: { x: 44, y: y + 5 },
      end: { x: 550, y: y + 5 },
      thickness: 0.5,
      color: rgb(0.82, 0.81, 0.77),
    });
    y -= 12;
    block(projects.find((p) => p.id === t.project_id)?.name || "Projekt", 11);
    block(
      new Date(t.started_at).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
      }) +
        " – " +
        (t.stopped_at
          ? new Date(t.stopped_at).toLocaleString("de-DE", {
              timeZone: "Europe/Berlin",
            })
          : "laufend"),
      9,
    );
    block(
      (t.kind === "internal" ? "Intern" : "Extern") +
        " · " +
        ({
          active: "Aktive Leistung",
          processing: "Verarbeitung",
          waiting: "Wartezeit",
          break: "Pause",
        }[t.category] || t.category) +
        " · " +
        timeDuration(reportSeconds(t, window)) +
        " · " +
        (!t.stopped_at
          ? "Vorläufig"
          : t.approved_at
            ? "Freigegeben"
            : t.kind === "internal"
              ? "Nur intern"
              : "Ungeprüft"),
      9,
    );
    block(t.description);
    y -= 14;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText("NEX Consulting · " + (i + 1) + " / " + pages.length, {
      x: 44,
      y: 30,
      size: 8,
      font,
      color: ink,
    }),
  );
  return doc.save();
}
