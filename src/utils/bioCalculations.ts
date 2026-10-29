/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA - LncRNA Interaction Screening and Homology Assessment
 * Core computational bioinformatics algorithms
 */

export interface AlignmentResult {
  score: number;
  alignedSeq1: string;
  alignedSeq2: string;
  matchLine: string;
  identityPercent: number;
  similarityPercent: number;
  gaps: number;
  length: number;
}

export interface SecondaryStructureResult {
  sequence: string;
  dotBracket: string;
  basePairs: [number, number][];
  gcContentPercent: number;
  estimatedMfeKcal: number;
}

export interface ProteinInteractionResult {
  score: number; // 0.0 - 1.0
  bindingPropensity: number; // 0 - 100%
  confidence: 'High' | 'Moderate' | 'Low';
  detectedRnaBindingMotifs: { motif: string; position: number; type: string }[];
  predictedInteractionRegions: { rnaRange: [number, number]; proteinRange: [number, number]; affinityScore: number }[];
  breakdown: {
    electrostaticScore: number;
    hydrophobicPropensity: number;
    secondaryStructureAccessibility: number;
    kmerCorrelation: number;
  };
}

export interface MiRnaTargetResult {
  miRnaName: string;
  miRnaSeq: string;
  lncRnaRange: [number, number];
  seedType: '8mer' | '7mer-m8' | '7mer-A1' | '6mer' | 'Non-canonical';
  seedMatchSeq: string;
  fullAlignmentRna: string;
  fullAlignmentMiRna: string;
  matchLine: string;
  freeEnergyKcal: number;
  spongingEfficiency: number; // 0 - 100%
}

export interface DnaTriplexResult {
  motifType: 'Parallel (Pyrimidine)' | 'Antiparallel (Purine)';
  tfoSequence: string; // Triplex Forming Oligonucleotide on lncRNA
  ttsSequence: string; // Triplex Target Site on DNA
  lncRnaRange: [number, number];
  dnaRange: [number, number];
  triplexScore: number;
  stabilityIndex: number;
  hoogsteenMatches: number;
  pyrimidineRatio: number;
}

export interface BioticStressSignature {
  hoursPostInoculation: number;
  lncRnaLog2FC: number;
  canopyTempDepressionDeltaT: number; // T_leaf - T_air (deg C)
  stomatalConductanceGs: number; // mmol m^-2 s^-1
  ebsdiScore: number; // Early Biotic Stress Detection Index (0-100)
  stressPhase: 'Normal / Baseline' | 'Early Recognition (Stomatal Closure)' | 'Active Defense / Signaling' | 'Symptomatic / Advanced';
  pathogenRiskLevel: 'Negligible' | 'Low / Vigilance' | 'Moderate / Early Warning' | 'High / Infection Confirmed';
}

/**
 * Validates RNA sequence (A, C, G, U / T)
 */
export function cleanSequence(raw: string): string {
  return raw.replace(/[^acgtuACGTU]/g, '').toUpperCase().replace(/T/g, 'U');
}

/**
 * Validates DNA sequence (A, C, G, T)
 */
export function cleanDnaSequence(raw: string): string {
  return raw.replace(/[^acgtACGT]/g, '').toUpperCase();
}

/**
 * Smith-Waterman Local Sequence Alignment (Nucleotide)
 */
