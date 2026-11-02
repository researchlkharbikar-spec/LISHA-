/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Secondary Structure Energy Stability Profile Calculator
 * Calculates sliding-window free energy (ΔG°37), base-pair density,
 * and structural accessibility profiles across RNA sequences.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import { cleanSequence, predictRnaSecondaryStructure } from './bioCalculations';

export interface EnergyDataPoint {
  position: number; // 1-indexed position in sequence
  base: string; // 'A', 'C', 'G', or 'U'
  windowStart: number;
  windowEnd: number;
  deltaG: number; // Local folding free energy in kcal/mol (negative = stable)
  gcPercent: number; // Local GC% in window
  basePairsCount: number; // Predicted base pairs in local window
  accessibilityScore: number; // 0.0 to 1.0 (higher = more exposed/unpaired)
  structureState: 'Stable Duplex' | 'Moderate Fold' | 'Flexible Loop / Accessible';
}

export interface EnergyProfileSummary {
  sequenceLength: number;
  windowSize: number;
  meanDeltaG: number;
  minDeltaG: number;
  minDeltaGPos: number; // Position of highest structural stability
  maxDeltaG: number;
  maxDeltaGPos: number; // Position of highest loop flexibility / accessibility
  stableDomainsCount: number;
  flexiblePocketsCount: number;
  stableDomains: {
    start: number;
    end: number;
    length: number;
    minDeltaG: number;
    sequence: string;
    description: string;
  }[];
  flexiblePockets: {
    start: number;
    end: number;
    length: number;
    maxDeltaG: number;
    sequence: string;
    description: string;
  }[];
}

export interface EnergyProfileResult {
  dataPoints: EnergyDataPoint[];
  summary: EnergyProfileSummary;
}

/**
 * Calculates a sliding-window secondary structure energy stability profile across an RNA sequence.
 */
