/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Thermophysical Property Calculator Component
 * Estimates the RNA melting temperature (Tm) and thermodynamic parameters
 * using the nearest-neighbor method (Xia et al., 1998; SantaLucia, 1998).
 */

import React, { useState, useMemo } from 'react';
import {
  Thermometer,
  Flame,
  Droplets,
  Sliders,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Activity,
  Layers,
  FileDown,
} from 'lucide-react';
import {
  calculateNearestNeighborTm,
  calculateSlidingWindowTm,
  type ThermodynamicParameters,
} from '../utils/thermodynamics';

interface ThermophysicalCalculatorProps {
  sequence: string;
  name?: string;
  onExportFasta?: () => void;
}

export const ThermophysicalCalculator: React.FC<ThermophysicalCalculatorProps> = ({
  sequence,
  name = 'Validated lncRNA',
  onExportFasta,
}) => {
  // Buffer and condition controls
  const [naMilliMolar, setNaMilliMolar] = useState<number>(100); // 100 mM Na+
  const [mgMilliMolar, setMgMilliMolar] = useState<number>(1.5); // 1.5 mM Mg2+
  const [oligoMicroMolar, setOligoMicroMolar] = useState<number>(1.0); // 1.0 uM oligo
  const [isHairpin, setIsHairpin] = useState<boolean>(true); // default hairpin monomolecular
  const [showStepDetails, setShowStepDetails] = useState<boolean>(false);

  // Clean sequence (uppercase RNA)
  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  // Compute thermodynamics
  const thermo = useMemo<ThermodynamicParameters>(() => {
    const naM = naMilliMolar / 1000;
    const mgM = mgMilliMolar / 1000;
    const oligoM = oligoMicroMolar / 1e6;
    return calculateNearestNeighborTm(cleanSeq, naM, mgM, oligoM, isHairpin);
  }, [cleanSeq, naMilliMolar, mgMilliMolar, oligoMicroMolar, isHairpin]);

  // Sliding window Tm profile
  const slidingProfile = useMemo(() => {
    return calculateSlidingWindowTm(cleanSeq, 15, 3);
  }, [cleanSeq]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-rose-600" />
              Nearest-Neighbor Biophysics
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Thermophysical Stability & Melting Temperature (Tm)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thermodynamic folding stability evaluated using nearest-neighbor parameters (Xia et al. 1998, SantaLucia 1998).
          </p>
        </div>

        {/* Stability Category Badge & Export Action */}
        <div className="flex items-center gap-2">
          {onExportFasta && (
            <button
              onClick={onExportFasta}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export FASTA with Tm parameters"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Export FASTA</span>
            </button>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              thermo.saltAdjustedTm >= 70
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : thermo.saltAdjustedTm >= 55
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {thermo.stabilityCategory}
          </span>
        </div>
      </div>

      {/* Main Big Thermophysical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Salt-Adjusted Tm */}
        <div className="bg-gradient-to-br from-rose-50 to-orange-50/40 border border-rose-200 rounded-xl p-4 text-center">
          <div className="text-xs font-bold text-rose-900 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>Melting Temp (Tm)</span>
          </div>
          <div className="text-3xl font-black text-rose-700 font-mono mt-1">
            {thermo.saltAdjustedTm}°C
          </div>
          <div className="text-[11px] text-rose-800 font-medium mt-0.5">
            Salt-adjusted ({naMilliMolar}mM Na⁺, {mgMilliMolar}mM Mg²⁺)
          </div>
        </div>

        {/* Free Energy Delta G 37 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-xs font-bold text-blue-900 flex items-center justify-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Free Energy (ΔG°₃₇)</span>
          </div>
          <div className="text-3xl font-black text-blue-700 font-mono mt-1">
            {thermo.freeEnergyDeltaG37}
          </div>
          <div className="text-[11px] text-blue-800 font-medium mt-0.5">
            kcal/mol at 37°C
          </div>
        </div>

        {/* Enthalpy Delta H */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enthalpy (ΔH°)</span>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono mt-1">
            {thermo.enthalpyDeltaH}
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
            kcal/mol (Stacking & H-bonds)
          </div>
        </div>

        {/* Entropy Delta S */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50/40 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-xs font-bold text-purple-900 flex items-center justify-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-purple-600" />
            <span>Entropy (ΔS°)</span>
          </div>
          <div className="text-3xl font-black text-purple-700 font-mono mt-1">
            {thermo.entropyDeltaS}
          </div>
          <div className="text-[11px] text-purple-800 font-medium mt-0.5">
            cal/(mol·K)
          </div>
        </div>
      </div>

      {/* Interactive Condition Adjuster */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Buffer & Hybridization Conditions
          </span>
          <span className="text-[11px] text-slate-500">
            Adjust buffer conditions to recalculate Tm dynamically
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          {/* Monovalent Cation */}
          <div>
            <div className="flex justify-between text-slate-700 mb-1">
              <span>Monovalent [Na⁺/K⁺]</span>
              <span className="font-mono font-bold text-blue-600">{naMilliMolar} mM</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={naMilliMolar}
              onChange={(e) => setNaMilliMolar(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Divalent Cation */}
          <div>
            <div className="flex justify-between text-slate-700 mb-1">
              <span>Divalent [Mg²⁺]</span>
              <span className="font-mono font-bold text-emerald-600">{mgMilliMolar} mM</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={mgMilliMolar}
              onChange={(e) => setMgMilliMolar(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          {/* Oligonucleotide Concentration */}
          <div>
            <div className="flex justify-between text-slate-700 mb-1">
              <span>Strand Conc [Cₜ]</span>
              <span className="font-mono font-bold text-purple-600">{oligoMicroMolar} µM</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={oligoMicroMolar}
              onChange={(e) => setOligoMicroMolar(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Molecular Topology Toggle */}
          <div>
            <div className="text-slate-700 mb-1">Folding Topology</div>
            <div className="flex rounded-md border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsHairpin(true)}
                className={`flex-1 py-1 text-center font-medium transition-colors cursor-pointer ${
                  isHairpin ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Hairpin Stem
              </button>
              <button
                type="button"
                onClick={() => setIsHairpin(false)}
                className={`flex-1 py-1 text-center font-medium transition-colors cursor-pointer ${
                  !isHairpin ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Duplex
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison against other methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">Nearest-Neighbor Standard Tm (1M Na⁺)</div>
          <div className="text-lg font-mono font-bold text-slate-800 mt-1">
            {thermo.meltingTemperatureTm}°C
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Thermodynamic reference baseline</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">Marmur-Doty Empirical Tm</div>
          <div className="text-lg font-mono font-bold text-slate-800 mt-1">
            {thermo.basicTm}°C
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Length & GC empirical formula</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500 font-medium">GC Nucleotide Ratio</div>
          <div className="text-lg font-mono font-bold text-blue-700 mt-1">
            {thermo.gcContentPercent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Guanine-Cytosine 3-bond density</div>
        </div>
      </div>

      {/* Plant Biotic Stress Context Note */}
      <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Plant Pathology Biophysical Relevance: </span>
          During early pathogen infection, stomatal closure raises canopy temperature by +0.5 to +2.5°C (reducing evaporative cooling). lncRNAs with higher melting temperatures (&gt;55°C) maintain rigid stem-loop scaffolds to recruit chromatin remodeling complexes (e.g. MED19a by ELENA1), while thermally dynamic loops (&lt;50°C) act as flexible conformational switches.
        </div>
      </div>

      {/* Collapsible Dinucleotide Step Analysis */}
      <div>
        <button
          onClick={() => setShowStepDetails(!showStepDetails)}
          className="text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {showStepDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>
            {showStepDetails ? 'Hide' : 'View'} Nearest-Neighbor Dinucleotide Step Matrix ({thermo.dinucleotideSteps.length} steps)
          </span>
        </button>

        {showStepDetails && (
          <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Step #</th>
                  <th className="py-2 px-3">Dinucleotide</th>
                  <th className="py-2 px-3">ΔH° (kcal/mol)</th>
                  <th className="py-2 px-3">ΔS° (cal/mol·K)</th>
                  <th className="py-2 px-3">ΔG°₃₇ (kcal/mol)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thermo.dinucleotideSteps.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-bold text-blue-700">{s.dinucleotide}</td>
                    <td className="py-1.5 px-3">{s.deltaH}</td>
                    <td className="py-1.5 px-3">{s.deltaS}</td>
                    <td className="py-1.5 px-3 font-semibold text-emerald-700">{s.deltaG37}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