export function smithWatermanAlign(
  seq1: string,
  seq2: string,
  matchReward = 2,
  mismatchPenalty = -1,
  gapPenalty = -2
): AlignmentResult {
  const s1 = cleanSequence(seq1);
  const s2 = cleanSequence(seq2);
  const m = s1.length;
  const n = s2.length;

  if (m === 0 || n === 0) {
    return {
      score: 0,
      alignedSeq1: '',
      alignedSeq2: '',
      matchLine: '',
      identityPercent: 0,
      similarityPercent: 0,
      gaps: 0,
      length: 0,
    };
  }

  const H: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let maxScore = 0;
  let maxI = 0;
  let maxJ = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = s1[i - 1] === s2[j - 1] ? matchReward : mismatchPenalty;
      const diag = H[i - 1][j - 1] + match;
      const up = H[i - 1][j] + gapPenalty;
      const left = H[i][j - 1] + gapPenalty;
      const score = Math.max(0, diag, up, left);
      H[i][j] = score;

      if (score > maxScore) {
        maxScore = score;
        maxI = i;
        maxJ = j;
      }
    }
  }

  // Traceback
  let currI = maxI;
  let currJ = maxJ;
  let al1 = '';
  let al2 = '';
  let matches = 0;
  let gaps = 0;

  while (currI > 0 && currJ > 0 && H[currI][currJ] > 0) {
    const current = H[currI][currJ];
    const match = s1[currI - 1] === s2[currJ - 1] ? matchReward : mismatchPenalty;

    if (current === H[currI - 1][currJ - 1] + match) {
      al1 = s1[currI - 1] + al1;
      al2 = s2[currJ - 1] + al2;
      if (s1[currI - 1] === s2[currJ - 1]) matches++;
      currI--;
      currJ--;
    } else if (current === H[currI - 1][currJ] + gapPenalty) {
      al1 = s1[currI - 1] + al1;
      al2 = '-' + al2;
      gaps++;
      currI--;
    } else {
      al1 = '-' + al1;
      al2 = s2[currJ - 1] + al2;
      gaps++;
      currJ--;
    }
  }

  let matchLine = '';
  for (let k = 0; k < al1.length; k++) {
    if (al1[k] === al2[k]) {
      matchLine += '|';
    } else if (al1[k] === '-' || al2[k] === '-') {
      matchLine += ' ';
    } else {
      matchLine += ':';
    }
  }

  const length = al1.length || 1;
  const identityPercent = Math.round((matches / length) * 1000) / 10;
  const similarityPercent = Math.round(((matches + (length - matches - gaps) * 0.5) / length) * 1000) / 10;

  return {
    score: maxScore,
    alignedSeq1: al1,
    alignedSeq2: al2,
    matchLine,
    identityPercent,
    similarityPercent,
    gaps,
    length,
  };
}

/**
 * Needleman-Wunsch Global Sequence Alignment
 */
export function needlemanWunschAlign(
  seq1: string,
  seq2: string,
  matchReward = 2,
  mismatchPenalty = -1,
  gapPenalty = -2
): AlignmentResult {
  const s1 = cleanSequence(seq1);
  const s2 = cleanSequence(seq2);
  const m = s1.length;
  const n = s2.length;

  if (m === 0 || n === 0) {
    return {
      score: 0,
      alignedSeq1: '',
      alignedSeq2: '',
      matchLine: '',
      identityPercent: 0,
      similarityPercent: 0,
      gaps: 0,
      length: 0,
    };
  }

  const H: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) H[i][0] = i * gapPenalty;
  for (let j = 0; j <= n; j++) H[0][j] = j * gapPenalty;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = s1[i - 1] === s2[j - 1] ? matchReward : mismatchPenalty;
      H[i][j] = Math.max(H[i - 1][j - 1] + match, H[i - 1][j] + gapPenalty, H[i][j - 1] + gapPenalty);
    }
  }

  let currI = m;
  let currJ = n;
  let al1 = '';
  let al2 = '';
  let matches = 0;
  let gaps = 0;

  while (currI > 0 || currJ > 0) {
    if (currI > 0 && currJ > 0) {
      const match = s1[currI - 1] === s2[currJ - 1] ? matchReward : mismatchPenalty;
      if (H[currI][currJ] === H[currI - 1][currJ - 1] + match) {
        al1 = s1[currI - 1] + al1;
        al2 = s2[currJ - 1] + al2;
        if (s1[currI - 1] === s2[currJ - 1]) matches++;
        currI--;
        currJ--;
        continue;
      }
    }
    if (currI > 0 && H[currI][currJ] === H[currI - 1][currJ] + gapPenalty) {
      al1 = s1[currI - 1] + al1;
      al2 = '-' + al2;
      gaps++;
      currI--;
    } else {
      al1 = '-' + al1;
      al2 = s2[currJ - 1] + al2;
      gaps++;
      currJ--;
    }
  }

  let matchLine = '';
  for (let k = 0; k < al1.length; k++) {
    if (al1[k] === al2[k]) {
      matchLine += '|';
    } else if (al1[k] === '-' || al2[k] === '-') {
      matchLine += ' ';
    } else {
      matchLine += ':';
    }
  }

  const length = al1.length || 1;
  const identityPercent = Math.round((matches / length) * 1000) / 10;
  const similarityPercent = Math.round(((matches + (length - matches - gaps) * 0.5) / length) * 1000) / 10;

  return {
    score: H[m][n],
    alignedSeq1: al1,
    alignedSeq2: al2,
    matchLine,
    identityPercent,
    similarityPercent,
    gaps,
    length,
  };
}

