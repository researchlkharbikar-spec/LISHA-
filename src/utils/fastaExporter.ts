/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA FASTA Exporter with Biophysical & Thermodynamic Annotations
 * Compliant with standard bioinformatics FASTA specifications and ViennaRNA format.
 */

import { validateLncRnaSequence, type SequenceValidationResult } from './sequenceValidator';
import { calculateNearestNeighborTm, type ThermodynamicParameters } from './thermodynamics';
import { predictRnaSecondaryStructure, type SecondaryStructureResult } from './bioCalculations';

export type FastaHeaderStyle =
  | 'bracket-attributes' // >ID [length=120 nt] [gc=54.2%] [tm=68.4C] ...
  | 'pipe-delimited' // >ID | Length: 120 nt | GC: 54.2% | Tm: 68.4°C ...
  | 'viennarna-structure' // >ID ... followed by sequence and dot-bracket with MFE
  | 'detailed-biophysical'; // Comprehensive biophysical parameters including dH, dS, dG, ions

export interface FastaExportOptions {
  identifier: string;
  sequence: string;
  headerStyle?: FastaHeaderStyle;
  lineWrap?: 60 | 80 | 0; // 0 means no wrap (single line)
  asDna?: boolean; // convert U to T for cDNA ordering
  saltNaM?: number; // Monovalent [Na+] in M (default 0.1 M / 100 mM)
  saltMgM?: number; // Divalent [Mg2+] in M (default 0.0015 M / 1.5 mM)
  oligoConcM?: number; // Strand [Ct] in M (default 1e-6 M / 1 uM)
  isHairpin?: boolean; // Folding topology
  thermoParams?: ThermodynamicParameters;
  structureResult?: SecondaryStructureResult;
  organism?: string;
  notes?: string;
}

export interface GeneratedFasta {
  header: string;
  sequenceLines: string[];
  structureLine?: string; // For ViennaRNA format
  rawFastaText: string;
  metadata: {
    length: number;
    gcPercent: number;
    auPercent: number;
    tmNearestNeighbor: number;
    deltaG37: number;
    deltaH: number;
    deltaS: number;
    mfeKcal: number;
    stabilityCategory: string;
    isDna: boolean;
  };
}

/**
 * Wraps a sequence string into lines of fixed length (e.g., standard 60 or 80 nt per line).
 */
export function wrapSequence(seq: string, lineLength: number): string[] {
  if (lineLength <= 0 || seq.length <= lineLength) {
    return [seq];
  }
  const lines: string[] = [];
  for (let i = 0; i < seq.length; i += lineLength) {
    lines.push(seq.slice(i, i + lineLength));
  }
  return lines;
}

/**
 * Sanitizes identifier for FASTA header line.
 */
function sanitizeIdentifier(id: string): string {
  const cleaned = (id || 'lncRNA_sequence').trim();
  // If user pasted a header starting with >, strip it
  return cleaned.startsWith('>') ? cleaned.slice(1).trim() : cleaned;
}

/**
 * Formats a number to 1 or 2 decimal places.
 */
function fmt(num: number, decimals = 1): string {
  return Number.isFinite(num) ? num.toFixed(decimals) : '0.0';
}

/**
 * Generates annotated FASTA content containing validated lncRNA sequence
 * and its biophysical and thermodynamic properties.
 */
