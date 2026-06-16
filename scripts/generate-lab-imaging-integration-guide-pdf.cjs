/**
 * Generates: docs/Cura-Lab-Imaging-Integration-Guide.pdf
 * Run: npm run docs:lab-imaging-pdf
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const OUT_DIR = path.join(__dirname, "..", "docs");
const OUT_FILE = path.join(OUT_DIR, "Cura-Lab-Imaging-Integration-Guide.pdf");

const MARGIN = 15;
const PAGE_H = 297;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const checkPage = (needed = 20) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const h1 = (text) => {
    checkPage(14);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 7 + 4;
    doc.setTextColor(0, 0, 0);
  };

  const h2 = (text) => {
    checkPage(12);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 6 + 3;
    doc.setTextColor(0, 0, 0);
  };

  const h3 = (text) => {
    checkPage(10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 2;
  };

  const p = (text) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, CONTENT_W);
    const h = lines.length * 4.5 + 4;
    checkPage(h);
    doc.text(lines, MARGIN, y);
    y += h;
  };

  const bullet = (text) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(`• ${text}`, CONTENT_W - 4);
    const h = lines.length * 4.2 + 2;
    checkPage(h);
    doc.text(lines, MARGIN + 2, y);
    y += h;
  };

  const table = (headers, rows) => {
    checkPage(30);
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: CONTENT_W,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [232, 238, 247], textColor: [15, 23, 42], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  const note = (text) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, CONTENT_W - 12);
    const boxH = lines.length * 4 + 8;
    checkPage(boxH + 4);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, CONTENT_W, boxH);
    doc.setFillColor(245, 158, 11);
    doc.rect(MARGIN, y, 1.5, boxH, "F");
    doc.setTextColor(51, 65, 85);
    doc.text(lines, MARGIN + 6, y + 5);
    doc.setTextColor(0, 0, 0);
    y += boxH + 5;
  };

  // Cover
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Cura EMR Platform", MARGIN, y);
  y += 8;
  doc.setTextColor(0, 0, 0);
  h1("Lab Results & Imaging Integration Guide");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Setup process, responsibilities, and integration scope", MARGIN, y);
  y += 6;
  doc.text(
    `Document date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    MARGIN,
    y,
  );
  y += 10;
  doc.setTextColor(0, 0, 0);
  p(
    "This guide explains how Laboratory (Lab Results) and Medical Imaging work in Cura today, who is responsible for setup and operations, and how full external system integration (LIS / PACS / HL7) differs from the standard in-platform workflow.",
  );

  doc.addPage();
  y = MARGIN;

  h2("Contents");
  [
    "1. Lab Results Integration",
    "   1.1 What it means in Cura today",
    "   1.2 Setup process",
    "   1.3 Client responsibility",
    "   1.4 Cura responsibility",
    "   1.5 External LIS integration (optional)",
    "2. Imaging Integration",
    "   2.1 What it means in Cura today",
    "   2.2 Setup process",
    "   2.3 Client responsibility",
    "   2.4 Cura responsibility",
    "   2.5 External PACS integration (optional)",
    "3. Comparison summary",
    "4. Recommendations for proposals & contracts",
  ].forEach((line) => bullet(line));

  doc.addPage();
  y = MARGIN;

  h1("1. Lab Results Integration");

  h2("1.1 What it means in Cura today");
  p(
    "Lab management in Cura is primarily an in-platform clinical workflow, not an automatic feed from an external Laboratory Information System (LIS). The product supports:",
  );
  bullet("Ordering lab tests from the Lab Results module (doctor, nurse, lab technician, admin, and other clinical roles).");
  bullet("Status tracking through the lab lifecycle (e.g. pending → results entered → report generated).");
  bullet("Manual result entry and PDF generation for formal lab reports.");
  bullet("File storage for lab request and result documents (organization/patient folder structure).");
  bullet("Billing: lab test catalog and charges under Finance → Billing → Lab Tests pricing.");
  bullet("Access control via User Management roles and module permissions.");

  note(
    "Contract and roadmap materials describe HL7 and LIS automation (auto-import, critical values, trending). The Integrations screen lists “HL7, FHIR, Labs” as a clinical category. Working self-serve connectors today include Stripe, Twilio, QuickBooks, and NHS Digital—not a dedicated live LIS connector. Treat automated LIS as a custom integration project unless explicitly delivered.",
  );

  h2("1.2 Setup process (typical go-live)");
  table(
    ["Phase", "Who", "What happens"],
    [
      ["1. Tenant & access", "Client (admin)", "Create users and roles; grant Lab Results module access to lab_technician and ordering clinicians."],
      ["2. Service catalog", "Client (finance/admin)", "Configure tests and fees: Billing → Lab Tests (name, code, price, sample type)."],
      ["3. Documents", "Client (admin)", "Configure header/footer templates for branded lab PDFs."],
      ["4. Operations", "Client (clinical + lab)", "Clinicians order tests; lab staff enter results and distribute PDFs."],
      ["5. External LIS", "Client + Cura", "Optional: HL7/LIS auto-import—requires joint integration project."],
    ],
  );
  p(
    "Cura’s user manual lists four go-live prerequisites for all clinics: roles, shifts, fees/charges, and PDF header/footer. Lab setup aligns with fees (lab test catalog) and operational use of the Lab Results module.",
  );

  h2("1.3 Client responsibility");
  bullet("Define lab test menu and pricing in Billing → Lab Tests.");
  bullet("Assign staff roles and permissions (order vs enter vs approve vs view-only).");
  bullet("Run day-to-day workflow inside Cura (orders, results, patient communication).");
  bullet("For HL7/LIS projects: provide vendor specs, code mapping, network/firewall access, test data, and clinical UAT sign-off.");
  bullet("Maintain data quality: correct patient identity, NHS numbers, and order-to-result matching.");

  h2("1.4 Cura responsibility");
  bullet("Host multi-tenant application, APIs, database, and secure file storage.");
  bullet("Provide Lab Results UI, workflows, PDF tooling, and billing linkage.");
  bullet("Enforce role-based access and organization data isolation.");
  bullet("For contracted LIS/HL7 work: design interfaces, mapping, deployment, and support (project-based).");

  h2("1.5 External LIS integration (optional / custom)");
  p("Target capabilities from product specifications:");
  bullet("HL7 (or equivalent) for automated result import and patient/order matching.");
  bullet("Critical value alerts, historical trending, and provider review workflows.");
  p("Shared responsibilities for a LIS integration project:");
  table(
    ["Area", "Client", "Cura"],
    [
      ["Vendor & connectivity", "Select LIS; firewall, VPN, certificates", "Build and configure interface"],
      ["Code mapping", "Map local panels to Cura catalog", "Import and matching logic"],
      ["Testing", "Realistic orders and results", "Development and staging validation"],
      ["Go-live", "Clinical sign-off", "Monitoring and incident response"],
    ],
  );

  doc.addPage();
  y = MARGIN;

  h1("2. Imaging Integration");

  h2("2.1 What it means in Cura today");
  p(
    "Imaging in Cura is primarily an in-platform radiology workflow: order studies, upload image files, and complete radiology reports. Supported today:",
  );
  bullet("Imaging study orders (patient, provider, study type, clinical indication).");
  bullet("File upload including DICOM MIME types; storage under organization upload paths.");
  bullet("Radiology reporting with structured fields and status workflow.");
  bullet("Imaging service catalog and charges: Billing → Imaging / Radiology setup.");
  bullet("Role-based access for ordering vs reporting vs administration.");

  note(
    "Specifications mention PACS integration, DICOM viewing, and AI-assisted analysis. Current product focus is orders, uploads, and in-app reporting—not a full embedded PACS viewer or automatic modality routing. “Imaging Integration” in proposals should distinguish in-platform workflow vs optional PACS connectivity.",
  );

  h2("2.2 Setup process (typical go-live)");
  table(
    ["Phase", "Who", "What happens"],
    [
      ["1. Tenant & access", "Client (admin)", "Roles for ordering and reporting; Imaging module permissions."],
      ["2. Study catalog", "Client (finance/admin)", "Billing → Imaging: X-Ray, MRI, Ultrasound, etc., with charges."],
      ["3. Study types in UI", "Client (admin)", "Imaging module uses imaging_pricing for order dropdowns."],
      ["4. Documents", "Client (admin)", "Header/footer for radiology PDFs where applicable."],
      ["5. Operations", "Client (clinical + radiology)", "Order studies, upload images, complete reports."],
      ["6. External PACS", "Client + Cura", "Optional: DICOM routing from PACS—custom project."],
    ],
  );

  h2("2.3 Client responsibility");
  bullet("Configure imaging services and standard charges in Billing.");
  bullet("Define clinical workflow: who orders studies vs who signs reports.");
  bullet("Upload and manage studies in the Imaging module (or delegate to radiology staff).");
  bullet("For PACS: provide vendor, DICOM AE titles, routing rules, network, and acceptance testing.");
  bullet("Govern retention, access, and UK GDPR/clinical policies for diagnostic images.");

  h2("2.4 Cura responsibility");
  bullet("Platform hosting, imaging APIs, and secure file handling.");
  bullet("Order-to-report workflow linked to patients and billing catalog.");
  bullet("PDF/report features where implemented in the Imaging module.");
  bullet("Custom PACS/DICOM integration when contracted (worklist, C-STORE, viewer—project-based).");

  h2("2.5 External PACS integration (optional / custom)");
  p("Target capabilities from specifications:");
  bullet("DICOM compliance, secure transmission, web-based viewing, worklist from orders.");
  p("Shared responsibilities for PACS integration:");
  table(
    ["Area", "Client", "Cura"],
    [
      ["PACS & network", "Own PACS; VPN and certificates", "Integration architecture and build"],
      ["Modality routing", "PACS admin configuration", "Receive, store, display pipeline"],
      ["Workflow", "Clinical standards for reporting", "Order ↔ study association"],
      ["Testing", "Real DICOM studies and edge cases", "Performance and validation"],
    ],
  );

  doc.addPage();
  y = MARGIN;

  h1("3. Comparison summary");
  table(
    ["Topic", "In Cura today", "Full external integration"],
    [
      ["Lab", "Order → enter results → PDF → bill", "HL7 auto-import from LIS"],
      ["Imaging", "Order → upload → report → bill", "PACS DICOM push/pull + viewer"],
      ["Setup owner", "Client admin, finance, clinical", "Client IT + vendor + Cura engineering"],
      ["Integrations page", "Stripe, SMS, NHS, etc.", "Clinical/HL7 is category; lab/PACS is custom"],
    ],
  );

  h1("4. Recommendations for proposals & contracts");
  h3("Standard package (default)");
  p(
    "Describe client setup (roles, billing catalog for lab tests and imaging, PDF branding) and Cura platform delivery (modules, workflows, permissions, storage). Do not assume external LIS or PACS on day one.",
  );
  h3("Enhanced package (add-on)");
  p(
    "Document LIS (HL7) and PACS (DICOM) as separate implementation work: client provides vendor access, mapping, and testing; Cura delivers interface development, deployment, and support.",
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "© Cura Software Limited · Internal / client-facing integration guide · Generated from Cura EMR product documentation and codebase scope.",
    PAGE_W / 2,
    PAGE_H - 10,
    { align: "center", maxWidth: CONTENT_W },
  );

  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(OUT_FILE, Buffer.from(pdfBytes));
  console.log(`PDF written: ${OUT_FILE}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