/**
 * Nussinov Dynamic Programming Algorithm for RNA Secondary Structure Prediction
 * Predicts base pairs (G-C, A-U, G-U) with minimum loop distance of 3 nt.
 */
export function predictRnaSecondaryStructure(sequence: string): SecondaryStructureResult {
  const seq = cleanSequence(sequence).slice(0, 300); // capped for web responsiveness
  const n = seq.length;

  if (n < 4) {
    return {
      sequence: seq,
      dotBracket: '.'.repeat(n),
      basePairs: [],
      gcContentPercent: 0,
      estimatedMfeKcal: 0,
    };
  }

  const canPair = (a: string, b: string): boolean => {
    return (
      (a === 'G' && b === 'C') ||
      (a === 'C' && b === 'G') ||
      (a === 'A' && b === 'U') ||
      (a === 'U' && b === 'A') ||
      (a === 'G' && b === 'U') ||
      (a === 'U' && b === 'G')
    );
  };

  const pairWeight = (a: string, b: string): number => {
    if ((a === 'G' && b === 'C') || (a === 'C' && b === 'G')) return 3; // GC 3 H-bonds
    if ((a === 'A' && b === 'U') || (a === 'U' && b === 'A')) return 2; // AU 2 H-bonds
    if ((a === 'G' && b === 'U') || (a === 'U' && b === 'G')) return 1; // GU wobble
    return 0;
  };

  const DP: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const minLoop = 3;

  for (let len = minLoop + 1; len < n; len++) {
    for (let i = 0; i < n - len; i++) {
      const j = i + len;
      let maxVal = Math.max(DP[i + 1][j], DP[i][j - 1]);

      if (canPair(seq[i], seq[j])) {
        const weight = pairWeight(seq[i], seq[j]);
        maxVal = Math.max(maxVal, DP[i + 1][j - 1] + weight);
      }

      for (let k = i + 1; k < j; k++) {
        maxVal = Math.max(maxVal, DP[i][k] + DP[k + 1][j]);
      }
      DP[i][j] = maxVal;
    }
  }

  // Traceback
  const pairs: [number, number][] = [];
  const trace = (i: number, j: number) => {
    if (i >= j - minLoop) return;
    if (DP[i][j] === DP[i + 1][j]) {
      trace(i + 1, j);
    } else if (DP[i][j] === DP[i][j - 1]) {
      trace(i, j - 1);
    } else if (canPair(seq[i], seq[j]) && DP[i][j] === DP[i + 1][j - 1] + pairWeight(seq[i], seq[j])) {
      pairs.push([i, j]);
      trace(i + 1, j - 1);
    } else {
      for (let k = i + 1; k < j; k++) {
        if (DP[i][j] === DP[i][k] + DP[k + 1][j]) {
          trace(i, k);
          trace(k + 1, j);
          break;
        }
      }
    }
  };

  trace(0, n - 1);

  // Construct dot-bracket
  const dotBracketArr = new Array(n).fill('.');
  for (const [i, j] of pairs) {
    dotBracketArr[i] = '(';
    dotBracketArr[j] = ')';
  }

  const gcCount = (seq.match(/[GC]/g) || []).length;
  const gcContentPercent = Math.round((gcCount / (n || 1)) * 1000) / 10;
  // Approximation of MFE: each pair yields negative free energy (GC: -2.8 kcal, AU: -1.8, GU: -0.9 kcal)
  let mfe = 0;
  for (const [i, j] of pairs) {
    const a = seq[i];
    const b = seq[j];
    if ((a === 'G' && b === 'C') || (a === 'C' && b === 'G')) mfe -= 2.8;
    else if ((a === 'A' && b === 'U') || (a === 'U' && b === 'A')) mfe -= 1.8;
    else mfe -= 0.9;
  }
  // Penalize loops
  mfe += pairs.length > 0 ? 3.5 : 0;

  return {
    sequence: seq,
    dotBracket: dotBracketArr.join(''),
    basePairs: pairs.sort((a, b) => a[0] - b[0]),
    gcContentPercent,
    estimatedMfeKcal: Math.round(mfe * 10) / 10,
  };
}

/**
 * lncRNA-Protein Interaction Screening (catRAPID & RPISeq inspired propensity matrix)
 * Evaluates secondary structure accessibility, electrostatic interaction (Arg/Lys vs phosphate backbone),
 * hydrophobic interaction, and known RNA-Binding Domain motifs (RRM, KH, Zinc-Finger, DEAD-box).
 */
