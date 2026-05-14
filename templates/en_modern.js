const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  LevelFormat, Header, UnderlineType
} = require('docx');
const fs = require('fs');

const data = JSON.parse(process.argv[2]);
const outPath = process.argv[3];

// Colors
const ACCENT = "1B4F72";       // Deep navy blue
const ACCENT_LIGHT = "D6EAF8"; // Light blue bg
const TEXT_DARK = "1A1A2E";
const TEXT_MID = "4A4A6A";
const DIVIDER = "AED6F1";
const WHITE = "FFFFFF";

function noBorder() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: b, bottom: b, left: b, right: b };
}

function thinBottom(color = DIVIDER) {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
  };
}

// ── HEADER ──
function makeHeader(d) {
  return [
    // Name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: d.name || "Your Name", bold: true, size: 56, color: ACCENT, font: "Calibri" })
      ]
    }),
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: d.title || "", size: 26, color: TEXT_MID, font: "Calibri", italics: true })
      ]
    }),
    // Contact row
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({ text: `📧 ${d.email || ""}  `, size: 20, color: TEXT_MID, font: "Calibri" }),
        new TextRun({ text: `📞 ${d.phone || ""}  `, size: 20, color: TEXT_MID, font: "Calibri" }),
        new TextRun({ text: `📍 ${d.location || ""}`, size: 20, color: TEXT_MID, font: "Calibri" }),
      ]
    }),
    ...(d.linkedin ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [new TextRun({ text: `🔗 ${d.linkedin}`, size: 20, color: ACCENT, font: "Calibri" })]
    })] : [new Paragraph({ spacing: { before: 0, after: 120 }, children: [] })]),
    // Full divider
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT } },
      spacing: { before: 0, after: 200 },
      children: []
    }),
  ];
}

// ── SECTION TITLE ──
function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: DIVIDER } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: ACCENT, font: "Calibri", characterSpacing: 40 })
    ]
  });
}

// ── SUMMARY ──
function makeSummary(d) {
  if (!d.summary) return [];
  return [
    sectionTitle("Professional Summary"),
    new Paragraph({
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: d.summary, size: 21, color: TEXT_DARK, font: "Calibri" })]
    }),
  ];
}

// ── EXPERIENCE ──
function makeExperience(d) {
  if (!d.experience || d.experience.length === 0) return [];
  const items = [];
  items.push(sectionTitle("Work Experience"));

  for (const exp of d.experience) {
    // Role + Period on same line
    items.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [5500, 3526],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({
              children: [
                new TextRun({ text: exp.role || "", bold: true, size: 23, color: TEXT_DARK, font: "Calibri" })
              ]
            })]
          }),
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: exp.period || "", size: 20, color: TEXT_MID, font: "Calibri", italics: true })
              ]
            })]
          }),
        ]
      })]
    }));

    items.push(new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: exp.company || "", size: 21, color: ACCENT, font: "Calibri", bold: true })]
    }));

    for (const bullet of (exp.bullets || [])) {
      items.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: bullet, size: 20, color: TEXT_DARK, font: "Calibri" })]
      }));
    }
    items.push(new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }));
  }
  return items;
}

// ── EDUCATION ──
function makeEducation(d) {
  if (!d.education || d.education.length === 0) return [];
  const items = [sectionTitle("Education")];
  for (const edu of d.education) {
    items.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [6000, 3026],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ children: [
              new TextRun({ text: edu.degree || "", bold: true, size: 22, color: TEXT_DARK, font: "Calibri" })
            ]})]
          }),
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ text: edu.year || "", size: 20, color: TEXT_MID, font: "Calibri", italics: true })
            ]})]
          }),
        ]
      })]
    }));
    items.push(new Paragraph({
      spacing: { before: 0, after: 100 },
      children: [new TextRun({ text: edu.institution || "", size: 20, color: ACCENT, font: "Calibri" })]
    }));
  }
  return items;
}

// ── SKILLS + LANGUAGES ──
function makeSkillsAndLangs(d) {
  const items = [];

  // Skills
  if (d.skills && d.skills.length > 0) {
    items.push(sectionTitle("Skills"));
    // Grid of skill chips using a simple paragraph with separators
    const skillText = d.skills.join("   •   ");
    items.push(new Paragraph({
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: skillText, size: 20, color: TEXT_DARK, font: "Calibri" })]
    }));
  }

  // Languages
  if (d.languages && d.languages.length > 0) {
    items.push(sectionTitle("Languages"));
    items.push(new Paragraph({
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: d.languages.join("   |   "), size: 20, color: TEXT_DARK, font: "Calibri" })]
    }));
  }

  return items;
}

// ── BUILD DOC ──
const children = [
  ...makeHeader(data),
  ...makeSummary(data),
  ...makeExperience(data),
  ...makeEducation(data),
  ...makeSkillsAndLangs(data),
];

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "▸",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } }
      }]
    }]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 900, right: 1000, bottom: 900, left: 1000 }
      }
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("OK:" + outPath);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
