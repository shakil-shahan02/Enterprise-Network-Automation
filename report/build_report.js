// Builds report/ENT-HYBRID-NET_Technical_Report.docx from the project evidence.
//   NODE_PATH=<dir with docx + image-size> node report/build_report.js
const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, TableOfContents, Header, Footer,
  PageNumber, LevelFormat, TabStopType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(ROOT, "screenshots");
const CONTENT_W = 9026; // A4 with 1" margins, DXA
const FONT = "Calibri";

// ---------------------------------------------------------------- helpers
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 }, alignment: opts.align || AlignmentType.JUSTIFIED,
  children: (Array.isArray(text) ? text : [text]).map(t => typeof t === "string" ? new TextRun(t) : t),
  ...opts.p,
});
const B = (t) => new TextRun({ text: t, bold: true });
const I = (t) => new TextRun({ text: t, italics: true });
const C = (t) => new TextRun({ text: t, font: "Consolas", size: 19 });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const bullet = (parts, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level }, spacing: { after: 60 },
  children: (Array.isArray(parts) ? parts : [parts]).map(t => typeof t === "string" ? new TextRun(t) : t),
});
const numbered = (parts) => new Paragraph({
  numbering: { reference: "steps", level: 0 }, spacing: { after: 60 },
  children: (Array.isArray(parts) ? parts : [parts]).map(t => typeof t === "string" ? new TextRun(t) : t),
});

const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((cell, ci) => new TableCell({
        borders, width: { size: widths[ci], type: WidthType.DXA },
        shading: ri === 0 ? { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" }
          : (ri % 2 === 0 ? { fill: "F2F5FA", type: ShadingType.CLEAR, color: "auto" } : undefined),
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        children: String(cell).split("\n").map(line => new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: line, bold: ri === 0, color: ri === 0 ? "FFFFFF" : undefined,
            size: opts.size || 18, font: opts.mono && ri > 0 && ci === (opts.monoCol ?? -1) ? "Consolas" : FONT })],
        })),
      })),
    })),
  });
}
const tableCaption = (t) => new Paragraph({ spacing: { before: 200, after: 80 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: t, bold: true, size: 19, color: "1F3864" })] });

let figNo = 0;
const figures = []; // list for the evidence index
function figure(file, caption, widthIn = 6.25) {
  const full = path.isAbsolute(file) ? file : path.join(SHOTS, file);
  if (!fs.existsSync(full)) return [P([I(`[Missing evidence: ${path.basename(full)}]`)])];
  const dim = sizeOf(fs.readFileSync(full));
  const w = Math.round(widthIn * 96), h = Math.round(w * dim.height / dim.width);
  figNo += 1;
  figures.push([`Figure ${figNo}`, caption, path.relative(ROOT, full).replace(/\\/g, "/")]);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true,
      children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width: w, height: h },
        altText: { title: caption, description: caption, name: path.basename(full) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: `Figure ${figNo}: ${caption}`, italics: true, size: 19, color: "404040" })] }),
  ];
}
function code(lines, title) {
  const out = [];
  if (title) out.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: title, bold: true, size: 19 })] }));
  lines.forEach((l, i) => out.push(new Paragraph({
    spacing: { after: 0, line: 240 }, shading: { fill: "F4F4F4", type: ShadingType.CLEAR, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6", space: 6 } },
    indent: { left: 200 },
    children: [new TextRun({ text: l === "" ? " " : l, font: "Consolas", size: 17 })],
  })));
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  return out;
}
const readLines = (rel, from = 0, to = 9999) => fs.readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/).slice(from, to);
const shot = (name) => fs.readdirSync(SHOTS).find(f => f.startsWith(name));

module.exports = { P, B, I, C, H1, H2, H3, bullet, numbered, table, tableCaption, figure, code, readLines, shot,
  figures, CONTENT_W, ROOT, SHOTS, FONT, Paragraph, TextRun, AlignmentType, PageBreak };

if (require.main === module) {
  const sections = require("./report_content.js");
  const children = sections.build();
  const doc = new Document({
    creator: "ENT-HYBRID-NET consulting team",
    title: "Enterprise Network Automation and Hybrid-Cloud Infrastructure as Code",
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 34, bold: true, font: FONT, color: "1F3864" }, paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 27, bold: true, font: FONT, color: "2E75B6" }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 23, bold: true, font: FONT, color: "404040" }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } }] },
      { reference: "steps", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6", space: 4 } },
        children: [new TextRun({ text: "ENT-HYBRID-NET  |  Enterprise Network Automation & Hybrid-Cloud IaC", size: 17, color: "7F7F7F" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 17, color: "7F7F7F" }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "7F7F7F" }),
          new TextRun({ text: " of ", size: 17, color: "7F7F7F" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: "7F7F7F" })] })] }) },
      children,
    }],
  });
  const out = path.join(__dirname, "ENT-HYBRID-NET_Technical_Report.docx");
  Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("wrote", out, figures.length, "figures"); });
}
