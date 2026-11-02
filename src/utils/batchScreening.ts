/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Batch Screening Engine
 * Automated sequential homology, thermophysical, and secondary structure screening
 * for multi-sequence lncRNA datasets.
 */

import { validateLncRnaSequence, type SequenceValidationResult } from './sequenceValidator';
import { calculateNearestNeighborTm, type ThermodynamicParameters } from './thermodynamics';
import {
  predictRnaSecondaryStructure,
  compareQueryAgainstTemplates,
  type TemplateHomologyComparison,
  type SecondaryStructureResult,
} from './bioCalculations';
import { CURATED_LNCRNAS } from '../data/curatedLncRNAs';
import { discoverRegulatoryMotifs, type MotifDiscoveryResult } from './motifDiscovery';

export interface BatchInputRecord {
  id: string;
  name: string;
  rawSequence: string;
  species?: string;
  notes?: string;
}

export interface BatchScreeningItem {
  id: string;
  name: string;
  originalSequence: string;
  cleanedSequence: string;
  isValid: boolean;
  validationError: string | null;
  length: number;
  gcPercent: number;
  auPercent: number;
  // Thermophysical parameters
  tmSaltAdjusted: number; // °C
  tmBasic: number; // °C
  enthalpyDeltaH: number; // kcal/mol
  entropyDeltaS: number; // cal/(mol·K)
  freeEnergyDeltaG37: number; // kcal/mol
  stabilityCategory: string;
  // Secondary structure
  mfeKcal: number;
  basePairsCount: number;
  dotBracket: string;
  // Homology assessment
  topHomologyTemplate: string;
  topHomologySpecies: string;
  topHomologyDisease: string;
  topSimilarityPercent: number;
  topIdentityPercent: number;
  topAlignmentScore: number;
  homologyComparisons: TemplateHomologyComparison[];
  // Motif discovery
  motifHitsCount: number;
  abioticMotifHitsCount: number;
  bioticMotifHitsCount: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface BatchScreeningSummary {
  totalSequences: number;
  validSequences: number;
  invalidSequences: number;
  averageLength: number;
  averageTm: number;
  averageGcPercent: number;
  averageMfeKcal: number;
  dominantStressCategory: string;
  hyperStableCount: number;
  standardStableCount: number;
  labileCount: number;
}

/**
 * Parses multi-FASTA, CSV, TSV, or raw text input into structured BatchInputRecord list.
 */
export function parseBatchSequenceInput(rawText: string): BatchInputRecord[] {
  const text = (rawText || '').trim();
  if (!text) return [];

  const records: BatchInputRecord[] = [];

  // Check if FASTA format (starts with > or has > lines)
  if (text.includes('>')) {
    const lines = text.split(/\r?\n/);
    let currentId = '';
    let currentName = '';
    let currentSeq = '';
    let count = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        if (currentSeq.length > 0) {
          count++;
          records.push({
            id: currentId || `seq_${count}`,
            name: currentName || `lncRNA_${count}`,
            rawSequence: currentSeq,
          });
          currentSeq = '';
        }
        const headerContent = trimmed.slice(1).trim();
        const firstWord = headerContent.split(/\s+/)[0] || `seq_${count + 1}`;
        currentId = firstWord;
        currentName = headerContent;
      } else if (trimmed.length > 0) {
        currentSeq += trimmed;
      }
    }

    if (currentSeq.length > 0) {
      count++;
      records.push({
        id: currentId || `seq_${count}`,
        name: currentName || `lncRNA_${count}`,
        rawSequence: currentSeq,
      });
    }

    return records;
  }

  // Check if CSV or TSV (contains tabs or commas)
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let count = 0;

  for (const line of lines) {
    count++;
    let parts: string[] = [];

    if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else if (line.includes(',')) {
      // Basic CSV split
      parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    }

    if (parts.length >= 2) {
      const name = parts[0];
      const seq = parts[1];
      records.push({
        id: `batch_${count}`,
        name: name || `Sequence_${count}`,
        rawSequence: seq,
        notes: parts.slice(2).join('; '),
      });
    } else {
      // Single sequence per line
      records.push({
        id: `batch_${count}`,
        name: `Sequence_${count}`,
        rawSequence: line.trim(),
      });
    }
  }

  return records;
}

/**
 * Screens a single lncRNA record for automated sequential batch processing.
 */
