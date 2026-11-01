/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Thermophysical Property Calculator
 * Nearest-Neighbor thermodynamic parameter calculations for RNA duplexes & hairpins.
 * Implements Xia et al. (1998), Mathews et al. (1999), and SantaLucia (1998).
 */

export interface ThermodynamicParameters {
  enthalpyDeltaH: number; // kcal/mol
  entropyDeltaS: number; // cal/(mol·K)
  freeEnergyDeltaG37: number; // kcal/mol at 37°C
  meltingTemperatureTm: number; // °C
  saltAdjustedTm: number; // °C with [Na+] and [Mg2+] corrections
  basicTm: number; // Basic Wallace / Marmur-Doty °C
  gcContentPercent: number;
  dinucleotideSteps: {
    dinucleotide: string;
    deltaH: number;
    deltaS: number;
    deltaG37: number;
  }[];
  conditionDetails: {
    monovalentNaM: number;
    divalentMgM: number;
    oligoConcentrationM: number;
    isHairpinMonomolecular: boolean;
  };
  stabilityCategory: 'Hyper-stable (>75°C)' | 'Standard Stable (55-75°C)' | 'Physiological Labile (40-55°C)' | 'Low-Melting (<40°C)';
}

// Gas constant in cal/(mol·K)
const R_GAS = 1.9872;

// RNA Watson-Crick Nearest Neighbor Parameters (Xia et al., 1998; Biochemistry 37: 14719-14735)
// Delta H in kcal/mol, Delta S in cal/(mol·K)
const RNA_NN_PARAMS: Record<string, { deltaH: number; deltaS: number }> = {
  // AA / UU
  AA: { deltaH: -6.82, deltaS: -19.0 },
  TT: { deltaH: -6.82, deltaS: -19.0 },
  UU: { deltaH: -6.82, deltaS: -19.0 },
  // AU / UA
  AU: { deltaH: -9.38, deltaS: -26.7 },
  AT: { deltaH: -9.38, deltaS: -26.7 },
  // UA / AU
  UA: { deltaH: -7.69, deltaS: -20.5 },
  TA: { deltaH: -7.69, deltaS: -20.5 },
  // CU / GA
  CU: { deltaH: -10.48, deltaS: -27.1 },
  CT: { deltaH: -10.48, deltaS: -27.1 },
  // CA / GU
  CA: { deltaH: -10.44, deltaS: -26.9 },
  // GA / CU
  GA: { deltaH: -12.44, deltaS: -32.5 },
  // GU / CA
  GU: { deltaH: -11.40, deltaS: -29.5 },
  GT: { deltaH: -11.40, deltaS: -29.5 },
  // CG / GC
  CG: { deltaH: -10.64, deltaS: -26.7 },
  // GC / CG
  GC: { deltaH: -14.88, deltaS: -36.9 },
  // GG / CC
  GG: { deltaH: -13.39, deltaS: -32.7 },
  // CC / GG
  CC: { deltaH: -13.39, deltaS: -32.7 },
};

/**
 * Calculates Nearest-Neighbor thermodynamic properties and melting temperature (Tm).
 *
 * @param sequence RNA or DNA nucleotide sequence
 * @param naConc Monovalent cation [Na+] in M (default 0.1 M / 100 mM)
 * @param mgConc Divalent cation [Mg2+] in M (default 0.0015 M / 1.5 mM)
 * @param oligoConc Oligonucleotide concentration in M (default 1e-6 M / 1 uM)
 * @param isHairpin Whether folding is monomolecular (hairpin stem) or intermolecular duplex
 */
