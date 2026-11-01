/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Sequence Motif Discovery Engine
 * Pattern matching module for discovering conserved plant stress and regulatory motifs
 * within lncRNA sequences. Implements IUPAC degeneracy parsing and k-mer analysis.
 */

import { CURATED_LNCRNAS } from '../data/curatedLncRNAs';

export type MotifCategory =
  | 'Abiotic Stress'
  | 'Biotic Defense'
  | 'RNA Processing & Stability'
  | 'RBP & Structural Hub'
  | 'miRNA Target Seed'
  | 'Custom User Motif';

export interface RegulatoryMotifDefinition {
  id: string;
  name: string;
  pattern: string; // IUPAC pattern (e.g. "RCCGAC", "ACGTGK") or regex
  category: MotifCategory;
  consensusDisplay: string;
  targetFactorOrPathway: string;
  description: string;
  significance: string;
  biologicalContext: string;
  colorBadge: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}

export interface DiscoveredMotifHit {
  hitId: string;
  motifId: string;
  motifName: string;
  category: MotifCategory;
  pattern: string;
  matchedSequence: string;
  start: number; // 1-indexed
  end: number; // 1-indexed
  length: number;
  relativePositionPercent: number; // 0 - 100% along transcript length
  targetFactorOrPathway: string;
  description: string;
  significance: string;
  biologicalContext: string;
  colorBadge: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}

export interface KmerFrequencyHit {
  kmer: string;
  count: number;
  frequencyPercent: number;
  gcPercent: number;
  positions: number[]; // 1-indexed start positions
}

export interface ConservedRegionBlock {
  id: string;
  start: number; // 1-indexed
  end: number; // 1-indexed
  length: number;
  averageScorePercent: number; // 0 - 100%
  level: 'High (>75%)' | 'Moderate (50-75%)' | 'Basal (<50%)';
  homologyContext: string;
}

export interface SequenceConservationProfile {
  scores: number[]; // 0.0 to 1.0 per position (0-indexed array)
  blocks: ConservedRegionBlock[];
  meanConservationPercent: number;
}

export interface MotifDiscoveryResult {
  querySequence: string;
  sequenceLength: number;
  totalHitsCount: number;
  uniqueMotifsFoundCount: number;
  hits: DiscoveredMotifHit[];
  hitsByCategory: Record<MotifCategory, DiscoveredMotifHit[]>;
  categoryCounts: Record<MotifCategory, number>;
  topKmers: KmerFrequencyHit[];
  conservationProfile: SequenceConservationProfile;
}

// IUPAC Degenerate Nucleotide Code Mappings to RNA Regex
const IUPAC_RNA_MAP: Record<string, string> = {
  A: 'A',
  C: 'C',
  G: 'G',
  U: 'U',
  T: 'U',
  R: '[AG]', // puRine
  Y: '[CU]', // pYrimidine
  S: '[GC]', // Strong (3 H-bonds)
  W: '[AU]', // Weak (2 H-bonds)
  K: '[GU]', // Keto
  M: '[AC]', // aMino
  B: '[CGU]', // not A
  D: '[AGU]', // not C
  H: '[ACU]', // not G
  V: '[ACG]', // not U
  N: '[ACGU]', // aNy
};

/**
 * Converts an IUPAC sequence pattern or regex into a clean RNA regex.
 */
export function convertIupacToRegex(pattern: string, global = false): RegExp {
  const trimmed = pattern.trim().toUpperCase();
  const flags = global ? 'g' : '';

  // If already standard regex containing brackets or braces, convert T to U
  if (/[\{\}\[\]\(\)\.\*\+\?]/.test(trimmed)) {
    const rnaRegexStr = trimmed.replace(/T/g, 'U');
    try {
      return new RegExp(rnaRegexStr, flags);
    } catch {
      // Fallback if invalid regex
    }
  }

  // Convert each IUPAC character to RNA character class
  let regexStr = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    regexStr += IUPAC_RNA_MAP[ch] || ch;
  }

  return new RegExp(regexStr, flags);
}