export function screenSingleBatchSequence(input: BatchInputRecord): BatchScreeningItem {
  const validation: SequenceValidationResult = validateLncRnaSequence(input.rawSequence);

  if (!validation.isValid) {
    return {
      id: input.id,
      name: input.name,
      originalSequence: input.rawSequence,
      cleanedSequence: '',
      isValid: false,
      validationError: validation.errorMessage || 'Invalid nucleotide characters detected',
      length: 0,
      gcPercent: 0,
      auPercent: 0,
      tmSaltAdjusted: 0,
      tmBasic: 0,
      enthalpyDeltaH: 0,
      entropyDeltaS: 0,
      freeEnergyDeltaG37: 0,
      stabilityCategory: 'Invalid Sequence',
      mfeKcal: 0,
      basePairsCount: 0,
      dotBracket: '',
      topHomologyTemplate: 'N/A',
      topHomologySpecies: 'N/A',
      topHomologyDisease: 'N/A',
      topSimilarityPercent: 0,
      topIdentityPercent: 0,
      topAlignmentScore: 0,
      homologyComparisons: [],
      motifHitsCount: 0,
      abioticMotifHitsCount: 0,
      bioticMotifHitsCount: 0,
      status: 'error',
    };
  }

  const cleanSeq = validation.cleanedSequence;

  // 1. Thermophysical property calculation
  const thermo: ThermodynamicParameters = calculateNearestNeighborTm(cleanSeq);

  // 2. Secondary structure prediction
  const struct: SecondaryStructureResult = predictRnaSecondaryStructure(cleanSeq);

  // 3. Multi-template stress homology assessment
  const homologyList: TemplateHomologyComparison[] = compareQueryAgainstTemplates(cleanSeq, CURATED_LNCRNAS);
  const topHomology = homologyList[0] || null;

  // 4. Regulatory motif discovery
  const motifRes: MotifDiscoveryResult = discoverRegulatoryMotifs(cleanSeq);

  return {
    id: input.id,
    name: input.name,
    originalSequence: input.rawSequence,
    cleanedSequence: cleanSeq,
    isValid: true,
    validationError: null,
    length: cleanSeq.length,
    gcPercent: validation.composition.gcPercent,
    auPercent: validation.composition.auPercent,
    tmSaltAdjusted: thermo.saltAdjustedTm,
    tmBasic: thermo.basicTm,
    enthalpyDeltaH: thermo.enthalpyDeltaH,
    entropyDeltaS: thermo.entropyDeltaS,
    freeEnergyDeltaG37: thermo.freeEnergyDeltaG37,
    stabilityCategory: thermo.stabilityCategory,
    mfeKcal: struct.estimatedMfeKcal,
    basePairsCount: struct.basePairs.length,
    dotBracket: struct.dotBracket,
    topHomologyTemplate: topHomology ? topHomology.templateName : 'None',
    topHomologySpecies: topHomology ? topHomology.species : 'None',
    topHomologyDisease: topHomology ? topHomology.pathogen : 'None',
    topSimilarityPercent: topHomology ? topHomology.alignment.similarityPercent : 0,
    topIdentityPercent: topHomology ? topHomology.alignment.identityPercent : 0,
    topAlignmentScore: topHomology ? topHomology.alignment.score : 0,
    homologyComparisons: homologyList,
    motifHitsCount: motifRes.totalHitsCount,
    abioticMotifHitsCount: motifRes.categoryCounts['Abiotic Stress'],
    bioticMotifHitsCount: motifRes.categoryCounts['Biotic Defense'],
    status: 'completed',
  };
}

/**
 * Iteratively screens all batch input records with progress callbacks.
 */
