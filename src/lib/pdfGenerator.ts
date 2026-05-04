import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CostBreakdown } from "./gemini";

/**
 * Summarizes the raw user prompt for the PDF by removing engineering markers
 * and extracting structured architectural specifications.
 */
function cleanPrompt(raw: string): { brief: string; specs: { label: string; value: string }[] } {
  const specs: { label: string; value: string }[] = [];
  
  // Normalized keys for extraction
  const fields = [
    { key: "Room Type:", label: "Space Category" },
    { key: "Preferred Style:", label: "Design Aesthetic" },
    { key: "Budget Bracket:", label: "Investment Tier" },
    { key: "Size/Dimensions:", label: "Project Scale" },
    { key: "Primary Color Palette:", label: "Chromatic Scheme" },
    { key: "Material Preferences:", label: "Materiality" }
  ];

  let cleaned = raw;
  
  // Remove technical wrapping markers if present
  cleaned = cleaned.replace(/\[DESIGN_PROMPT\][\s\S]*?\[\/DESIGN_PROMPT\]/gi, "").trim();

  fields.forEach(field => {
    const regex = new RegExp(`${field.key}\\s*([^\\n\\r]+)`, "i");
    const match = raw.match(regex);
    if (match) {
      specs.push({ label: field.label, value: match[1].trim() });
      cleaned = cleaned.replace(match[0], "");
    }
  });

  // Extract "Additional Vision" or fallback to remaining text
  const visionRegex = /Additional Vision:\s*([\s\S]+)/i;
  const visionMatch = cleaned.match(visionRegex);
  
  let finalBrief = "";
  if (visionMatch) {
    finalBrief = visionMatch[1].trim();
  } else {
    // If no vision marker, just take the first paragraph of whatever is left after removing keys
    finalBrief = cleaned.split("\n")[0].trim();
  }

  // Final cleanup of the brief from common markers
  finalBrief = finalBrief.replace(/Project overview:|Brief:|Design Vision:/gi, "").trim();

  return {
    brief: finalBrief || "Premium AI-augmented architectural synthesis and spatial programming.",
    specs
  };
}

