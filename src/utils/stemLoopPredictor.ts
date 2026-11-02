/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Secondary Structure Stem-Loop Prediction & Fold-Energy Estimator
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import { cleanSequence } from './bioCalculations';

export interface StemBasePair {
  pos5: number; // 1-indexed
  pos3: number; // 1-indexed
  base5: string;
  base3: string;
  pairType: 'GC' | 'AU' | 'GU';
  stackingDeltaG: number; // kcal/mol
}

export interface StemLoopFoldEnergy {
  deltaG37: number; // Total net free energy in kcal/mol
  stemDeltaG: number; // Stacking stabilization (negative)
  loopPenalty: number; // Loop strain destabilization (positive)
  specialBonus: number; // Tetraloop or motif stabilization bonus (negative)
  terminalPenalty: number; // Terminal AU/GU penalty
  meltingTemperatureTm: number; // Unimolecular Tm in °C
  stability: 'Highly Stable' | 'Stable' | 'Moderately Stable' | 'Weak / Transient';
}

export interface StemLoopCandidate {
  id: string;
  name: string;
  start: number; // 1-indexed start
  end: number; // 1-indexed end
  length: number;
  stemLength: number; // number of base pairs
  loopLength: number; // number of unpaired nucleotides
  stem5Prime: string;
  loopSequence: string;
  stem3Prime: string;
  fullSequence: string;
  dotBracket: string;
  basePairs: StemBasePair[];
  gcContentPercent: number;
  foldEnergy: StemLoopFoldEnergy;
  hasTetraloop: boolean;
  tetraloopMotif: string | null;
  biologicalRoleHint: string;
}

export interface StemLoopOptions {
  minStemLength?: number; // default 3 bp
  maxStemLength?: number; // default 14 bp
  minLoopLength?: number; // default 3 nt
  maxLoopLength?: number; // default 9 nt
  allowWobble?: boolean; // allow G-U wobble pairs
  maxMismatchesInStem?: number; // allow 0 or 1 bulge/mismatch
  maxCandidates?: number; // max results returned
}

/**
 * Checks if two RNA nucleotides can form Watson-Crick (G-C, A-U) or Wobble (G-U) pair.
 */
export function isRnaBasePair(a: string, b: string, allowWobble = true): 'GC' | 'AU' | 'GU' | null {
  const pair = `${a}${b}`;
  if (pair === 'GC' || pair === 'CG') return 'GC';
  if (pair === 'AU' || pair === 'UA') return 'AU';
  if (allowWobble && (pair === 'GU' || pair === 'UG')) return 'GU';
  return null;
}

/**
 * Turner / SantaLucia Nearest-Neighbor RNA stacking free energies (kcal/mol at 37°C)
 */
const RNA_STACKING_ENERGY_TABLE: Record<string, number> = {
  // GC stacks
  'GC/CG': -3.4,
  'CG/GC': -2.4,
  'GG/CC': -3.3,
  'CC/GG': -3.3,
  // AU stacks
  'AU/UA': -1.1,
  'UA/AU': -1.3,
  'AA/UU': -0.9,
  'UU/AA': -0.9,
  // Mixed GC/AU stacks
  'GA/CU': -2.4,
  'UC/AG': -2.4,
  'AC/UG': -2.1,
  'GU/CA': -2.1,
  'AG/UC': -2.1,
  'CU/GA': -2.1,
  'CA/GU': -2.1,
  'UG/AC': -2.1,
  // GU Wobble stacks
  'GG/UC': -1.5,
  'CU/GG': -1.5,
  'UG/AU': -1.0,
  'UA/GU': -1.0,
  'GU/UG': -0.5,
  'UG/GU': -0.5,
};

/**
 * Estimates stacking free energy of adjacent base pairs
 */
function getStackingDeltaG(pair1: { base5: string; base3: string }, pair2: { base5: string; base3: string }): number {
  const key1 = `${pair1.base5}${pair2.base5}/${pair1.base3}${pair2.base3}`;
  const key2 = `${pair2.base5}${pair1.base5}/${pair2.base3}${pair1.base3}`;
  if (RNA_STACKING_ENERGY_TABLE[key1] !== undefined) return RNA_STACKING_ENERGY_TABLE[key1];
  if (RNA_STACKING_ENERGY_TABLE[key2] !== undefined) return RNA_STACKING_ENERGY_TABLE[key2];

  // Fallback estimation by pair types
  const p1Type = isRnaBasePair(pair1.base5, pair1.base3);
  const p2Type = isRnaBasePair(pair2.base5, pair2.base3);
  if (p1Type === 'GC' && p2Type === 'GC') return -2.8;
  if (p1Type === 'GC' || p2Type === 'GC') return -2.1;
  if (p1Type === 'AU' && p2Type === 'AU') return -1.1;
  return -0.8;
}