export async function screenBatchSequences(
  records: BatchInputRecord[],
  onProgress?: (current: number, total: number, item: BatchScreeningItem) => void
): Promise<BatchScreeningItem[]> {
  const results: BatchScreeningItem[] = [];
  for (let i = 0; i < records.length; i++) {
    const item = screenSingleBatchSequence(records[i]);
    results.push(item);
    if (onProgress) {
      onProgress(i + 1, records.length, item);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }
  return results;
}

/**
 * Computes summary statistics over batch screening items.
 */
export function computeBatchScreeningSummary(items: BatchScreeningItem[]): BatchScreeningSummary {
  const total = items.length;
  const validItems = items.filter((i) => i.isValid);
  const validCount = validItems.length;
  const invalidCount = total - validCount;

  if (validCount === 0) {
    return {
      totalSequences: total,
      validSequences: 0,
      invalidSequences: invalidCount,
      averageLength: 0,
      averageTm: 0,
      averageGcPercent: 0,
      averageMfeKcal: 0,
      dominantStressCategory: 'None',
      hyperStableCount: 0,
      standardStableCount: 0,
      labileCount: 0,
    };
  }

  const avgLen = Math.round(validItems.reduce((acc, i) => acc + i.length, 0) / validCount);
  const avgTm = Math.round((validItems.reduce((acc, i) => acc + i.tmSaltAdjusted, 0) / validCount) * 10) / 10;
  const avgGc = Math.round((validItems.reduce((acc, i) => acc + i.gcPercent, 0) / validCount) * 10) / 10;
  const avgMfe = Math.round((validItems.reduce((acc, i) => acc + i.mfeKcal, 0) / validCount) * 10) / 10;

  let hyper = 0;
  let standard = 0;
  let labile = 0;

  const stressDiseaseCounts: Record<string, number> = {};

  validItems.forEach((i) => {
    if (i.stabilityCategory.includes('Hyper')) hyper++;
    else if (i.stabilityCategory.includes('Standard')) standard++;
    else labile++;

    if (i.topHomologyDisease && i.topHomologyDisease !== 'None') {
      stressDiseaseCounts[i.topHomologyDisease] = (stressDiseaseCounts[i.topHomologyDisease] || 0) + 1;
    }
  });

  let dominantStress = 'Multi-Stress Responsive';
  let maxStressCount = 0;
  Object.entries(stressDiseaseCounts).forEach(([dis, cnt]) => {
    if (cnt > maxStressCount) {
      maxStressCount = cnt;
      dominantStress = dis;
    }
  });

  return {
    totalSequences: total,
    validSequences: validCount,
    invalidSequences: invalidCount,
    averageLength: avgLen,
    averageTm: avgTm,
    averageGcPercent: avgGc,
    averageMfeKcal: avgMfe,
    dominantStressCategory: dominantStress,
    hyperStableCount: hyper,
    standardStableCount: standard,
    labileCount: labile,
  };
}

export const calculateBatchSummary = computeBatchScreeningSummary;

/**
 * Formats batch results into CSV.
 */
export function exportBatchToCsv(items: BatchScreeningItem[]): string {
  const header = [
    'Sequence_Name',
    'Status',
    'Length_nt',
    'GC_Percent',
    'AU_Percent',
    'Tm_Nearest_Neighbor_C',
    'Delta_G37_kcal_mol',
    'Delta_H_kcal_mol',
    'Delta_S_cal_mol_K',
    'Stability_Category',
    'MFE_2D_Fold_kcal_mol',
    'Base_Pairs_Count',
    'Top_Homology_Template',
    'Top_Homology_Disease',
    'Similarity_Percent',
    'Identity_Percent',
    'Alignment_Score',
    'Motifs_Detected',
    'Abiotic_Motifs',
    'Biotic_Motifs',
    'Sequence_RNA',
  ].join(',');

  const rows = items.map((item) =>
    [
      `"${item.name.replace(/"/g, '""')}"`,
      item.isValid ? 'Valid' : 'Invalid',
      item.length,
      item.gcPercent,
      item.auPercent,
      item.tmSaltAdjusted,
      item.freeEnergyDeltaG37,
      item.enthalpyDeltaH,
      item.entropyDeltaS,
      `"${item.stabilityCategory}"`,
      item.mfeKcal,
      item.basePairsCount,
      `"${item.topHomologyTemplate}"`,
      `"${item.topHomologyDisease}"`,
      item.topSimilarityPercent,
      item.topIdentityPercent,
      item.topAlignmentScore,
      item.motifHitsCount,
      item.abioticMotifHitsCount,
      item.bioticMotifHitsCount,
      item.cleanedSequence,
    ].join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Formats batch results into annotated Multi-FASTA format.
 */
export function exportBatchToMultiFasta(items: BatchScreeningItem[]): string {
  return items
    .filter((i) => i.isValid)
    .map(
      (i) =>
        `>${i.name} [length=${i.length}nt] [gc=${i.gcPercent}%] [tm_nn=${i.tmSaltAdjusted}°C] [dg37=${i.freeEnergyDeltaG37}kcal/mol] [mfe=${i.mfeKcal}kcal/mol] [top_homology="${i.topHomologyTemplate}"] [similarity=${i.topSimilarityPercent}%]\n${i.cleanedSequence}`
    )
    .join('\n\n');
}
