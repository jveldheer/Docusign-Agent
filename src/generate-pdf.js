/**
 * PDF Generator for VLV Participation Agreement
 * Creates a professional PDF document from the agreement text
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

const AGREEMENT_CONFIG = {
  title: 'Dermadventures LLC dba Veldheer Lineman Vault',
  subtitle: 'Online Training, Nutrition, and Supplement Participation Agreement',
  version: '2026 01',
  fileName: 'VLV_Participation_Agreement_DermadventuresLLC_Jan2026_FINAL.pdf'
};

const SECTIONS = [
  {
    title: 'READ THIS FIRST',
    content: `If you are under 18, do not click I agree. Send this to your parent or legal guardian and have them accept for you.`,
    highlight: true
  },
  {
    title: 'WHO IS COVERED',
    content: `Provider: Dermadventures LLC, doing business as Veldheer Lineman Vault.

Released Parties: Dermadventures LLC, Veldheer Lineman Vault, Jared Veldheer, and all employees, contractors, coaches, moderators, agents, and affiliates.`
  },
  {
    title: 'ELIGIBILITY AND AUTHORITY TO ACCEPT',
    content: `By clicking I agree, you confirm one of the following is true:

A. You are 18 or older and you are accepting for yourself.

B. You are the parent or legal guardian of a participant under 18 and you are accepting on behalf of yourself and granting permission for the minor to participate under your supervision.`
  },
  {
    title: 'EDUCATIONAL COACHING ONLY',
    content: `All workouts, programs, videos, technique feedback, live sessions, recovery guidance, nutrition guidance, and supplement guidance are provided for general education and coaching. You are responsible for your choices and outcomes.`
  },
  {
    title: 'ONLINE ONLY AND NO IN PERSON SUPERVISION',
    content: `You understand this is delivered online. You are training without in person supervision. You are responsible for your setup, equipment, environment, and execution.`
  },
  {
    title: 'ASSUMPTION OF RISK FOR TRAINING',
    content: `You understand strength training and athletic performance training involve inherent risks, including serious injury. Risks include strains, sprains, tendon or ligament injury, joint injury, back or neck injury, head injury, fainting, heat illness, abnormal heart rhythm, permanent disability, and death. You voluntarily participate and assume all risks, known and unknown, even if arising from ordinary negligence.`
  },
  {
    title: 'ASSUMPTION OF RISK FOR NUTRITION AND SUPPLEMENTS',
    content: `You understand nutrition changes and supplement use involve risk. Risks include allergic reactions, digestive distress, dehydration or electrolyte imbalance, sleep disruption, jitters or anxiety, blood pressure changes, medication interactions, and unexpected side effects. You are responsible for reading labels, following directions, and confirming products are appropriate for you or your minor.`
  },
  {
    title: 'STOP RULES',
    content: `Stop immediately if you experience sharp pain, dizziness, faintness, numbness, loss of control, chest pain, unusual shortness of breath, or any alarming symptoms. Choose safe loads, prioritize form, and regress movements when needed.`
  },
  {
    title: 'TECHNIQUE REVIEW LIMITATIONS',
    content: `If you submit video or ask for feedback, you understand feedback is educational, based only on what is visible and what you report, and does not guarantee injury prevention or outcomes. You remain responsible for execution and safety.`
  },
  {
    title: 'RELEASE AND WAIVER OF LIABILITY',
    content: `To the fullest extent permitted by law, you release and hold harmless the Released Parties from any and all claims, demands, damages, losses, or liabilities arising from your participation in training, your use of content, nutrition guidance, supplement guidance, technique feedback, or community activity, including claims based on ordinary negligence.`
  },
  {
    title: 'PARENT OR GUARDIAN TERMS FOR MINORS',
    content: `If you accept as a parent or legal guardian, you grant permission for the minor to participate and you agree to supervise the minor's training, nutrition changes, and any supplement use. You agree the minor will not use supplements without your approval.`
  },
  {
    title: 'NO GUARANTEES',
    content: `Results vary. No specific outcomes are promised, including strength, performance, body composition, health outcomes, or injury prevention.`
  },
  {
    title: 'GOVERNING LAW AND VENUE',
    content: `This Agreement is governed by Michigan law. Any permitted legal action must be brought in state or federal court located in Michigan.`
  },
  {
    title: 'ELECTRONIC ACCEPTANCE',
    content: `By clicking I agree, you acknowledge you have read, understood, and accepted this Agreement as your electronic signature.`
  }
];

/**
 * Wraps text to fit within a specified width
 */
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates the VLV Participation Agreement PDF
 */
async function generatePDF() {
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page settings
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Helper to add new page if needed
  const ensureSpace = (neededHeight) => {
    if (yPosition - neededHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };

  // Title
  const titleFontSize = 16;
  const titleLines = wrapText(AGREEMENT_CONFIG.title, helveticaBold, titleFontSize, contentWidth);
  for (const line of titleLines) {
    const titleWidth = helveticaBold.widthOfTextAtSize(line, titleFontSize);
    page.drawText(line, {
      x: (pageWidth - titleWidth) / 2,
      y: yPosition,
      size: titleFontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= titleFontSize + 4;
  }

  yPosition -= 5;

  // Subtitle
  const subtitleFontSize = 12;
  const subtitleLines = wrapText(AGREEMENT_CONFIG.subtitle, helveticaBold, subtitleFontSize, contentWidth);
  for (const line of subtitleLines) {
    const subtitleWidth = helveticaBold.widthOfTextAtSize(line, subtitleFontSize);
    page.drawText(line, {
      x: (pageWidth - subtitleWidth) / 2,
      y: yPosition,
      size: subtitleFontSize,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2)
    });
    yPosition -= subtitleFontSize + 4;
  }

  yPosition -= 20;

  // Draw separator line
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  yPosition -= 25;

  // Sections
  const sectionTitleSize = 11;
  const bodyFontSize = 10;
  const lineHeight = bodyFontSize + 4;

  for (const section of SECTIONS) {
    // Calculate space needed for section title + some content
    ensureSpace(sectionTitleSize + lineHeight * 3);

    // Section title
    page.drawText(section.title, {
      x: margin,
      y: yPosition,
      size: sectionTitleSize,
      font: helveticaBold,
      color: section.highlight ? rgb(0.7, 0, 0) : rgb(0, 0, 0)
    });
    yPosition -= sectionTitleSize + 8;

    // Section content - handle paragraphs
    const paragraphs = section.content.split('\n\n');

    for (const paragraph of paragraphs) {
      const cleanParagraph = paragraph.replace(/\n/g, ' ').trim();
      const lines = wrapText(cleanParagraph, helvetica, bodyFontSize, contentWidth);

      for (const line of lines) {
        ensureSpace(lineHeight);
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: bodyFontSize,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1)
        });
        yPosition -= lineHeight;
      }
      yPosition -= 5; // Extra space between paragraphs
    }

    yPosition -= 15; // Space between sections
  }

  // Version footer on last page
  ensureSpace(40);
  yPosition -= 20;

  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  yPosition -= 15;

  const versionText = `Version: ${AGREEMENT_CONFIG.version}`;
  page.drawText(versionText, {
    x: margin,
    y: yPosition,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'agreements', AGREEMENT_CONFIG.fileName);

  await fs.writeFile(outputPath, pdfBytes);

  console.log(`PDF generated successfully: ${outputPath}`);
  return outputPath;
}

// Run if executed directly
generatePDF().catch(console.error);

export { generatePDF, AGREEMENT_CONFIG };