/**
 * Hairpin loop destabilization penalties (Turner 2004 rules in kcal/mol at 37°C)
 */
const HAIRPIN_LOOP_PENALTY: Record<number, number> = {
  3: 5.7,
  4: 5.6,
  5: 5.6,
  6: 5.4,
  7: 5.9,
  8: 6.2,
  9: 6.4,
  10: 6.6,
};

/**
 * Known ultra-stable tetraloop sequences (GNRA and UNCG motifs)
 */
const STABLE_TETRALOOPS = new Set([
  'GAAA', 'GAGA', 'GGAA', 'GCAA', // GNRA family
  'UUCG', 'UACG', // UNCG family
  'CUYG', 'CUUG',
]);

/**
 * Computes thermodynamic fold-energy of a predicted stem-loop.
 */
export function estimateStemLoopFoldEnergy(
  basePairs: StemBasePair[],
  loopSeq: string,
  stem5: string,
  stem3: string
): StemLoopFoldEnergy {
  if (basePairs.length < 2) {
    return {
      deltaG37: 1.5,
      stemDeltaG: -1.0,
      loopPenalty: 5.5,
      specialBonus: 0,
      terminalPenalty: 0.5,
      meltingTemperatureTm: 25.0,
      stability: 'Weak / Transient',
    };
  }

  // 1. Stacking stabilization
  let stemDeltaG = 0;
  for (let k = 0; k < basePairs.length - 1; k++) {
    const stack = getStackingDeltaG(basePairs[k], basePairs[k + 1]);
    basePairs[k].stackingDeltaG = stack;
    stemDeltaG += stack;
  }

  // 2. Loop initiation penalty
  const loopLen = loopSeq.length;
  let loopPenalty = HAIRPIN_LOOP_PENALTY[loopLen] || (5.4 + 1.75 * Math.log(Math.max(1, loopLen / 6)));

  // 3. Tetraloop bonus
  let specialBonus = 0;
  if (loopLen === 4 && STABLE_TETRALOOPS.has(loopSeq)) {
    specialBonus = -1.8; // Significant 1.8 kcal/mol stabilization
  }

  // 4. Terminal AU / GU penalty (last base pair closing the loop)
  const closingPair = basePairs[basePairs.length - 1];
  let terminalPenalty = 0;
  if (closingPair.pairType === 'AU' || closingPair.pairType === 'GU') {
    terminalPenalty = 0.45;
  }

  // Net Gibbs free energy
  const deltaG37 = Math.round((stemDeltaG + loopPenalty + specialBonus + terminalPenalty) * 100) / 100;

  // Unimolecular hairpin melting temperature (Tm)
  // Approximate enthalpy: ~ -8.0 kcal/mol per base pair, entropy: ~ -22.0 cal/(mol·K)
  const approxDeltaH = basePairs.length * -8.2 + (loopLen === 4 && specialBonus < 0 ? -4.5 : 0);
  const approxDeltaS = (approxDeltaH - deltaG37) / 310.15; // from dG = dH - T*dS
  let tm = Math.abs(approxDeltaS) > 0.001 ? Math.round((approxDeltaH / approxDeltaS - 273.15) * 10) / 10 : 45.0;

  // Guard realistic biological limits
  tm = Math.max(15, Math.min(95, tm));

  // Stability classification
  let stability: StemLoopFoldEnergy['stability'] = 'Weak / Transient';
  if (deltaG37 <= -6.0) stability = 'Highly Stable';
  else if (deltaG37 <= -2.5) stability = 'Stable';
  else if (deltaG37 <= 0.0) stability = 'Moderately Stable';

  return {
    deltaG37,
    stemDeltaG: Math.round(stemDeltaG * 100) / 100,
    loopPenalty: Math.round(loopPenalty * 100) / 100,
    specialBonus: Math.round(specialBonus * 100) / 100,
    terminalPenalty: Math.round(terminalPenalty * 100) / 100,
    meltingTemperatureTm: tm,
    stability,
  };
}

/**
 * Predicts potential stem-loop regions within an lncRNA sequence using fold-energy estimation.
 */