export function screenLncRnaProteinInteraction(
  lncRnaSeq: string,
  proteinSeq: string,
  proteinName = 'Target Protein'
): ProteinInteractionResult {
  const rna = cleanSequence(lncRnaSeq);
  const prot = proteinSeq.toUpperCase().replace(/[^A-Z]/g, '');

  if (rna.length === 0 || prot.length === 0) {
    return {
      score: 0,
      bindingPropensity: 0,
      confidence: 'Low',
      detectedRnaBindingMotifs: [],
      predictedInteractionRegions: [],
      breakdown: {
        electrostaticScore: 0,
        hydrophobicPropensity: 0,
        secondaryStructureAccessibility: 0,
        kmerCorrelation: 0,
      },
    };
  }

  // 1. RNA binding motifs in protein
  const motifs: { motif: string; position: number; type: string }[] = [];
  // RRM consensus: [RK]-[G]-[FY]-[GA]-[FY]-[ILV]
  const rrmRegex = /([RK]G[FY][GA][FY][ILV])/g;
  let match;
  while ((match = rrmRegex.exec(prot)) !== null) {
    motifs.push({ motif: match[1], position: match.index + 1, type: 'RRM (RNA Recognition Motif - RNP1)' });
  }

  // KH domain motif: [IVL]IGxxGxx[IVL]
  const khRegex = /([IVL]IG[A-Z]{2}G[A-Z]{2}[IVL])/g;
  while ((match = khRegex.exec(prot)) !== null) {
    motifs.push({ motif: match[1], position: match.index + 1, type: 'KH Domain (K Homology)' });
  }

  // Zinc Finger C2H2: C.{2,4}C.{12}H.{3,5}H
  const c2h2Regex = /(C[A-Z]{2,4}C[A-Z]{12}H[A-Z]{3,5}H)/g;
  while ((match = c2h2Regex.exec(prot)) !== null) {
    motifs.push({ motif: match[1], position: match.index + 1, type: 'Zinc Finger (C2H2 DNA/RNA-binding)' });
  }

  // Arginine-rich motif: 3 or more R/K in 6 amino acids
  for (let i = 0; i <= prot.length - 6; i++) {
    const sub = prot.slice(i, i + 6);
    const basicCount = (sub.match(/[RK]/g) || []).length;
    if (basicCount >= 4) {
      motifs.push({ motif: sub, position: i + 1, type: 'Basic/Arginine-rich RNA-binding motif' });
      i += 5; // advance
    }
  }

  // 2. Electrostatic propensity: Basic amino acids (R, K, H) interacting with negatively charged RNA phosphate backbone
  const basicCount = (prot.match(/[RKH]/g) || []).length;
  const acidicCount = (prot.match(/[DE]/g) || []).length;
  const netChargeRatio = (basicCount - acidicCount * 0.4) / (prot.length || 1);
  const electrostaticScore = Math.min(1.0, Math.max(0.1, netChargeRatio * 4 + 0.3));

  // 3. Hydrophobic stacking (Aromatic F, Y, W stacking against nucleotide rings)
  const aromaticCount = (prot.match(/[FYW]/g) || []).length;
  const hydrophobicPropensity = Math.min(1.0, (aromaticCount / prot.length) * 8 + 0.2);

  // 4. Secondary structure accessibility: Single-stranded regions and loops in RNA are more accessible
  const structure = predictRnaSecondaryStructure(rna.slice(0, 150));
  const unpairedBases = (structure.dotBracket.match(/\./g) || []).length;
  const secondaryStructureAccessibility = Math.min(1.0, unpairedBases / (structure.dotBracket.length || 1));

  // 5. K-mer correlation / sequence composition compatibility
  const gcRna = (rna.match(/[GC]/g) || []).length / (rna.length || 1);
  const kmerCorrelation = Math.min(1.0, 0.45 + (1 - Math.abs(gcRna - 0.5)) * 0.5);

  // Motif bonus
  const motifBonus = Math.min(0.3, motifs.length * 0.1);

  // Weighted composite score (0 to 1.0)
  const rawScore =
    electrostaticScore * 0.35 +
    hydrophobicPropensity * 0.25 +
    secondaryStructureAccessibility * 0.2 +
    kmerCorrelation * 0.2 +
    motifBonus;

  const score = Math.min(0.98, Math.max(0.12, Math.round(rawScore * 100) / 100));
  const bindingPropensity = Math.round(score * 100);

  let confidence: 'High' | 'Moderate' | 'Low' = 'Low';
  if (score >= 0.7) confidence = 'High';
  else if (score >= 0.45) confidence = 'Moderate';

  // Highlight predicted interaction domains
  const predictedInteractionRegions: { rnaRange: [number, number]; proteinRange: [number, number]; affinityScore: number }[] = [];
  const rnaChunkSize = Math.max(20, Math.floor(rna.length / 4));
  const protChunkSize = Math.max(30, Math.floor(prot.length / 4));

  for (let r = 0; r < Math.min(3, Math.floor(rna.length / rnaChunkSize)); r++) {
    const rStart = r * rnaChunkSize + 1;
    const rEnd = Math.min(rna.length, (r + 1) * rnaChunkSize);
    const pStart = r * protChunkSize + 1;
    const pEnd = Math.min(prot.length, (r + 1) * protChunkSize);
    predictedInteractionRegions.push({
      rnaRange: [rStart, rEnd],
      proteinRange: [pStart, pEnd],
      affinityScore: Math.round((score * (0.85 + Math.sin(r + 1) * 0.15)) * 100) / 100,
    });
  }

  return {
    score,
    bindingPropensity,
    confidence,
    detectedRnaBindingMotifs: motifs.slice(0, 8),
    predictedInteractionRegions,
    breakdown: {
      electrostaticScore: Math.round(electrostaticScore * 100) / 100,
      hydrophobicPropensity: Math.round(hydrophobicPropensity * 100) / 100,
      secondaryStructureAccessibility: Math.round(secondaryStructureAccessibility * 100) / 100,
      kmerCorrelation: Math.round(kmerCorrelation * 100) / 100,
    },
  };
}

