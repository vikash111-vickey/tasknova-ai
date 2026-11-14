import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { getRepository } from '../../repository';
import { ProofLedger } from './proofLedger';
import { TrustScoreCalculator } from './trustScore';

export class ProofCertificateGenerator {
  /**
   * Generates a formal, cryptographic Proof Certificate PDF.
   */
  public static async generateCertificatePdf(taskId: string, userId: string): Promise<Uint8Array> {
    const repo = getRepository();
    const task = await repo.getTaskById(taskId, userId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found.`);
    }

    const steps = await repo.getTaskSteps(taskId);
    const evidenceList = await repo.getEvidenceRecords(taskId);
    const ledgerEntries = await repo.getProofLedgerByTaskId(taskId);
    const chainCheck = await ProofLedger.getInstance().verifyChain(taskId);
    const trustBreakdown = await TrustScoreCalculator.calculateTaskTrustScore(taskId, userId);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard Letter size
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const margin = 40;
    let yPos = 750;

    // Background Watermark [DEMO]
    page.drawText('DEMO CERTIFICATE', {
      x: 100,
      y: 380,
      size: 42,
      font: fontBold,
      color: rgb(0.92, 0.94, 0.97),
      rotate: degrees(45),
    });

    // Top Header
    page.drawText('TASKNOVA AUTONOMOUS PROOF CERTIFICATE', {
      x: margin,
      y: yPos,
      size: 18,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.2),
    });
    yPos -= 18;

    page.drawText('Cryptographically Verifiable Execution & State Verification Audit Ledger [DEMO]', {
      x: margin,
      y: yPos,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });
    yPos -= 20;

    // Divider Line
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: 612 - margin, y: yPos },
      thickness: 1.5,
      color: rgb(0.2, 0.5, 0.9),
    });
    yPos -= 25;

    // Task Metadata Box
    page.drawRectangle({
      x: margin,
      y: yPos - 85,
      width: 612 - margin * 2,
      height: 95,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 1.0),
    });

    page.drawText(`Task Title: ${task.title}`, {
      x: margin + 12,
      y: yPos - 5,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.2),
    });

    page.drawText(`Task ID: ${task.id}   |   Mode: ${task.mode.toUpperCase()} (Zero-Knowledge Verified)`, {
      x: margin + 12,
      y: yPos - 22,
      size: 8.5,
      font: fontMono,
      color: rgb(0.3, 0.35, 0.45),
    });

    const instructionSnippet = task.instructions.length > 95
      ? task.instructions.substring(0, 92) + '...'
      : task.instructions;
    page.drawText(`Instruction: "${instructionSnippet}"`, {
      x: margin + 12,
      y: yPos - 38,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35),
    });

    page.drawText(`Final Task Status: ${task.status}   |   Execution Trust Score: ${trustBreakdown.trustScore}/100`, {
      x: margin + 12,
      y: yPos - 55,
      size: 10,
      font: fontBold,
      color: task.status === 'COMPLETED' ? rgb(0.05, 0.6, 0.35) : rgb(0.8, 0.2, 0.1),
    });

    page.drawText(`Trust Formula: ${trustBreakdown.explanation}`, {
      x: margin + 12,
      y: yPos - 72,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });
    yPos -= 105;

    // Integrity Status Banner
    const isChainIntact = chainCheck.valid;
    page.drawRectangle({
      x: margin,
      y: yPos - 35,
      width: 612 - margin * 2,
      height: 42,
      borderColor: isChainIntact ? rgb(0.1, 0.7, 0.4) : rgb(0.9, 0.2, 0.2),
      borderWidth: 1.5,
      color: isChainIntact ? rgb(0.94, 0.99, 0.96) : rgb(1.0, 0.95, 0.95),
    });

    const statusBannerText = isChainIntact
      ? 'PROOF CHAIN INTEGRITY: 100% VERIFIED INTACT (0 BROKEN LINKS)'
      : `PROOF CHAIN TAMPERING DETECTED: BROKEN AT BLOCK #${chainCheck.brokenLinkIndex}`;
    page.drawText(statusBannerText, {
      x: margin + 12,
      y: yPos - 12,
      size: 11,
      font: fontBold,
      color: isChainIntact ? rgb(0.05, 0.55, 0.3) : rgb(0.85, 0.15, 0.15),
    });

    const rootHashSnippet = chainCheck.rootHash ? `${chainCheck.rootHash.substring(0, 20)}...` : 'None';
    const tipHashSnippet = chainCheck.latestHash ? `${chainCheck.latestHash.substring(0, 20)}...` : 'None';
    page.drawText(`Chain Length: ${chainCheck.chainLength} Blocks   |   Root Hash: ${rootHashSnippet}   |   Tip Hash: ${tipHashSnippet}`, {
      x: margin + 12,
      y: yPos - 27,
      size: 8,
      font: fontMono,
      color: rgb(0.2, 0.3, 0.4),
    });
    yPos -= 55;

    // Section 1: Verified Execution Steps & Evidence
    page.drawText('1. Independent Verification & State Evidence Records', {
      x: margin,
      y: yPos,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    yPos -= 18;

    const evidenceMap = new Map(evidenceList.map((e) => [e.operationId, e]));

    for (let i = 0; i < steps.length && i < 6; i++) {
      const step = steps[i];
      const ev = evidenceMap.get(step.id);
      const evStatus = ev?.status || step.verification_status || 'PENDING';
      const evSummary = ev?.evidenceSummary || 'Pending verification check';
      const refId = ev?.providerReferenceId || '-';

      page.drawText(`${i + 1}. [${evStatus}] ${step.name} (${step.action})`, {
        x: margin + 8,
        y: yPos,
        size: 9.5,
        font: fontBold,
        color: evStatus === 'VERIFIED' ? rgb(0.05, 0.55, 0.3) : rgb(0.7, 0.2, 0.1),
      });
      yPos -= 13;

      const summaryLine = evSummary.length > 100 ? evSummary.substring(0, 97) + '...' : evSummary;
      page.drawText(`   Evidence: ${summaryLine} (Ref: ${refId})`, {
        x: margin + 8,
        y: yPos,
        size: 8,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.5),
      });
      yPos -= 16;
    }
    yPos -= 10;

    // Section 2: Cryptographic Proof Ledger Chain
    page.drawText('2. Cryptographic Proof Ledger Block Hashes (Merkle Chain)', {
      x: margin,
      y: yPos,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    yPos -= 18;

    for (let i = 0; i < ledgerEntries.length && i < 6; i++) {
      const entry = ledgerEntries[i];
      const prevSnippet = `${entry.previousHash.substring(0, 16)}...`;
      const proofSnippet = `${entry.proofHash.substring(0, 24)}...`;

      page.drawText(`Block #${i + 1} (${entry.action}):`, {
        x: margin + 8,
        y: yPos,
        size: 8.5,
        font: fontBold,
        color: rgb(0.15, 0.2, 0.3),
      });
      yPos -= 12;

      page.drawText(`   Prev: ${prevSnippet}  ==>  Hash: ${proofSnippet}`, {
        x: margin + 8,
        y: yPos,
        size: 8,
        font: fontMono,
        color: rgb(0.1, 0.45, 0.7),
      });
      yPos -= 14;
    }

    // Footer
    page.drawLine({
      start: { x: margin, y: 50 },
      end: { x: 612 - margin, y: 50 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText('Official TaskNova Cryptographic Proof Certificate. Validated via sha256 Merkle chain. DEMO CERTIFICATE.', {
      x: margin,
      y: 36,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.65),
    });

    return pdfDoc.save();
  }
}