export async function generateDesignPDF(
  sessionTitle: string,
  prompt: string,
  costBreakdown: CostBreakdown,
  type: "Invoice" | "Payslip" | "Estimation",
  styleName: string = "Custom Design",
  userName: string = "Valued Client",
  imageUrl?: string | null
) {
  const doc = new jsPDF();
  const { brief, specs } = cleanPrompt(prompt);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' });
  const invoiceId = `ARC-SYS-${Math.floor(100000 + Math.random() * 899999)}`;
  const currency = costBreakdown.currency || "INR";

  // --- Theme Colors (Architectural Monochrome Palette) ---
  const colors = {
    primary: [0, 0, 0] as [number, number, number],
    secondary: [40, 40, 40] as [number, number, number],
    muted: [120, 120, 120] as [number, number, number],
    accent: [168, 255, 0] as [number, number, number], // The signature green
    bg: [255, 255, 255] as [number, number, number],
    border: [210, 210, 210] as [number, number, number],
    tableStrip: [248, 248, 248] as [number, number, number]
  };

  // --- Helper: Get Base64 from URL ---
  const getBase64Image = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      const t = setTimeout(() => { img.src = ""; reject(new Error("Timeout")); }, 10000);
      img.onload = () => {
        clearTimeout(t);
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { clearTimeout(t); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  };

  // --- Background Design ---
  doc.setFillColor(...colors.bg);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Structural hairline grid accents for "Architectural" feel
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.1);
  for (let i = 0; i < pageWidth; i += 20) doc.line(i, 0, i, pageHeight);
  for (let i = 0; i < pageHeight; i += 20) doc.line(0, i, pageWidth, i);

  // Left sidebar branding
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, 12, pageHeight, "F");

  // --- Header ---
  let y = 30;
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("ARCH AGENT", 25, y);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.muted);
  doc.text("PREMIUM DESIGN INTELLIGENCE SYSTEM", 25, y + 6);

  // Document Type Header Box
  const labelWidth = 50;
  doc.setFillColor(...colors.primary);
  doc.rect(pageWidth - labelWidth - 20, y - 10, labelWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(type.toUpperCase(), pageWidth - 20 - labelWidth / 2, y - 1.5, { align: "center" });
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`ID: ${invoiceId}`, pageWidth - 20, y + 8, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.muted);
  doc.text(`ISSUED: ${dateStr}`, pageWidth - 20, y + 13, { align: "right" });

  y += 35;

  // --- Client & Project Metadata Grid ---
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.line(25, y, pageWidth - 20, y);
  
  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.muted);
  doc.text("CLIENT OBLIGOR", 25, y);
  doc.text("PROJECT IDENTIFIER", pageWidth / 2 - 10, y);
  doc.text("TECHNICAL DESIGN STYLE", pageWidth - 20, y, { align: "right" });

  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text(userName, 25, y);
  doc.text(sessionTitle.toUpperCase(), pageWidth / 2 - 10, y);
  doc.text(styleName.toUpperCase(), pageWidth - 20, y, { align: "right" });

  y += 12;
  // Render specs in a clean grid
  if (specs.length > 0) {
    doc.setFontSize(8);
    specs.forEach((spec, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const specX = 25 + col * (pageWidth / 2 - 20);
      const specY = y + row * 10;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.muted);
      doc.text(spec.label.toUpperCase(), specX, specY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.secondary);
      doc.text(spec.value, specX, specY + 4);
    });
    y += Math.ceil(specs.length / 2) * 12 + 5;
  }

  // --- Design Vision Box ---
  y += 5;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(240, 240, 240);
  doc.rect(25, y, pageWidth - 45, 30, "FD");
  
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESIGN VISION STATEMENT", 30, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.secondary);
  const wrappedBrief = doc.splitTextToSize(brief, pageWidth - 60);
  doc.text(wrappedBrief, 30, y + 14);

  y += 45;

  // --- Primary Design Visualization ---
  if (imageUrl) {
    try {
      const img = await getBase64Image(imageUrl);
      const aspect = 16 / 9;
      const w = pageWidth - 50;
      const h = w / aspect;
      
      // Shadow effect for image
      doc.setFillColor(240, 240, 240);
      doc.rect(28, y + 3, w, h, "F");
      
      doc.addImage(img, "JPEG", 25, y, w, h);
      
      // Caption
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      doc.text("IMAGE 01: NEURAL TENSOR SYNTHESIS - ARCHITECTURAL VISUALIZATION", 25, y + h + 5);
      
      y += h + 20;
    } catch (e) {
      console.warn("PDF Image load failed, skipping section.");
    }
  }

  // --- Cost Breakdown Section ---
  if (y > pageHeight - 80) {
    doc.addPage();
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 12, pageHeight, "F");
    y = 30;
  }

  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PROJECTED INVESTMENT BREAKDOWN", 25, y);
  y += 8;

  const tableBody = costBreakdown.items.map(item => [
    item.item,
    item.category.toUpperCase(),
    item.quantity,
    `${currency} ${item.unitPrice.toLocaleString()}`,
    `${currency} ${item.total.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 25, right: 20 },
    head: [["ITEM SPECIFICATION", "CATEGORY", "QTY", "UNIT RATE", "EXTENDED PRICE"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 4
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      font: "helvetica",
      textColor: [30, 30, 30],
      lineColor: [240, 240, 240],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 60 },
      4: { halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: colors.tableStrip
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- Totals Section ---
  if (finalY > pageHeight - 50) doc.addPage();

  const totalBoxWidth = 80;
  doc.setFillColor(...colors.primary);
  doc.rect(pageWidth - totalBoxWidth - 20, finalY, totalBoxWidth, 20, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL ESTIMATE", pageWidth - 20 - totalBoxWidth + 5, finalY + 12);
  
  const totalVal = `${currency === 'INR' ? '₹' : currency} ${costBreakdown.totalEstimate.toLocaleString()}`;
  doc.setFontSize(14);
  doc.text(totalVal, pageWidth - 25, finalY + 12, { align: "right" });

  // --- Signature / Verification ---
  const footerY = pageHeight - 40;
  
  // ArchAgent Seal
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.circle(40, footerY + 15, 10, "S");
  doc.setFontSize(6);
  doc.text("VERIFIED", 40, footerY + 14, { align: "center" });
  doc.text("SYSTEM", 40, footerY + 17, { align: "center" });
  
  doc.setTextColor(...colors.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const disc = "CONFIDENTIALITY: This architectural brief is generated by ArchAgent. Costs represent aggregated market intelligence in India and globally. Not a final engineering document. Valid for 14 operational cycles.";
  const discWrapped = doc.splitTextToSize(disc, pageWidth - 80);
  doc.text(discWrapped, 60, footerY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.setFontSize(8);
  doc.text("NEURAL ARCHITECTURE CERTIFIED • BEYOND HUMAN PRECISION", pageWidth / 2 + 10, pageHeight - 15, { align: "center" });

  // --- Final Save ---
  const safeTitle = sessionTitle.replace(/\s+/g, '_').substring(0, 20);
  const filename = `ArchAgent_${type}_${safeTitle}_${new Date().getTime()}.pdf`;
  
  try {
    doc.save(filename);
  } catch (err) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