/**
 * lncRNA-miRNA Interaction & ceRNA Sponging Target Screening
 * Screens for complementary seed matches (positions 2-8 of miRNA), G:U wobbles, and calculates
 * target binding affinity and ceRNA sponging potential.
 */
export function screenLncRnaMiRnaInteraction(
  lncRnaSeq: string,
  miRnaSeq: string,
  miRnaName = 'osa-miR166'
): MiRnaTargetResult[] {
  const rna = cleanSequence(lncRnaSeq);
  const mir = cleanSequence(miRnaSeq);

  if (rna.length < 10 || mir.length < 18) {
    return [];
  }

  // miRNA 5' -> 3'. Seed is positions 2 to 8.
  // The target on lncRNA should be reverse complementary to seed!
  const getComplement = (base: string): string[] => {
    if (base === 'A') return ['U'];
    if (base === 'U') return ['A', 'G']; // Watson-Crick A, or wobble G
    if (base === 'G') return ['C', 'U']; // Watson-Crick C, or wobble U
    if (base === 'C') return ['G'];
    return ['N'];
  };

  const seed = mir.slice(1, 8); // positions 2 to 8 (7 nt)
  const results: MiRnaTargetResult[] = [];

  // Slide through lncRNA
  for (let i = 0; i <= rna.length - seed.length; i++) {
    let matches = 0;
    let wobbles = 0;
    let seedMatchSeq = '';

    // Check seed complementarity (reverse: miRNA 5' pairs with lncRNA 3')
    for (let s = 0; s < seed.length; s++) {
      const mirBase = seed[seed.length - 1 - s];
      const rnaBase = rna[i + s];
      const validComplements = getComplement(mirBase);

      if (validComplements[0] === rnaBase) {
        matches++;
        seedMatchSeq += rnaBase;
      } else if (validComplements.length > 1 && validComplements[1] === rnaBase) {
        wobbles++;
        seedMatchSeq += rnaBase;
      } else {
        seedMatchSeq += rnaBase;
      }
    }

    // Determine seed match tier
    let seedType: MiRnaTargetResult['seedType'] | null = null;
    if (matches === 7 && wobbles === 0) {
      // Check 8mer (position 1 is an A on target or pairs with nt 1)
      const has8merA = i > 0 && rna[i - 1] === 'A';
      seedType = has8merA ? '8mer' : '7mer-m8';
    } else if (matches === 6 && wobbles === 0) {
      seedType = '7mer-A1';
    } else if (matches === 5 && wobbles <= 1) {
      seedType = '6mer';
    } else if (matches + wobbles >= 6) {
      seedType = 'Non-canonical';
    }

    if (seedType) {
      // Calculate extended alignment over full miRNA
      const targetWindowStart = Math.max(0, i - (mir.length - seed.length));
      const targetWindowEnd = Math.min(rna.length, i + seed.length + 5);
      const targetSub = rna.slice(targetWindowStart, targetWindowEnd);

      const al = smithWatermanAlign(targetSub, mir, 3, -1, -2);
      const freeEnergy = -14.0 - matches * 1.8 - wobbles * 0.8 + (seedType === '8mer' ? -4.5 : 0);

      // ceRNA Sponging efficiency calculation
      const spongingEfficiency = Math.min(
        99,
        Math.max(25, Math.round((matches * 10 + (seedType === '8mer' ? 25 : 15) - Math.abs(freeEnergy) * 0.5)))
      );

      results.push({
        miRnaName,
        miRnaSeq: mir,
        lncRnaRange: [i + 1, i + seed.length],
        seedType,
        seedMatchSeq,
        fullAlignmentRna: targetSub,
        fullAlignmentMiRna: mir,
        matchLine: al.matchLine,
        freeEnergyKcal: Math.round(freeEnergy * 10) / 10,
        spongingEfficiency,
      });

      i += seed.length - 1; // avoid overlapping hits
    }
  }

  return results.slice(0, 10);
}