/**
 * Curated Database of Plant Stress-Responsive & Regulatory RNA Motifs.
 * References: PlantCARE, PLACE, TransFac, and empirical plant lncRNA literature
 * (Rice, Arabidopsis, Tomato, Maize defense signaling).
 */
export const PLANT_REGULATORY_MOTIFS: RegulatoryMotifDefinition[] = [
  // 1. Abiotic Stress Motifs
  {
    id: 'dre_crt',
    name: 'DRE / CRT Core',
    pattern: 'RCCGAC', // [AG]CCGAC
    category: 'Abiotic Stress',
    consensusDisplay: 'R-C-C-G-A-C ([AG]CCGAC)',
    targetFactorOrPathway: 'CBF / DREB1 Transcription Regulators',
    description: 'Dehydration-responsive element and C-repeat core cis-regulatory motif.',
    significance: 'Critical regulator of cold, osmotic shock, drought, and salinity acclimation across cereal and model crops.',
    biologicalContext: 'Interacts with AP2/ERF domain proteins; widely enriched in abiotic-stress-responsive lncRNAs like ALEX1 and DROUGHT-DR1.',
    colorBadge: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-500',
    },
  },
  {
    id: 'abre_core',
    name: 'ABRE Element',
    pattern: 'ACGTGK', // ACGTG[GU]
    category: 'Abiotic Stress',
    consensusDisplay: 'A-C-G-T-G-K (ACGTG[GU])',
    targetFactorOrPathway: 'AREB / ABF bZIP Factors (ABA Signal)',
    description: 'Abscisic acid (ABA)-responsive cis-acting element.',
    significance: 'Mediates plant responses to water deficit, desiccation, and high salinity via ABA-dependent signaling.',
    biologicalContext: 'Requires coupling elements for maximum inducibility; acts as a primary molecular switch for stomatal closure.',
    colorBadge: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
    },
  },
  {
    id: 'hse_core',
    name: 'HSE (Heat Shock Element)',
    pattern: 'GAANNUUC', // GAA..UUC
    category: 'Abiotic Stress',
    consensusDisplay: 'G-A-A-N-N-T-T-C (GAA..TTC)',
    targetFactorOrPathway: 'HSF1 / HSF4 (Heat Stress Transcription)',
    description: 'Conserved Heat Shock Element with alternating GAA/TTC units.',
    significance: 'Triggers rapid thermal defense, HSP chaperone activation, and thermotolerance maintenance.',
    biologicalContext: 'Conserved in plant stress lncRNAs regulating thermal acclimation under acute temperature spikes.',
    colorBadge: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-300',
      dot: 'bg-orange-500',
    },
  },
  {
    id: 'mbs_myb',
    name: 'MBS (MYB Binding Site)',
    pattern: 'YAACRG', // [CU]AAC[AG]G
    category: 'Abiotic Stress',
    consensusDisplay: 'Y-A-A-C-R-G ([C/U]AAC[A/G]G)',
    targetFactorOrPathway: 'MYB Family Regulatory Proteins',
    description: 'MYB-binding site involved in drought and osmotic inducibility.',
    significance: 'Controls flavonoid biosynthesis, stomatal regulation, and drought stress adaptation.',
    biologicalContext: 'Found in promoter-associated and enhancer-like plant lncRNAs modulating ABA sensitivity.',
    colorBadge: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      dot: 'bg-teal-500',
    },
  },
  {
    id: 'ltr_cold',
    name: 'LTR (Low-Temp Element)',
    pattern: 'CCGAAA',
    category: 'Abiotic Stress',
    consensusDisplay: 'C-C-G-A-A-A',
    targetFactorOrPathway: 'Low-Temperature Adaptation Pathway',
    description: 'Low-temperature responsive cis-acting regulatory element.',
    significance: 'Enriched in chilling-tolerant cultivars during early vernalization and freezing stress.',
    biologicalContext: 'Directs transcript stabilization and cold-responsive chromatin remodeling in rice and winter crops.',
    colorBadge: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-300',
      dot: 'bg-cyan-500',
    },
  },

  // 2. Biotic Defense Motifs
  {
    id: 'w_box',
    name: 'W-box (WRKY Binding)',
    pattern: 'UUGACY', // UUGAC[CU]
    category: 'Biotic Defense',
    consensusDisplay: 'T-T-G-A-C-Y (TTGAC[C/T])',
    targetFactorOrPathway: 'WRKY Transcription Factors (Immunity)',
    description: 'Recognized by WRKY zinc-finger transcription factors in plant immunity.',
    significance: 'Crucial for defense against fungal blast (Magnaporthe oryzae), bacterial blight (Xanthomonas), and viral pathogens.',
    biologicalContext: 'Pivotal hallmark of systemic acquired resistance (SAR) and PAMP-triggered immunity (PTI).',
    colorBadge: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
    },
  },
  {
    id: 'tca_element',
    name: 'TCA-element (SA Signal)',
    pattern: 'UCAGAAGAGG',
    category: 'Biotic Defense',
    consensusDisplay: 'T-C-A-G-A-A-G-A-G-G',
    targetFactorOrPathway: 'Salicylic Acid (SA) Defense Cascade',
    description: 'Salicylic acid-responsive element involved in systemic acquired resistance.',
    significance: 'Induces PR defense proteins (PR1, PR5) and hypersensitive response against biotrophic pathogens.',
    biologicalContext: 'Commonly co-localized with lncRNA-ELENA1 and related epigenetic immune regulators.',
    colorBadge: {
      bg: 'bg-lime-50',
      text: 'text-lime-800',
      border: 'border-lime-300',
      dot: 'bg-lime-500',
    },
  },
  {
    id: 'ebs_ethylene',
    name: 'ERE / EBS (Ethylene Box)',
    pattern: 'AUUUCAAA',
    category: 'Biotic Defense',
    consensusDisplay: 'A-T-T-T-C-A-A-A',
    targetFactorOrPathway: 'ERF (Ethylene Response Factors)',
    description: 'Ethylene-responsive sequence element mediating necrotroph defense.',
    significance: 'Coordinates plant response to necrotrophic fungi (Botrytis, Rhizoctonia) and mechanical wounding.',
    biologicalContext: 'Regulates ethylene-jasmonate cross-talk in lncRNA-mediated secondary metabolite priming.',
    colorBadge: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      dot: 'bg-rose-500',
    },
  },

  // 3. RNA Processing & Stability Motifs
  {
    id: 'are_instability',
    name: 'ARE (AU-Rich Decay Element)',
    pattern: 'AUUUA',
    category: 'RNA Processing & Stability',
    consensusDisplay: 'A-U-U-U-A (AUUUA)',
    targetFactorOrPathway: 'Exosome / TTP-like Decay Machinery',
    description: 'AU-rich element governing mRNA and lncRNA half-life and turnover.',
    significance: 'Imparts rapid turnover kinetics to allow prompt shutoff of stress signaling upon pathogen clearance.',
    biologicalContext: 'Clusters of 2 or more ARE motifs target transcripts for rapid enzymatic 3\'->5\' deadenylation.',
    colorBadge: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-500',
    },
  },
  {
    id: 'pas_polyadenylation',
    name: 'PAS (Polyadenylation Signal)',
    pattern: 'AAUAAA',
    category: 'RNA Processing & Stability',
    consensusDisplay: 'A-A-U-A-A-A (Canonical PAS)',
    targetFactorOrPathway: 'CPSF Cleavage & Polyadenylation Complex',
    description: 'Canonical hexamer signal directing cleavage and 3\' poly(A) tail addition.',
    significance: 'Distinguishes full-length polyadenylated plant lncRNAs from non-polyadenylated unstable transcripts.',
    biologicalContext: 'Crucial for nuclear export, transcript stability, and cytoplasmic translation-repression complexes.',
    colorBadge: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
      dot: 'bg-purple-500',
    },
  },
  {
    id: 'pas_variant',
    name: 'PAS Alternative (AUUAAA)',
    pattern: 'AUUAAA',
    category: 'RNA Processing & Stability',
    consensusDisplay: 'A-U-U-A-A-A',
    targetFactorOrPathway: 'Alternative Cleavage Machinery',
    description: 'Most frequent alternative polyadenylation signal in plant genomes.',
    significance: 'Directs alternative 3\' UTR isoform generation under differential stress conditions.',
    biologicalContext: 'Alternative polyadenylation alters lncRNA structural accessibility and miRNA sponge binding sites.',
    colorBadge: {
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-800',
      border: 'border-fuchsia-300',
      dot: 'bg-fuchsia-500',
    },
  },

  // 4. RBP Binding & Structural Hubs
  {
    id: 'g4_quadruplex',
    name: 'G-Quadruplex (G4 Hub)',
    pattern: 'G{3,}[ACGU]{1,7}G{3,}[ACGU]{1,7}G{3,}[ACGU]{1,7}G{3,}',
    category: 'RBP & Structural Hub',
    consensusDisplay: 'G3+N1-7G3+N1-7G3+N1-7G3+',
    targetFactorOrPathway: 'G4-Helicases & Epigenetic Modifiers',
    description: 'Non-canonical four-stranded secondary structure stabilized by Hoogsteen guanine quartets.',
    significance: 'Acts as a high-stability thermodynamic anchor resisting thermal denaturation and cellular nucleases.',
    biologicalContext: 'Recruits PRC2 chromatin remodelers; implicated in translational stalling and DNA-damage responses.',
    colorBadge: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      dot: 'bg-indigo-500',
    },
  },
  {
    id: 'polypyrimidine_tract',
    name: 'Polypyrimidine / Triplex Tract',
    pattern: '[CU]{7,}',
    category: 'RBP & Structural Hub',
    consensusDisplay: '[C/U]7+ (Poly-Pyrimidine)',
    targetFactorOrPathway: 'PTB (Polypyrimidine Binding) & DNA Triplex',
    description: 'Continuous pyrimidine tract capable of Hoogsteen parallel DNA triplex bonding.',
    significance: 'Permits sequence-specific insertion into the major groove of target defense gene promoters (e.g. PR1).',
    biologicalContext: 'Key feature in ELENA1-like lncRNAs that coordinate transcriptional activation via RNA:DNA:DNA triplexes.',
    colorBadge: {
      bg: 'bg-violet-50',
      text: 'text-violet-800',
      border: 'border-violet-300',
      dot: 'bg-violet-500',
    },
  },
  {
    id: 'puf_pumilio',
    name: 'PUM / PUF Recognition',
    pattern: 'UGUANAUA',
    category: 'RBP & Structural Hub',
    consensusDisplay: 'U-G-U-A-N-A-U-A',
    targetFactorOrPathway: 'Pumilio / PUF RNA-Binding Proteins',
    description: 'Sequence-specific post-transcriptional regulator motif recognized by PUF repeat proteins.',
    significance: 'Mediates transcript localization, deadenylation, and translational silencing during plant development.',
    biologicalContext: 'Conserved across angiosperms; controls lncRNA-mRNA interactome dynamics under stress.',
    colorBadge: {
      bg: 'bg-pink-50',
      text: 'text-pink-800',
      border: 'border-pink-300',
      dot: 'bg-pink-500',
    },
  },

  // 5. miRNA Target Seed Decoys
  {
    id: 'mir156_seed',
    name: 'osa-miR156 Sponging Seed',
    pattern: 'UGACAGAAGA',
    category: 'miRNA Target Seed',
    consensusDisplay: 'U-G-A-C-A-G-A-A-G-A',
    targetFactorOrPathway: 'miR156 / SPL Master Signaling Hub',
    description: 'Decoy binding site for osa-miR156 in blast fungal resistance and vegetative phase change.',
    significance: 'Sponging prevents cleavage of SPL transcription factors, enhancing blast resistance and tillering.',
    biologicalContext: 'Conserved endogenous target mimic (eTM) motif found in rice lncRNA ceRNA networks.',
    colorBadge: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
      dot: 'bg-sky-500',
    },
  },
  {
    id: 'mir166_seed',
    name: 'osa-miR166 Sponging Seed',
    pattern: 'UCGGACCAGG',
    category: 'miRNA Target Seed',
    consensusDisplay: 'U-C-G-G-A-C-C-A-G-G',
    targetFactorOrPathway: 'miR166 / HD-ZIP III Vascular Hub',
    description: 'Decoy binding site for osa-miR166 controlling vascular patterning and drought tolerance.',
    significance: 'Sequesters miR166 to release HD-ZIP III expression under water deficit and pathogen infection.',
    biologicalContext: 'Characterized in rice lncRNA-Rsm1 and homologous drought-responsive non-coding RNAs.',
    colorBadge: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
    },
  },
  {
    id: 'mir398_seed',
    name: 'osa-miR398 Sponging Seed',
    pattern: 'UGUGUUCUCA',
    category: 'miRNA Target Seed',
    consensusDisplay: 'U-G-U-G-U-U-C-U-C-A',
    targetFactorOrPathway: 'miR398 / CSD Superoxide Dismutase',
    description: 'Target mimicry sequence for miR398 in oxidative stress and reactive oxygen species (ROS) control.',
    significance: 'Regulates copper chaperone and superoxide dismutase transcripts during heavy metal and pathogen stress.',
    biologicalContext: 'Essential for cellular antioxidant equilibrium and hypersensitive response containment.',
    colorBadge: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      dot: 'bg-teal-500',
    },
  },
];