export function calculateNearestNeighborTm(
  sequence: string,
  naConc = 0.1, // 100 mM
  mgConc = 0.0015, // 1.5 mM
  oligoConc = 1e-6, // 1 uM
  isHairpin = false
): ThermodynamicParameters {
  const clean = (sequence || '')
    .toUpperCase()
    .replace(/[^ACGTU]/g, '')
    .replace(/T/g, 'U');

  const len = clean.length;
  if (len < 2) {
    return {
      enthalpyDeltaH: 0,
      entropyDeltaS: 0,
      freeEnergyDeltaG37: 0,
      meltingTemperatureTm: 0,
      saltAdjustedTm: 0,
      basicTm: 0,
      gcContentPercent: 0,
      dinucleotideSteps: [],
      conditionDetails: {
        monovalentNaM: naConc,
        divalentMgM: mgConc,
        oligoConcentrationM: oligoConc,
        isHairpinMonomolecular: isHairpin,
      },
      stabilityCategory: 'Low-Melting (<40°C)',
    };
  }

  let totalDeltaH = 0;
  let totalDeltaS = 0;
  const dinucleotideSteps: ThermodynamicParameters['dinucleotideSteps'] = [];

  // Helix Initiation parameters (Xia et al., 1998)
  const firstBase = clean[0];
  const lastBase = clean[len - 1];

  // Initiation with G/C vs A/U
  const startGc = firstBase === 'G' || firstBase === 'C';
  const endGc = lastBase === 'G' || lastBase === 'C';

  // Initiation terms
  totalDeltaH += (startGc ? 3.61 : 3.72) + (endGc ? 3.61 : 3.72);
  totalDeltaS += (startGc ? -1.5 : 5.8) + (endGc ? -1.5 : 5.8);

  // Iterate over nearest-neighbor dinucleotide steps
  for (let i = 0; i < len - 1; i++) {
    const step = clean.slice(i, i + 2);
    const params = RNA_NN_PARAMS[step] || {
      // Conservative default fallback based on GC ratio of step
      deltaH: step.includes('G') || step.includes('C') ? -11.5 : -7.5,
      deltaS: step.includes('G') || step.includes('C') ? -29.0 : -21.0,
    };

    totalDeltaH += params.deltaH;
    totalDeltaS += params.deltaS;

    // Delta G at 37°C (310.15 K) in kcal/mol
    const stepDeltaG = params.deltaH - (310.15 * params.deltaS) / 1000;
    dinucleotideSteps.push({
      dinucleotide: step,
      deltaH: Math.round(params.deltaH * 100) / 100,
      deltaS: Math.round(params.deltaS * 100) / 100,
      deltaG37: Math.round(stepDeltaG * 100) / 100,
    });
  }

  // Salt correction for entropy (SantaLucia, 1998; Owczarzy et al., 2004)
  // Calculate effective monovalent concentration including Mg2+
  // [Na+]_eff = [Na+] + 120 * sqrt([Mg2+])
  const effectiveNa = Math.max(0.001, naConc + 120 * Math.sqrt(Math.max(0, mgConc)));
  const saltDeltaS = totalDeltaS + 0.368 * (len - 1) * Math.log(effectiveNa);

  // Tm calculation:
  // For intermolecular duplex: Tm = DeltaH / (DeltaS + R * ln(Ct / 4)) - 273.15
  // For monomolecular hairpin: Tm = DeltaH / (DeltaS + R * ln(Ct)) - 273.15
  const concFactor = isHairpin ? oligoConc : oligoConc / 4;
  const standardDenominator = totalDeltaS + R_GAS * Math.log(concFactor);
  const saltAdjustedDenominator = saltDeltaS + R_GAS * Math.log(concFactor);

  const rawStandardTm = totalDeltaH !== 0 && standardDenominator !== 0
    ? (totalDeltaH * 1000) / standardDenominator - 273.15
    : 0;

  const rawSaltTm = totalDeltaH !== 0 && saltAdjustedDenominator !== 0
    ? (totalDeltaH * 1000) / saltAdjustedDenominator - 273.15
    : 0;

  // Delta G at 37°C
  const deltaG37 = totalDeltaH - (310.15 * totalDeltaS) / 1000;

  // Basic Marmur-Doty / Wallace formula for comparison:
  // For short sequences (<14): Tm = (wA + xT) * 2 + (yG + zC) * 4
  // For longer: Tm = 64.9 + 41 * (G+C - 16.4) / len
  const gCount = (clean.match(/G/g) || []).length;
  const cCount = (clean.match(/C/g) || []).length;
  const aCount = (clean.match(/A/g) || []).length;
  const uCount = (clean.match(/U/g) || []).length;
  const gcCount = gCount + cCount;
  const gcPercent = Math.round((gcCount / len) * 1000) / 10;

  let basicTm = 0;
  if (len < 14) {
    basicTm = (aCount + uCount) * 2 + (gCount + cCount) * 4;
  } else {
    basicTm = 64.9 + (41 * (gcCount - 16.4)) / len;
  }

  const saltAdjustedTm = Math.max(5, Math.min(115, Math.round(rawSaltTm * 10) / 10));
  const meltingTemperatureTm = Math.max(5, Math.min(115, Math.round(rawStandardTm * 10) / 10));

  let stabilityCategory: ThermodynamicParameters['stabilityCategory'] = 'Standard Stable (55-75°C)';
  if (saltAdjustedTm > 75) {
    stabilityCategory = 'Hyper-stable (>75°C)';
  } else if (saltAdjustedTm >= 55) {
    stabilityCategory = 'Standard Stable (55-75°C)';
  } else if (saltAdjustedTm >= 40) {
    stabilityCategory = 'Physiological Labile (40-55°C)';
  } else {
    stabilityCategory = 'Low-Melting (<40°C)';
  }

  return {
    enthalpyDeltaH: Math.round(totalDeltaH * 10) / 10,
    entropyDeltaS: Math.round(totalDeltaS * 10) / 10,
    freeEnergyDeltaG37: Math.round(deltaG37 * 10) / 10,
    meltingTemperatureTm,
    saltAdjustedTm,
    basicTm: Math.round(basicTm * 10) / 10,
    gcContentPercent: gcPercent,
    dinucleotideSteps,
    conditionDetails: {
      monovalentNaM: naConc,
      divalentMgM: mgConc,
      oligoConcentrationM: oligoConc,
      isHairpinMonomolecular: isHairpin,
    },
    stabilityCategory,
  };
}

/**
 * Computes a sliding-window melting temperature and GC profile across the sequence.
 */
export function calculateSlidingWindowTm(
  sequence: string,
  windowSize = 15,
  stepSize = 3
): { position: number; segment: string; tm: number; gcPercent: number }[] {
  const clean = (sequence || '')
    .toUpperCase()
    .replace(/[^ACGTU]/g, '')
    .replace(/T/g, 'U');

  const results: { position: number; segment: string; tm: number; gcPercent: number }[] = [];
  const w = Math.min(clean.length, Math.max(6, windowSize));

  for (let i = 0; i <= clean.length - w; i += stepSize) {
    const segment = clean.slice(i, i + w);
    const tmResult = calculateNearestNeighborTm(segment);
    results.push({
      position: i + 1,
      segment,
      tm: tmResult.saltAdjustedTm,
      gcPercent: tmResult.gcContentPercent,
    });
  }

  return results;
}