/**
 * lncRNA-DNA Triplex Formation Screening (Hoogsteen / Reverse Hoogsteen base pairing)
 * Identifies Triplex-Forming Oligonucleotides (TFO) in lncRNA and Triplex Target Sites (TTS) in DNA promoters.
 * Pyrimidine motif (parallel): T*A-T, C+*G-C
 * Purine motif (antiparallel): A*A-T, G*G-C
 */
export function screenLncRnaDnaTriplex(
  lncRnaSeq: string,
  dnaPromoterSeq: string
): DnaTriplexResult[] {
  const rna = cleanSequence(lncRnaSeq);
  const dna = cleanDnaSequence(dnaPromoterSeq);

  if (rna.length < 12 || dna.length < 12) {
    return [];
  }

  const results: DnaTriplexResult[] = [];
  const minTfoLength = 10;

  // 1. Scan for Pyrimidine Motif in RNA (rich in U and C >= 70%)
  for (let r = 0; r <= rna.length - minTfoLength; r += 2) {
    const rSub = rna.slice(r, r + minTfoLength);
    const pyrCount = (rSub.match(/[UC]/g) || []).length;
    const pyrRatio = pyrCount / minTfoLength;

    if (pyrRatio >= 0.7) {
      // Find matching polypurine tract in DNA (A/G target)
      // Parallel pyrimidine motif: T (U in RNA) binds A-T base pair, C binds G-C base pair
      for (let d = 0; d <= dna.length - minTfoLength; d += 3) {
        const dSub = dna.slice(d, d + minTfoLength);
        let hoogsteenMatches = 0;

        for (let k = 0; k < minTfoLength; k++) {
          const rBase = rSub[k];
          const dBase = dSub[k];
          // U binds A, C binds G
          if ((rBase === 'U' && dBase === 'A') || (rBase === 'C' && dBase === 'G')) {
            hoogsteenMatches++;
          }
        }

        if (hoogsteenMatches >= 7) {
          const triplexScore = Math.round((hoogsteenMatches / minTfoLength) * 100);
          const stabilityIndex = Math.round((triplexScore * pyrRatio) * 10) / 10;

          results.push({
            motifType: 'Parallel (Pyrimidine)',
            tfoSequence: rSub,
            ttsSequence: dSub,
            lncRnaRange: [r + 1, r + minTfoLength],
            dnaRange: [d + 1, d + minTfoLength],
            triplexScore,
            stabilityIndex,
            hoogsteenMatches,
            pyrimidineRatio: Math.round(pyrRatio * 100),
          });
          break; // move forward
        }
      }
    }
  }

  // 2. Scan for Purine Motif in RNA (rich in A and G >= 70%)
  for (let r = 0; r <= rna.length - minTfoLength; r += 2) {
    const rSub = rna.slice(r, r + minTfoLength);
    const purCount = (rSub.match(/[AG]/g) || []).length;
    const purRatio = purCount / minTfoLength;

    if (purRatio >= 0.7) {
      // Antiparallel purine motif: A binds A-T, G binds G-C
      for (let d = 0; d <= dna.length - minTfoLength; d += 3) {
        const dSub = dna.slice(d, d + minTfoLength);
        let hoogsteenMatches = 0;

        for (let k = 0; k < minTfoLength; k++) {
          const rBase = rSub[minTfoLength - 1 - k]; // antiparallel
          const dBase = dSub[k];
          if ((rBase === 'A' && dBase === 'A') || (rBase === 'G' && dBase === 'G')) {
            hoogsteenMatches++;
          }
        }

        if (hoogsteenMatches >= 7) {
          const triplexScore = Math.round((hoogsteenMatches / minTfoLength) * 100);
          const stabilityIndex = Math.round((triplexScore * purRatio) * 10) / 10;

          results.push({
            motifType: 'Antiparallel (Purine)',
            tfoSequence: rSub,
            ttsSequence: dSub,
            lncRnaRange: [r + 1, r + minTfoLength],
            dnaRange: [d + 1, d + minTfoLength],
            triplexScore,
            stabilityIndex,
            hoogsteenMatches,
            pyrimidineRatio: Math.round((1 - purRatio) * 100),
          });
          break;
        }
      }
    }
  }

  return results.sort((a, b) => b.triplexScore - a.triplexScore).slice(0, 8);
}