/**
 * Searches for all occurrences of a motif pattern inside a sequence.
 * Handles overlapping occurrences by advancing position by 1.
 */
export function findMotifHitsInSequence(
  sequence: string,
  motif: RegulatoryMotifDefinition
): DiscoveredMotifHit[] {
  const clean = (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  const seqLen = clean.length;
  if (!seqLen) return [];

  const hits: DiscoveredMotifHit[] = [];
  const regex = convertIupacToRegex(motif.pattern, true);

  // Search through all positions allowing overlapping matches
  let match: RegExpExecArray | null;
  while ((match = regex.exec(clean)) !== null) {
    const matchedSeq = match[0];
    const matchIndex = match.index; // 0-indexed
    const startPos = matchIndex + 1; // 1-indexed
    const endPos = matchIndex + matchedSeq.length; // 1-indexed

    // Calculate relative transcript percentage (0 - 100%)
    const relativePos = Math.round((startPos / seqLen) * 1000) / 10;

    hits.push({
      hitId: `${motif.id}_${startPos}_${endPos}`,
      motifId: motif.id,
      motifName: motif.name,
      category: motif.category,
      pattern: motif.pattern,
      matchedSequence: matchedSeq,
      start: startPos,
      end: endPos,
      length: matchedSeq.length,
      relativePositionPercent: relativePos,
      targetFactorOrPathway: motif.targetFactorOrPathway,
      description: motif.description,
      significance: motif.significance,
      biologicalContext: motif.biologicalContext,
      colorBadge: motif.colorBadge,
    });

    // Advance regex index by 1 to find overlapping matches (e.g. AUUUA in AUUUAUUUA)
    regex.lastIndex = matchIndex + 1;
  }

  return hits;
}

/**
 * Calculates overrepresented k-mer frequencies (e.g., 4-mer, 5-mer, 6-mer) in sequence.
 */
export function calculateKmerFrequencies(
  sequence: string,
  k = 5,
  topN = 8
): KmerFrequencyHit[] {
  const clean = (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  const len = clean.length;
  if (len < k) return [];

  const counts = new Map<string, { count: number; positions: number[] }>();

  for (let i = 0; i <= len - k; i++) {
    const kmer = clean.slice(i, i + k);
    const existing = counts.get(kmer) || { count: 0, positions: [] };
    existing.count++;
    existing.positions.push(i + 1); // 1-indexed
    counts.set(kmer, existing);
  }

  const totalKmers = len - k + 1;
  const list: KmerFrequencyHit[] = [];

  counts.forEach((val, kmer) => {
    // Only consider kmers occurring more than once if sequence is reasonably long
    if (val.count >= 2 || len < 40) {
      const gc = Math.round(((kmer.match(/[GC]/g) || []).length / k) * 100);
      const freq = Math.round((val.count / totalKmers) * 1000) / 10;
      list.push({
        kmer,
        count: val.count,
        frequencyPercent: freq,
        gcPercent: gc,
        positions: val.positions,
      });
    }
  });

  // Sort descending by count, then by GC
  list.sort((a, b) => b.count - a.count || b.gcPercent - a.gcPercent);

  return list.slice(0, topN);
}

/**
 * Executes comprehensive motif discovery on a submitted lncRNA sequence:
 * Matches all curated plant regulatory motifs, user custom motifs, and computes k-mer frequencies.
 */
export function discoverRegulatoryMotifs(
  sequence: string,
  customMotifs: RegulatoryMotifDefinition[] = []
): MotifDiscoveryResult {
  const clean = (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  const seqLen = clean.length;

  const allMotifsToScan = [...PLANT_REGULATORY_MOTIFS, ...customMotifs];
  const allHits: DiscoveredMotifHit[] = [];

  for (const motif of allMotifsToScan) {
    const hits = findMotifHitsInSequence(clean, motif);
    allHits.push(...hits);
  }

  // Sort hits by 1-indexed start position
  allHits.sort((a, b) => a.start - b.start || b.length - a.length);

  // Group by category
  const hitsByCategory: Record<MotifCategory, DiscoveredMotifHit[]> = {
    'Abiotic Stress': [],
    'Biotic Defense': [],
    'RNA Processing & Stability': [],
    'RBP & Structural Hub': [],
    'miRNA Target Seed': [],
    'Custom User Motif': [],
  };

  const categoryCounts: Record<MotifCategory, number> = {
    'Abiotic Stress': 0,
    'Biotic Defense': 0,
    'RNA Processing & Stability': 0,
    'RBP & Structural Hub': 0,
    'miRNA Target Seed': 0,
    'Custom User Motif': 0,
  };

  const uniqueMotifs = new Set<string>();

  for (const hit of allHits) {
    uniqueMotifs.add(hit.motifId);
    if (hitsByCategory[hit.category]) {
      hitsByCategory[hit.category].push(hit);
      categoryCounts[hit.category]++;
    }
  }

  // Calculate top 5-mer frequencies
  const topKmers = calculateKmerFrequencies(clean, 5, 8);

  // Compute sequence conservation profile against curated stress templates
  const conservationProfile = computeSequenceConservationProfile(clean);

  return {
    querySequence: clean,
    sequenceLength: seqLen,
    totalHitsCount: allHits.length,
    uniqueMotifsFoundCount: uniqueMotifs.size,
    hits: allHits,
    hitsByCategory,
    categoryCounts,
    topKmers,
    conservationProfile,
  };
}

/**
 * Computes base-by-base conservation profile and identifies conserved region blocks
 * by evaluating k-mer synteny against curated plant stress lncRNA templates.
 */
export function computeSequenceConservationProfile(
  sequence: string
): SequenceConservationProfile {
  const clean = (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  const len = clean.length;
  if (len === 0) {
    return { scores: [], blocks: [], meanConservationPercent: 0 };
  }

  const templates = CURATED_LNCRNAS.map((t) =>
    t.sequence.toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U')
  );

  const scores: number[] = new Array(len).fill(0);

  // Pre-index templates with 5-mers for fast lookup
  const k = 5;
  const templateKmerSets = templates.map((tmpl) => {
    const set = new Set<string>();
    for (let i = 0; i <= tmpl.length - k; i++) {
      set.add(tmpl.slice(i, i + k));
    }
    return set;
  });

  for (let i = 0; i < len; i++) {
    const kmerStart = Math.max(0, Math.min(i - 2, len - k));
    const kmer = clean.slice(kmerStart, kmerStart + k);

    let matchCount = 0;
    if (kmer.length === k) {
      for (const set of templateKmerSets) {
        if (set.has(kmer)) {
          matchCount++;
        }
      }
    }

    const templateFraction = templateKmerSets.length ? matchCount / templateKmerSets.length : 0;
    const base = clean[i];
    const isGc = base === 'G' || base === 'C';
    const rawScore = 0.22 + templateFraction * 0.68 + (isGc ? 0.08 : 0.0);
    scores[i] = Math.min(0.98, Math.max(0.12, Math.round(rawScore * 100) / 100));
  }

  // Smooth scores with 3-nt moving average
  const smoothed: number[] = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const left = Math.max(0, i - 1);
    const right = Math.min(len - 1, i + 1);
    let sum = 0;
    for (let j = left; j <= right; j++) sum += scores[j];
    smoothed[i] = Math.round((sum / (right - left + 1)) * 100) / 100;
  }

  // Identify high/moderate conserved blocks (contiguous regions with score >= 0.50 of length >= 5 nt)
  const blocks: ConservedRegionBlock[] = [];
  let blockStart: number | null = null;
  let blockScores: number[] = [];

  for (let i = 0; i < len; i++) {
    if (smoothed[i] >= 0.50) {
      if (blockStart === null) {
        blockStart = i + 1; // 1-indexed
      }
      blockScores.push(smoothed[i]);
    } else {
      if (blockStart !== null) {
        const blockEnd = i; // 1-indexed
        const blockLen = blockEnd - blockStart + 1;
        if (blockLen >= 5) {
          const avg =
            Math.round(
              (blockScores.reduce((a, b) => a + b, 0) / blockScores.length) * 1000
            ) / 10;
          blocks.push({
            id: `cons_${blockStart}_${blockEnd}`,
            start: blockStart,
            end: blockEnd,
            length: blockLen,
            averageScorePercent: avg,
            level: avg >= 75 ? 'High (>75%)' : 'Moderate (50-75%)',
            homologyContext: 'Stress-conserved nucleotide tract aligned across plant pathology templates',
          });
        }
        blockStart = null;
        blockScores = [];
      }
    }
  }

  if (blockStart !== null) {
    const blockEnd = len;
    const blockLen = blockEnd - blockStart + 1;
    if (blockLen >= 5) {
      const avg =
        Math.round(
          (blockScores.reduce((a, b) => a + b, 0) / blockScores.length) * 1000
        ) / 10;
      blocks.push({
        id: `cons_${blockStart}_${blockEnd}`,
        start: blockStart,
        end: blockEnd,
        length: blockLen,
        averageScorePercent: avg,
        level: avg >= 75 ? 'High (>75%)' : 'Moderate (50-75%)',
        homologyContext: 'Stress-conserved nucleotide tract aligned across plant pathology templates',
      });
    }
  }

  const meanScore =
    smoothed.length > 0
      ? Math.round(
          (smoothed.reduce((a, b) => a + b, 0) / smoothed.length) * 1000
        ) / 10
      : 0;

  return {
    scores: smoothed,
    blocks,
    meanConservationPercent: meanScore,
  };
}
