/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for pdfReportGenerator utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { generateFormalPdfReport, type PdfReportData } from './pdfReportGenerator';

test('generateFormalPdfReport generates valid jsPDF document with pages', () => {
  const mockData: PdfReportData = {
    lncRnaName: 'ALEX1 (Oryza sativa)',
    sequence: 'GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA',
    length: 65,
    gcPercent: 64.6,
    targetProteinName: 'OsJAZ1',
    proteinResult: {
      score: 0.78,
      bindingPropensity: 78.4,
      confidence: 'High',
      detectedRnaBindingMotifs: [{ motif: 'RRM1', position: 12, type: 'RBM' }],
      predictedInteractionRegions: [{ rnaRange: [1, 30], proteinRange: [5, 40], affinityScore: 82 }],
      breakdown: {
        electrostaticScore: 68.2,
        hydrophobicPropensity: 72.1,
        secondaryStructureAccessibility: 81.0,
        kmerCorrelation: 0.74,
      },
    },
    homologySubjectName: 'lncRNA-Rsm1',
    alignmentResult: {
      score: 112,
      alignedSeq1: 'GGGAGCCUUGGCUCC',
      alignedSeq2: 'AUGGCCUUGGAUCCG',
      matchLine: ' || |||||| |',
      identityPercent: 68.5,
      similarityPercent: 82.1,
      gaps: 2,
      length: 65,
    },
  };

  const doc = generateFormalPdfReport(mockData);
  assert.ok(doc, 'Should produce a valid jsPDF object');
  const pdfOutput = doc.output('arraybuffer');
  assert.ok(pdfOutput.byteLength > 1000, 'PDF buffer should be non-empty');
});