/**
 * Multi-Omic Biotic Stress Phenotyping & Early Detection Model
 * Integrates:
 * 1) lncRNA Log2 Fold Change (transcriptomic immune activation)
 * 2) Canopy Temperature Depression ΔT = T_leaf - T_air (thermal infrared signature)
 * 3) Stomatal Conductance g_s (physiological transpirational flux)
 * Output: EBSDI (Early Biotic Stress Detection Index, 0-100) and infection phase.
 */
export function calculateEarlyBioticStressIndex(
  hoursPostInoculation: number,
  lncRnaLog2FC: number,
  canopyTempDepressionDeltaT: number, // normal healthy leaf: ~ -1.5 to -2.5 °C (cooler than air due to transpiration)
  stomatalConductanceGs: number // normal healthy plant: ~ 300 to 500 mmol m^-2 s^-1
): BioticStressSignature {
  // Healthy baseline:
  // DeltaT is negative (e.g. -2.0 °C)
  // When pathogen triggers PAMP recognition (e.g. flg22, chitin), stomata close rapidly (6-24 hpi).
  // Stomatal closure drops g_s (from 400 down to 100-150), causing evaporative cooling to stop.
  // DeltaT rises above 0 (leaf becomes warmer than ambient air: +0.5 to +2.5 °C).
  // Concurrently, defense-responsive lncRNAs (e.g. ALEX1, ELENA1) are induced (Log2FC > 1.5).

  // 1. Thermal factor (DeltaT elevation above -2.0 normal baseline)
  const thermalElevation = Math.max(0, canopyTempDepressionDeltaT - (-2.0));
  const thermalComponent = Math.min(40, (thermalElevation / 4.0) * 40);

  // 2. Stomatal closure factor (depression of g_s below 400 normal baseline)
  const stomatalDeficit = Math.max(0, 400 - stomatalConductanceGs);
  const stomatalComponent = Math.min(30, (stomatalDeficit / 300) * 30);

  // 3. Transcriptomic lncRNA response factor
  const lncRnaComponent = Math.min(30, Math.max(0, (Math.abs(lncRnaLog2FC) / 3.0) * 30));

  const rawEbsdi = thermalComponent + stomatalComponent + lncRnaComponent;
  const ebsdiScore = Math.min(100, Math.max(0, Math.round(rawEbsdi * 10) / 10));

  let stressPhase: BioticStressSignature['stressPhase'] = 'Normal / Baseline';
  let pathogenRiskLevel: BioticStressSignature['pathogenRiskLevel'] = 'Negligible';

  if (ebsdiScore >= 75) {
    stressPhase = 'Symptomatic / Advanced';
    pathogenRiskLevel = 'High / Infection Confirmed';
  } else if (ebsdiScore >= 50) {
    stressPhase = 'Active Defense / Signaling';
    pathogenRiskLevel = 'Moderate / Early Warning';
  } else if (ebsdiScore >= 25) {
    stressPhase = 'Early Recognition (Stomatal Closure)';
    pathogenRiskLevel = 'Low / Vigilance';
  }

  return {
    hoursPostInoculation,
    lncRnaLog2FC,
    canopyTempDepressionDeltaT,
    stomatalConductanceGs,
    ebsdiScore,
    stressPhase,
    pathogenRiskLevel,
  };
}

export interface TemplateHomologyComparison {
  templateId: string;
  templateName: string;
  species: string;
  speciesCommon: string;
  pathogen: string;
  pathogenType: string;
  category: string;
  primaryTarget: string;
  alignment: AlignmentResult;
  gcDifference: number; // |gcQuery - gcTemplate|
  structureSimilarityPercent: number; // based on base-pair density & length ratio
  compositeHomologyScore: number; // 0 - 100
  confidenceTier: 'High Homology' | 'Moderate Homology' | 'Divergent / Novel';
}