export function predictStemLoops(sequence: string, options: StemLoopOptions = {}): StemLoopCandidate[] {
  const seq = cleanSequence(sequence);
  const n = seq.length;
  if (n < 9) return [];

  const minStem = options.minStemLength ?? 3;
  const maxStem = options.maxStemLength ?? 12;
  const minLoop = options.minLoopLength ?? 3;
  const maxLoop = options.maxLoopLength ?? 8;
  const allowWobble = options.allowWobble ?? true;
  const maxCandidates = options.maxCandidates ?? 25;

  const rawCandidates: StemLoopCandidate[] = [];

  // Sliding window search for hairpin centers
  for (let loopStart = minStem; loopStart <= n - minStem - minLoop; loopStart++) {
    for (let loopLen = minLoop; loopLen <= maxLoop && loopStart + loopLen <= n - minStem; loopLen++) {
      const loopEnd = loopStart + loopLen - 1; // 0-indexed inclusive
      const loopSeq = seq.slice(loopStart, loopEnd + 1);

      // Expand stem outwards
      const basePairs: StemBasePair[] = [];
      let left = loopStart - 1;
      let right = loopEnd + 1;
      let mismatchesAllowed = options.maxMismatchesInStem ?? 0;

      while (left >= 0 && right < n && basePairs.length < maxStem) {
        const pType = isRnaBasePair(seq[left], seq[right], allowWobble);
        if (pType) {
          basePairs.push({
            pos5: left + 1, // 1-indexed
            pos3: right + 1, // 1-indexed
            base5: seq[left],
            base3: seq[right],
            pairType: pType,
            stackingDeltaG: 0,
          });
          left--;
          right++;
        } else if (mismatchesAllowed > 0 && basePairs.length >= 2) {
          // Allow single non-pairing nucleotide if subsequent forms a pair
          mismatchesAllowed--;
          left--;
          right++;
        } else {
          break;
        }
      }

      if (basePairs.length >= minStem) {
        // Base pairs are currently from inside (near loop) to outside. Reverse so 5' is ordered 0 -> stemLen
        const orderedPairs = [...basePairs].reverse();
        const startPos = orderedPairs[0].pos5;
        const endPos = orderedPairs[0].pos3;
        const stem5Prime = orderedPairs.map((p) => p.base5).join('');
        const stem3Prime = orderedPairs.map((p) => p.base3).reverse().join('');
        const fullSubseq = seq.slice(startPos - 1, endPos);

        // Build dot-bracket
        const stemLen = orderedPairs.length;
        const dotBracket = '('.repeat(stemLen) + '.'.repeat(loopLen) + ')'.repeat(stemLen);

        // Fold-energy estimation
        const foldEnergy = estimateStemLoopFoldEnergy(orderedPairs, loopSeq, stem5Prime, stem3Prime);

        // Tetraloop detection
        const hasTetraloop = loopLen === 4 && STABLE_TETRALOOPS.has(loopSeq);
        const tetraloopMotif = hasTetraloop ? loopSeq : null;

        // Biological role hint
        let biologicalRoleHint = 'Structural RNA scaffold element';
        if (hasTetraloop) {
          biologicalRoleHint = `Ultra-stable ${loopSeq} tetraloop: potential protein docking site or RNase protection cap`;
        } else if (foldEnergy.stability === 'Highly Stable') {
          biologicalRoleHint = 'Thermodynamically resilient hairpin: ideal candidate for structural riboswitch or ceRNA core';
        } else if (orderedPairs.some((p) => p.pairType === 'GU')) {
          biologicalRoleHint = 'Contains flexible G-U wobble pairs: allows conformational switching in response to thermal/abiotic stress';
        } else if (loopSeq.includes('AU') || loopSeq.includes('UA')) {
          biologicalRoleHint = 'AU-rich loop: potential miRNA seed-targeting or RNA-binding protein (RBM) recognition pocket';
        }

        // GC content
        const gcCount = (fullSubseq.match(/[GC]/g) || []).length;
        const gcContentPercent = Math.round((gcCount / fullSubseq.length) * 1000) / 10;

        rawCandidates.push({
          id: `sl_${startPos}_${endPos}_${stemLen}bp`,
          name: `Stem-Loop (${startPos}–${endPos})`,
          start: startPos,
          end: endPos,
          length: fullSubseq.length,
          stemLength: stemLen,
          loopLength: loopLen,
          stem5Prime,
          loopSequence: loopSeq,
          stem3Prime,
          fullSequence: fullSubseq,
          dotBracket,
          basePairs: orderedPairs,
          gcContentPercent,
          foldEnergy,
          hasTetraloop,
          tetraloopMotif,
          biologicalRoleHint,
        });
      }
    }
  }

  // Filter overlapping candidates: prefer lower (more negative) deltaG37 and longer stems
  rawCandidates.sort((a, b) => a.foldEnergy.deltaG37 - b.foldEnergy.deltaG37);

  const selected: StemLoopCandidate[] = [];
  for (const cand of rawCandidates) {
    // Check if heavily redundant with already selected candidate (sharing identical loop or >70% span)
    const isRedundant = selected.some((s) => {
      const overlapStart = Math.max(s.start, cand.start);
      const overlapEnd = Math.min(s.end, cand.end);
      const overlapLen = Math.max(0, overlapEnd - overlapStart + 1);
      const minLen = Math.min(s.length, cand.length);
      return overlapLen / minLen > 0.65;
    });

    if (!isRedundant) {
      selected.push(cand);
      if (selected.length >= maxCandidates) break;
    }
  }

  // Final sort: most stable (lowest deltaG) first
  return selected;
}
