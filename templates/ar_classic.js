const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat
} = require('docx');
const fs = require('fs');

const data = JSON.parse(process.argv[2]);
const outPath = process.argv[3];

const ACCENT   = "7D2E00";      // Rich dark orange/brown — elegant Arabic feel
const ACCENT2  = "B5451B";      // Warm accent
const TEXT_DARK = "1C1C1C";
const TEXT_MID  = "555555";
const DIVIDER   = "E8C9A0";

function noBorder() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: b, bottom: b, left: b, right: b };
}

function makeHeader(d) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: d.name || "الاسم", bold: true, size: 60, color: ACCENT, font: "Sakkal Majalla" })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: d.title || "", size: 28, color: TEXT_MID, font: "Sakkal Majalla", italics: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({ text: `${d.email || ""}  |  ${d.phone || ""}  |  ${d.location || ""}`, size: 22, color: TEXT_MID, font: "Sakkal Majalla" })
      ]
    }),
    ...(d.linkedin ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140 },
      children: [new TextRun({ text: d.linkedin, size: 22, color: ACCENT, font: "Sakkal Majalla" })]
    })] : [new Paragraph({ spacing: { before: 0, after: 100 }, children: [] })]),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT } },
      spacing: { before: 0, after: 200 },
      children: []
    }),
  ];
}

function sectionTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: DIVIDER } },
    children: [
      new TextRun({ text, bold: true, size: 28, color: ACCENT, font: "Sakkal Majalla" })
    ]
  });
}

function makeSummary(d) {
  if (!d.summary) return [];
  return [
    sectionTitle("الملخص المهني"),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 60, after: 140 },
      children: [new TextRun({ text: d.summary, size: 24, color: TEXT_DARK, font: "Sakkal Majalla" })]
    }),
  ];
}

function makeExperience(d) {
  if (!d.experience || d.experience.length === 0) return [];
  const items = [sectionTitle("الخبرات العملية")];

  for (const exp of d.experience) {
    items.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [3526, 5500],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [
              new TextRun({ text: exp.period || "", size: 22, color: TEXT_MID, font: "Sakkal Majalla", italics: true })
            ]})]
          }),
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ text: exp.role || "", bold: true, size: 25, color: TEXT_DARK, font: "Sakkal Majalla" })
            ]})]
          }),
        ]
      })]
    }));

    items.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: exp.company || "", size: 23, color: ACCENT2, font: "Sakkal Majalla", bold: true })]
    }));

    for (const bullet of (exp.bullets || [])) {
      items.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        numbering: { reference: "bullets_ar", level: 0 },
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: bullet, size: 22, color: TEXT_DARK, font: "Sakkal Majalla" })]
      }));
    }
    items.push(new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }));
  }
  return items;
}

function makeEducation(d) {
  if (!d.education || d.education.length === 0) return [];
  const items = [sectionTitle("التعليم")];
  for (const edu of d.education) {
    items.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [3026, 6000],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [
              new TextRun({ text: edu.year || "", size: 22, color: TEXT_MID, font: "Sakkal Majalla", italics: true })
            ]})]
          }),
          new TableCell({
            borders: noBorder(),
            margins: { top: 40, bottom: 20, left: 0, right: 0 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
              new TextRun({ text: edu.degree || "", bold: true, size: 23, color: TEXT_DARK, font: "Sakkal Majalla" })
            ]})]
          }),
        ]
      })]
    }));
    items.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 100 },
      children: [new TextRun({ text: edu.institution || "", size: 22, color: ACCENT, font: "Sakkal Majalla" })]
    }));
  }
  return items;
}

function makeSkillsAndLangs(d) {
  const items = [];
  if (d.skills && d.skills.length > 0) {
    items.push(sectionTitle("المهارات"));
    items.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: d.skills.join("   •   "), size: 22, color: TEXT_DARK, font: "Sakkal Majalla" })]
    }));
  }
  if (d.languages && d.languages.length > 0) {
    items.push(sectionTitle("اللغات"));
    items.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 60, after: 120 },
      children: [new TextRun({ text: d.languages.join("   |   "), size: 22, color: TEXT_DARK, font: "Sakkal Majalla" })]
    }));
  }
  return items;
}

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
      reference: "bullets_ar",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "◀",
        alignment: AlignmentType.RIGHT,
        style: { paragraph: { indent: { left: 0, hanging: 300 }, contextualSpacing: true } }
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
