/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Formal PDF Screening Report Generator
 * Generates publication-ready PDF reports with biophysical parameters,
 * interaction scores, motif discoveries, and secondary structure metrics.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import { jsPDF } from 'jspdf';
import type {
  ProteinInteractionResult,
  MiRnaTargetResult,
  DnaTriplexResult,
  AlignmentResult,
  SecondaryStructureResult,
} from './bioCalculations';
import type { ThermodynamicParameters } from './thermodynamics';
import type { MotifDiscoveryResult } from './motifDiscovery';

export interface PdfReportData {
  lncRnaName: string;
  sequence: string;
  length: number;
  gcPercent: number;
  targetProteinName?: string;
  targetDnaName?: string;
  proteinResult?: ProteinInteractionResult | null;
  mirnaResults?: MiRnaTargetResult[] | null;
  triplexResults?: DnaTriplexResult[] | null;
  alignmentResult?: AlignmentResult | null;
  homologySubjectName?: string;
  structureResult?: SecondaryStructureResult | null;
  thermoResult?: ThermodynamicParameters | null;
  motifResult?: MotifDiscoveryResult | null;
  investigatorNotes?: string;
}

export function generateFormalPdfReport(data: PdfReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin + 5;
      drawHeaderWatermark();
    }
  };

  const drawHeaderWatermark = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('LISHA • ICAR-NIBSM Computational LncRNA Screening Platform', margin, margin);
    doc.text(`Ref: LISHA-${Date.now().toString().slice(-6)}`, pageWidth - margin, margin, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 2, pageWidth - margin, margin + 2);
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('LISHA FORMAL SCREENING & BIOPHYSICAL REPORT', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('ICAR-National Institute of Biotic Stress Management (NIBSM), Raipur, India', margin + 6, y + 14);
  doc.text('Principal Investigator: Prof. Lalit Laxman Kharbikar • LALITKHARBIKAR@gmail.com', margin + 6, y + 19);

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${timestamp}`, pageWidth - margin - 6, y + 8, { align: 'right' });

  y += 32;

  // Section 1: Target Overview Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Target Candidate: ${data.lncRnaName}`, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Length: ${data.length} nt`, margin + 5, y + 14);
  doc.text(`GC Content: ${data.gcPercent}%`, margin + 45, y + 14);
  doc.text(`AU Content: ${(100 - data.gcPercent).toFixed(1)}%`, margin + 85, y + 14);

  const tmVal = data.thermoResult ? `${data.thermoResult.saltAdjustedTm}°C` : 'N/A';
  const mfeVal = data.structureResult ? `${data.structureResult.estimatedMfeKcal} kcal/mol` : 'N/A';
  doc.text(`Nearest-Neighbor Tm: ${tmVal}`, margin + 5, y + 21);
  doc.text(`2D Fold MFE: ${mfeVal}`, margin + 65, y + 21);

  y += 31;

  // Section 2: Primary Interaction Scores
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('1. COMPUTATIONAL INTERACTION SCREENING SCORES', margin, y);
  y += 5;

  const colW = (contentWidth - 6) / 3;

  // Protein Box
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin, y, colW, 25, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('lncRNA-Protein', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  if (data.proteinResult) {
    const pName = data.targetProteinName || 'Target Protein';
    doc.text(`Target: ${pName.slice(0, 18)}`, margin + 3, y + 10);
    doc.text(`Propensity: ${data.proteinResult.bindingPropensity.toFixed(1)}%`, margin + 3, y + 15);
    doc.text(`Confidence: ${data.proteinResult.confidence}`, margin + 3, y + 20);
  } else {
    doc.text('Score: Available in Module 1', margin + 3, y + 12);
  }

  // miRNA Box
  const xMirna = margin + colW + 3;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(xMirna, y, colW, 25, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('lncRNA-miRNA Sponging', xMirna + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  if (data.mirnaResults && data.mirnaResults.length > 0) {
    const topMir = data.mirnaResults[0];
    doc.text(`miRNA: ${topMir.miRnaName.slice(0, 18)}`, xMirna + 3, y + 10);
    doc.text(`Efficiency: ${topMir.spongingEfficiency}%`, xMirna + 3, y + 15);
    doc.text(`Free Energy: ${topMir.freeEnergyKcal} kcal/mol`, xMirna + 3, y + 20);
  } else {
    doc.text('ceRNA Sponge: Active in Module 2', xMirna + 3, y + 12);
  }

  // DNA Triplex Box
  const xDna = margin + (colW + 3) * 2;
  doc.setFillColor(250, 245, 255); // purple-50
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(xDna, y, colW, 25, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 33, 168);
  doc.text('lncRNA-DNA Triplex', xDna + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  if (data.triplexResults && data.triplexResults.length > 0) {
    const topTri = data.triplexResults[0];
    doc.text(`Motif: ${topTri.motifType.slice(0, 18)}`, xDna + 3, y + 10);
    doc.text(`Triplex Score: ${topTri.triplexScore}%`, xDna + 3, y + 15);
    doc.text(`Matches: ${topTri.hoogsteenMatches} Hoogsteen bp`, xDna + 3, y + 20);
  } else {
    doc.text('Hoogsteen: Active in Module 3', xDna + 3, y + 12);
  }

  y += 30;

  // Section 3: Homology Alignment Summary
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('2. PLANT STRESS HOMOLOGY ASSESSMENT', margin, y);
  y += 5;

  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  if (data.alignmentResult) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Subject Template: ${data.homologySubjectName || 'Plant Stress Homolog'}`, margin + 4, y + 6);
    doc.text(`Sequence Similarity: ${data.alignmentResult.similarityPercent}%`, margin + 4, y + 11);
    doc.text(`Sequence Identity: ${data.alignmentResult.identityPercent}%`, margin + 55, y + 11);
    doc.text(`Bit Score: ${data.alignmentResult.score}`, margin + 105, y + 11);
    doc.text(`Alignment Length: ${data.alignmentResult.length} bp (Gaps: ${data.alignmentResult.gaps})`, margin + 4, y + 16);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Automated pairwise Smith-Waterman homology available in Module 4.', margin + 4, y + 10);
  }

  y += 26;

  // Section 4: Identified Conserved Regulatory Motifs
  checkPageBreak(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(109, 40, 217); // violet-700
  doc.text('3. CONSERVED REGULATORY MOTIF INVENTORY', margin, y);
  y += 5;

  if (data.motifResult && data.motifResult.hits.length > 0) {
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Motif Name', margin + 2, y + 4);
    doc.text('Category', margin + 45, y + 4);
    doc.text('Pattern', margin + 85, y + 4);
    doc.text('Coordinates', margin + 120, y + 4);
    doc.text('Biological Function', margin + 145, y + 4);
    y += 7;

    const displayedMotifs = data.motifResult.hits.slice(0, 7);
    displayedMotifs.forEach((hit) => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(hit.motifName.slice(0, 22), margin + 2, y + 3);
      doc.text(hit.category, margin + 45, y + 3);
      doc.setFont('courier', 'bold');
      doc.text(hit.matchedSequence, margin + 85, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.text(`${hit.start}–${hit.end} (${hit.length}nt)`, margin + 120, y + 3);
      doc.text(hit.description.slice(0, 26), margin + 145, y + 3);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 5, margin + contentWidth, y + 5);
      y += 6;
    });

    if (data.motifResult.hits.length > 7) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... and ${data.motifResult.hits.length - 7} additional motifs identified in full scan.`, margin + 2, y + 3);
      y += 6;
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Scanned against ICAR-NIBSM plant stress motif catalog (Module 8).', margin, y + 4);
    y += 8;
  }

  y += 5;

  // Section 5: Secondary Structure & Dot-Bracket
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text('4. SECONDARY STRUCTURE 2D FOLD (DOT-BRACKET)', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const dotStr = data.structureResult?.dotBracket || '.'.repeat(Math.min(60, data.length));
  const chunkedDot = dotStr.slice(0, 80);
  doc.text(`Dot-Bracket: ${chunkedDot}${dotStr.length > 80 ? '...' : ''}`, margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const bpNum = data.structureResult?.basePairs.length || 0;
  doc.text(`Predicted Base Pairs: ${bpNum} | Estimated MFE: ${mfeVal}`, margin + 3, y + 13);

  y += 23;

  // Section 5: Input Sequence Monospace Block
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`5. VALIDATED RNA SEQUENCE (${data.length} NT)`, margin, y);
  y += 5;

  const seqChars = data.sequence.replace(/[^ACGU]/g, '');
  const seqChunkSize = 70;
  const numLines = Math.ceil(seqChars.length / seqChunkSize);
  const displayLines = Math.min(numLines, 12);
  const blockHeight = displayLines * 4.5 + (numLines > 12 ? 8 : 4);

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(52, 211, 153); // emerald-400

  let seqY = y + 4.5;
  for (let i = 0; i < displayLines; i++) {
    const chunk = seqChars.slice(i * seqChunkSize, (i + 1) * seqChunkSize);
    const startCoord = String(i * seqChunkSize + 1).padStart(4, ' ');
    doc.text(`[${startCoord}] ${chunk}`, margin + 3, seqY);
    seqY += 4.2;
  }
  if (numLines > 12) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`... [Full transcript contains ${seqChars.length} nucleotides total. Verified via IUPAC validation.]`, margin + 3, seqY);
  }

  y += blockHeight + 7;

  // Section 6: Investigator Remarks
  if (data.investigatorNotes) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text('6. INVESTIGATOR REMARKS & SCREENING SESSION SUMMARY', margin, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(data.investigatorNotes, contentWidth - 6);
    doc.text(splitNotes, margin + 3, y + 5);
    y += 22;
  }

  // Footer / Attribution Block
  checkPageBreak(25);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('ICAR-National Institute of Biotic Stress Management', margin, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Baronda, Raipur - 493225, Chhattisgarh, India | Principal Scientist: Prof. Lalit Laxman Kharbikar', margin, y + 7);
  doc.text('Confidential Scientific Research Document Generated via LISHA Pro Suite', margin, y + 11);

  // Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  return doc;
}