export function generateBiophysicalFasta(options: FastaExportOptions): GeneratedFasta {
  const {
    identifier,
    sequence,
    headerStyle = 'bracket-attributes',
    lineWrap = 60,
    asDna = false,
    saltNaM = 0.1,
    saltMgM = 0.0015,
    oligoConcM = 1e-6,
    isHairpin = false,
    organism,
    notes,
  } = options;

  const validation: SequenceValidationResult = validateLncRnaSequence(sequence);
  let cleanSeq = validation.cleanedSequence;

  // Convert to DNA if requested (U -> T)
  if (asDna) {
    cleanSeq = cleanSeq.replace(/U/g, 'T');
  }

  // Compute thermodynamics if not provided
  const thermo: ThermodynamicParameters =
    options.thermoParams ||
    calculateNearestNeighborTm(cleanSeq, saltNaM, saltMgM, oligoConcM, isHairpin);

  // Compute 2D secondary structure if not provided
  const struct: SecondaryStructureResult =
    options.structureResult || predictRnaSecondaryStructure(cleanSeq);

  const cleanId = sanitizeIdentifier(identifier);
  const len = cleanSeq.length;
  const gc = validation.composition.gcPercent;
  const au = validation.composition.auPercent;
  const tm = thermo.saltAdjustedTm || thermo.meltingTemperatureTm;
  const dG = thermo.freeEnergyDeltaG37;
  const dH = thermo.enthalpyDeltaH;
  const dS = thermo.entropyDeltaS;
  const mfe = struct.estimatedMfeKcal;
  const seqType = asDna ? 'cDNA' : 'lncRNA';

  let headerLine = '';

  switch (headerStyle) {
    case 'pipe-delimited': {
      const parts: string[] = [
        `>${cleanId}`,
        `Type: ${seqType}`,
        `Length: ${len}nt`,
        `GC: ${fmt(gc)}%`,
        `AU: ${fmt(au)}%`,
        `Tm(NN): ${fmt(tm)}°C`,
        `ΔG°37: ${fmt(dG, 2)} kcal/mol`,
        `ΔH°: ${fmt(dH, 1)} kcal/mol`,
        `MFE: ${fmt(mfe, 2)} kcal/mol`,
        `Stability: ${thermo.stabilityCategory}`,
      ];
      if (organism) parts.splice(1, 0, `Organism: ${organism}`);
      if (notes) parts.push(`Note: ${notes}`);
      headerLine = parts.join(' | ');
      break;
    }

    case 'viennarna-structure': {
      // Standard ViennaRNA format: >ID description \n SEQ \n STRUCTURE (MFE)
      const descParts: string[] = [
        cleanId,
        `len=${len}nt`,
        `GC=${fmt(gc)}%`,
        `Tm=${fmt(tm)}C`,
        `dG37=${fmt(dG, 2)}kcal/mol`,
      ];
      if (organism) descParts.push(`organism=${organism}`);
      headerLine = `>${descParts.join(' ')}`;
      break;
    }

    case 'detailed-biophysical': {
      const naMm = Math.round(saltNaM * 1000);
      const mgMm = Number((saltMgM * 1000).toFixed(1));
      const ctUm = Number((oligoConcM * 1e6).toFixed(2));
      const topology = isHairpin ? 'Hairpin(monomolecular)' : 'Duplex(intermolecular)';

      const tags: string[] = [
        `>${cleanId}`,
        `[molecule=${seqType}]`,
        organism ? `[organism="${organism}"]` : '',
        `[length=${len}nt]`,
        `[base_counts=A:${validation.composition.a},C:${validation.composition.c},G:${validation.composition.g},U/T:${validation.composition.u}]`,
        `[gc_content=${fmt(gc)}%]`,
        `[au_content=${fmt(au)}%]`,
        `[tm_nearest_neighbor=${fmt(tm)}°C]`,
        `[tm_wallace=${fmt(thermo.basicTm)}°C]`,
        `[delta_h_nn=${fmt(dH, 1)} kcal/mol]`,
        `[delta_s_nn=${fmt(dS, 1)} cal/(mol·K)]`,
        `[delta_g_37=${fmt(dG, 2)} kcal/mol]`,
        `[mfe_2d=${fmt(mfe, 2)} kcal/mol]`,
        `[base_pairs=${struct.basePairs.length}]`,
        `[stability="${thermo.stabilityCategory}"]`,
        `[ionic_conditions="Na+:${naMm}mM, Mg2+:${mgMm}mM, Ct:${ctUm}uM, ${topology}"]`,
        notes ? `[note="${notes}"]` : '',
      ].filter(Boolean);

      headerLine = tags.join(' ');
      break;
    }

    case 'bracket-attributes':
    default: {
      const tags: string[] = [
        `>${cleanId}`,
        organism ? `[organism=${organism}]` : '',
        `[molecule=${seqType}]`,
        `[length=${len}nt]`,
        `[gc=${fmt(gc)}%]`,
        `[tm_nn=${fmt(tm)}C]`,
        `[dg37=${fmt(dG, 2)}kcal/mol]`,
        `[mfe=${fmt(mfe, 2)}kcal/mol]`,
        `[stability="${thermo.stabilityCategory}"]`,
        notes ? `[note="${notes}"]` : '',
      ].filter(Boolean);

      headerLine = tags.join(' ');
      break;
    }
  }

  const sequenceLines = wrapSequence(cleanSeq, lineWrap);

  let rawFastaText = `${headerLine}\n${sequenceLines.join('\n')}`;

  // If ViennaRNA style, append the dot bracket structure line
  let structureLine: string | undefined;
  if (headerStyle === 'viennarna-structure') {
    const wrappedDotBracket = wrapSequence(struct.dotBracket, lineWrap).join('\n');
    structureLine = `${wrappedDotBracket} (${fmt(mfe, 2)} kcal/mol)`;
    rawFastaText = `${rawFastaText}\n${structureLine}`;
  }

  return {
    header: headerLine,
    sequenceLines,
    structureLine,
    rawFastaText,
    metadata: {
      length: len,
      gcPercent: gc,
      auPercent: au,
      tmNearestNeighbor: Number(fmt(tm)),
      deltaG37: Number(fmt(dG, 2)),
      deltaH: Number(fmt(dH, 1)),
      deltaS: Number(fmt(dS, 1)),
      mfeKcal: Number(fmt(mfe, 2)),
      stabilityCategory: thermo.stabilityCategory,
      isDna: asDna,
    },
  };
}

/**
 * Triggers a browser download of the generated FASTA content.
 */
export function downloadFastaFile(filename: string, fastaContent: string): void {
  const safeName = filename
    .trim()
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_{2,}/g, '_');

  const finalName = safeName.endsWith('.fasta') || safeName.endsWith('.fa')
    ? safeName
    : `${safeName || 'lncRNA_sequence'}.fasta`;

  const blob = new Blob([fastaContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