export interface DotPlotMatch {
  x: number; // 0-indexed position in seq1
  y: number; // 0-indexed position in seq2
  length: number;
  matchScore: number;
}

export interface DotPlotMatrixData {
  seq1: string;
  seq2: string;
  windowSize: number;
  stringency: number;
  matches: DotPlotMatch[];
}

/**
 * Compare query sequence against an array of known stress-related templates
 */
export function compareQueryAgainstTemplates(
  querySeq: string,
  templates: {
    id: string;
    name: string;
    species: string;
    speciesCommon: string;
    pathogen: string;
    pathogenType: string;
    category: string;
    primaryTarget: string;
    sequence: string;
  }[]
): TemplateHomologyComparison[] {
  const qClean = cleanSequence(querySeq);
  if (!qClean) return [];

  const qGc = (qClean.match(/[GC]/g) || []).length / (qClean.length || 1);
  const qStruct = predictRnaSecondaryStructure(qClean.slice(0, 150));
  const qBpDensity = qStruct.basePairs.length / (qStruct.sequence.length || 1);

  return templates.map((tmpl) => {
    const tClean = cleanSequence(tmpl.sequence);
    const alignment = smithWatermanAlign(qClean, tClean);

    const tGc = (tClean.match(/[GC]/g) || []).length / (tClean.length || 1);
    const gcDifference = Math.round(Math.abs(qGc - tGc) * 1000) / 10;

    const tStruct = predictRnaSecondaryStructure(tClean.slice(0, 150));
    const tBpDensity = tStruct.basePairs.length / (tStruct.sequence.length || 1);
    const structureSimilarity = Math.max(
      10,
      Math.round((1 - Math.abs(qBpDensity - tBpDensity) / (Math.max(qBpDensity, tBpDensity) || 1)) * 100)
    );

    // Composite Homology Score (0-100) combining sequence identity, alignment score, and structural similarity
    const normalizedScore = Math.min(100, (alignment.score / Math.max(10, qClean.length * 0.8)) * 100);
    const composite = Math.round(
      alignment.identityPercent * 0.5 +
      normalizedScore * 0.3 +
      structureSimilarity * 0.2
    );
    const compositeHomologyScore = Math.min(100, Math.max(5, composite));

    let confidenceTier: TemplateHomologyComparison['confidenceTier'] = 'Divergent / Novel';
    if (compositeHomologyScore >= 65 || alignment.identityPercent >= 70) {
      confidenceTier = 'High Homology';
    } else if (compositeHomologyScore >= 40 || alignment.identityPercent >= 45) {
      confidenceTier = 'Moderate Homology';
    }

    return {
      templateId: tmpl.id,
      templateName: tmpl.name,
      species: tmpl.species,
      speciesCommon: tmpl.speciesCommon,
      pathogen: tmpl.pathogen,
      pathogenType: tmpl.pathogenType,
      category: tmpl.category,
      primaryTarget: tmpl.primaryTarget,
      alignment,
      gcDifference,
      structureSimilarityPercent: structureSimilarity,
      compositeHomologyScore,
      confidenceTier,
    };
  });
}

/**
 * Generate Dot-Plot alignment matrix for visual synteny and homology diagonal tracts
 */
export function generateDotPlotMatrix(
  seq1: string,
  seq2: string,
  windowSize = 7,
  stringency = 5
): DotPlotMatrixData {
  const s1 = cleanSequence(seq1).slice(0, 250);
  const s2 = cleanSequence(seq2).slice(0, 250);
  const matches: DotPlotMatch[] = [];

  const w = Math.max(3, windowSize);
  const thresh = Math.max(2, stringency);

  for (let i = 0; i <= s1.length - w; i += 2) {
    const sub1 = s1.slice(i, i + w);
    for (let j = 0; j <= s2.length - w; j += 2) {
      let matchCount = 0;
      for (let k = 0; k < w; k++) {
        if (sub1[k] === s2[j + k]) matchCount++;
      }
      if (matchCount >= thresh) {
        matches.push({
          x: i,
          y: j,
          length: w,
          matchScore: matchCount,
        });
      }
    }
  }

  return {
    seq1: s1,
    seq2: s2,
    windowSize: w,
    stringency: thresh,
    matches,
  };
}