export function calculateEnergyProfile(
  sequence: string,
  windowSize = 25,
  stepSize = 1
): EnergyProfileResult {
  const seq = cleanSequence(sequence);
  const n = seq.length;

  if (n === 0) {
    return {
      dataPoints: [],
      summary: {
        sequenceLength: 0,
        windowSize,
        meanDeltaG: 0,
        minDeltaG: 0,
        minDeltaGPos: 0,
        maxDeltaG: 0,
        maxDeltaGPos: 0,
        stableDomainsCount: 0,
        flexiblePocketsCount: 0,
        stableDomains: [],
        flexiblePockets: [],
      },
    };
  }

  // Adjust window size if sequence is shorter
  const w = Math.min(Math.max(8, windowSize), Math.max(8, n));
  const halfW = Math.floor(w / 2);
  const dataPoints: EnergyDataPoint[] = [];

  let sumDeltaG = 0;
  let minDeltaG = Infinity;
  let minDeltaGPos = 1;
  let maxDeltaG = -Infinity;
  let maxDeltaGPos = 1;

  for (let i = 0; i < n; i += stepSize) {
    const pos = i + 1; // 1-indexed
    const start = Math.max(0, i - halfW);
    const end = Math.min(n, i + halfW + 1);
    const windowSeq = seq.slice(start, end);
    const wLen = windowSeq.length;

    // Secondary structure prediction for local window
    const localStruct = predictRnaSecondaryStructure(windowSeq);
    const localDeltaG = localStruct.estimatedMfeKcal;
    const bpCount = localStruct.basePairs.length;

    // Local GC content
    const gcCount = (windowSeq.match(/[GC]/g) || []).length;
    const gcPct = wLen > 0 ? Math.round((gcCount / wLen) * 1000) / 10 : 0;

    // Accessibility score: fraction of nucleotides in window that are unpaired (dot '.')
    const pairedNts = bpCount * 2;
    const unpairedNts = Math.max(0, wLen - pairedNts);
    const accessibilityScore = wLen > 0 ? Math.round((unpairedNts / wLen) * 100) / 100 : 1;

    // Structural state classification
    let state: EnergyDataPoint['structureState'] = 'Moderate Fold';
    if (localDeltaG <= -4.5 || (bpCount >= Math.floor(wLen / 4) && localDeltaG < -2.5)) {
      state = 'Stable Duplex';
    } else if (localDeltaG >= -1.0 || accessibilityScore >= 0.7) {
      state = 'Flexible Loop / Accessible';
    }

    if (localDeltaG < minDeltaG) {
      minDeltaG = localDeltaG;
      minDeltaGPos = pos;
    }
    if (localDeltaG > maxDeltaG) {
      maxDeltaG = localDeltaG;
      maxDeltaGPos = pos;
    }

    sumDeltaG += localDeltaG;

    dataPoints.push({
      position: pos,
      base: seq[i],
      windowStart: start + 1,
      windowEnd: end,
      deltaG: localDeltaG,
      gcPercent: gcPct,
      basePairsCount: bpCount,
      accessibilityScore,
      structureState: state,
    });
  }

  const pointCount = dataPoints.length;
  const meanDeltaG = pointCount > 0 ? Math.round((sumDeltaG / pointCount) * 100) / 100 : 0;

  // Identify distinct stable domains (continuous regions where deltaG <= threshold)
  const stableThreshold = Math.min(-2.5, meanDeltaG - 1.0);
  const flexibleThreshold = Math.max(-1.0, meanDeltaG + 1.2);

  const stableDomains: EnergyProfileSummary['stableDomains'] = [];
  let inStable = false;
  let domStart = 0;
  let domMin = Infinity;

  for (let idx = 0; idx < dataPoints.length; idx++) {
    const pt = dataPoints[idx];
    if (pt.deltaG <= stableThreshold) {
      if (!inStable) {
        inStable = true;
        domStart = pt.position;
        domMin = pt.deltaG;
      } else {
        domMin = Math.min(domMin, pt.deltaG);
      }
    } else {
      if (inStable) {
        inStable = false;
        const domEnd = dataPoints[idx - 1].position;
        if (domEnd - domStart + 1 >= 4) {
          const subseq = seq.slice(domStart - 1, domEnd);
          stableDomains.push({
            start: domStart,
            end: domEnd,
            length: domEnd - domStart + 1,
            minDeltaG: domMin,
            sequence: subseq,
            description: `Stable structural stem core (MFE ${domMin} kcal/mol)`,
          });
        }
      }
    }
  }
  if (inStable) {
    const domEnd = dataPoints[dataPoints.length - 1].position;
    if (domEnd - domStart + 1 >= 4) {
      stableDomains.push({
        start: domStart,
        end: domEnd,
        length: domEnd - domStart + 1,
        minDeltaG: domMin,
        sequence: seq.slice(domStart - 1, domEnd),
        description: `Stable 3'-terminal structural core (MFE ${domMin} kcal/mol)`,
      });
    }
  }

  // Identify flexible pockets (continuous regions where deltaG >= flexibleThreshold)
  const flexiblePockets: EnergyProfileSummary['flexiblePockets'] = [];
  let inFlexible = false;
  let flexStart = 0;
  let flexMax = -Infinity;

  for (let idx = 0; idx < dataPoints.length; idx++) {
    const pt = dataPoints[idx];
    if (pt.deltaG >= flexibleThreshold) {
      if (!inFlexible) {
        inFlexible = true;
        flexStart = pt.position;
        flexMax = pt.deltaG;
      } else {
        flexMax = Math.max(flexMax, pt.deltaG);
      }
    } else {
      if (inFlexible) {
        inFlexible = false;
        const flexEnd = dataPoints[idx - 1].position;
        if (flexEnd - flexStart + 1 >= 4) {
          flexiblePockets.push({
            start: flexStart,
            end: flexEnd,
            length: flexEnd - flexStart + 1,
            maxDeltaG: flexMax,
            sequence: seq.slice(flexStart - 1, flexEnd),
            description: `Flexible open loop pocket (Accessibility ${(
              (dataPoints[idx - 1].accessibilityScore || 0) * 100
            ).toFixed(0)}%)`,
          });
        }
      }
    }
  }
  if (inFlexible) {
    const flexEnd = dataPoints[dataPoints.length - 1].position;
    if (flexEnd - flexStart + 1 >= 4) {
      flexiblePockets.push({
        start: flexStart,
        end: flexEnd,
        length: flexEnd - flexStart + 1,
        maxDeltaG: flexMax,
        sequence: seq.slice(flexStart - 1, flexEnd),
        description: `Flexible 3'-terminal open loop pocket`,
      });
    }
  }

  return {
    dataPoints,
    summary: {
      sequenceLength: n,
      windowSize: w,
      meanDeltaG,
      minDeltaG: minDeltaG === Infinity ? 0 : minDeltaG,
      minDeltaGPos,
      maxDeltaG: maxDeltaG === -Infinity ? 0 : maxDeltaG,
      maxDeltaGPos,
      stableDomainsCount: stableDomains.length,
      flexiblePocketsCount: flexiblePockets.length,
      stableDomains,
      flexiblePockets,
    },
  };
}
