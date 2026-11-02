/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Stem-Loop Discovery & Fold-Energy Estimator Widget
 * Visualizes predicted hairpin secondary structures and thermodynamic fold-energies.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState, useMemo } from 'react';
import {
  Dna,
  Flame,
  Thermometer,
  Layers,
  Sparkles,
  Info,
  Copy,
  Check,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Download,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  predictStemLoops,
  type StemLoopCandidate,
  type StemLoopOptions,
} from '../utils/stemLoopPredictor';

interface StemLoopWidgetProps {
  sequence: string;
  sequenceName?: string;
  onSelectRegion?: (start: number, end: number) => void;
  compact?: boolean;
}

export const StemLoopWidget: React.FC<StemLoopWidgetProps> = ({
  sequence,
  sequenceName = 'Query lncRNA',
  onSelectRegion,
  compact = false,
}) => {
  // Filter & sorting states
  const [filterMode, setFilterMode] = useState<'all' | 'stable' | 'tetraloops'>('all');
  const [sortBy, setSortBy] = useState<'energy' | 'position' | 'length' | 'tm'>('energy');
  const [minStemLength, setMinStemLength] = useState<number>(3);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState<boolean>(false);

  // Predict stem-loops using fold-energy estimation
  const stemLoops = useMemo(() => {
    return predictStemLoops(sequence, {
      minStemLength,
      maxCandidates: 25,
      allowWobble: true,
    });
  }, [sequence, minStemLength]);

  // Set default selection
  React.useEffect(() => {
    if (stemLoops.length > 0 && (!selectedCandidateId || !stemLoops.some((s) => s.id === selectedCandidateId))) {
      setSelectedCandidateId(stemLoops[0].id);
    }
  }, [stemLoops, selectedCandidateId]);

  // Filtered & sorted candidates
  const filteredCandidates = useMemo(() => {
    return stemLoops
      .filter((cand) => {
        if (filterMode === 'stable') return cand.foldEnergy.deltaG37 <= -2.5;
        if (filterMode === 'tetraloops') return cand.hasTetraloop;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'energy') return a.foldEnergy.deltaG37 - b.foldEnergy.deltaG37;
        if (sortBy === 'position') return a.start - b.start;
        if (sortBy === 'length') return b.stemLength - a.stemLength;
        if (sortBy === 'tm') return b.foldEnergy.meltingTemperatureTm - a.foldEnergy.meltingTemperatureTm;
        return 0;
      });
  }, [stemLoops, filterMode, sortBy]);

  const activeCandidate = useMemo(() => {
    return stemLoops.find((s) => s.id === selectedCandidateId) || stemLoops[0] || null;
  }, [stemLoops, selectedCandidateId]);

  const handleCopySequence = (cand: StemLoopCandidate) => {
    const fasta = `>${sequenceName}_stem_loop_${cand.start}_${cand.end} [len=${cand.length}nt] [stem=${cand.stemLength}bp] [dG37=${cand.foldEnergy.deltaG37}kcal/mol] [Tm=${cand.foldEnergy.meltingTemperatureTm}°C]\n${cand.fullSequence}\n${cand.dotBracket}`;
    navigator.clipboard.writeText(fasta);
    setCopiedId(cand.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadFasta = (cand: StemLoopCandidate) => {
    const fasta = `>${sequenceName}_stem_loop_${cand.start}_${cand.end} [length=${cand.length}nt] [stem=${cand.stemLength}bp] [dG37=${cand.foldEnergy.deltaG37}kcal/mol] [Tm=${cand.foldEnergy.meltingTemperatureTm}°C]\n${cand.fullSequence}\n${cand.dotBracket}`;
    const blob = new Blob([fasta], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sequenceName}_stem_loop_${cand.start}_${cand.end}.fasta`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (stemLoops.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
        <Dna className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-slate-700">No Potential Stem-Loops Identified</h4>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
          Try lowering the minimum stem length to 2 or 3 bp, or ensure the sequence contains complementary self-hybridizing tracts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Widget Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
            <Dna className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded">
                Secondary Structure Predictor
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Stem-Loop Hairpin & Fold-Energy Estimator
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Thermodynamic Turner nearest-neighbor fold-energy ($\Delta G^\circ_{37}$), stem base-pair stacking, and loop strain evaluation.
            </p>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stem length selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Min Stem:</span>
            <select
              value={minStemLength}
              onChange={(e) => setMinStemLength(Number(e.target.value))}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value={3}>3 bp</option>
              <option value={4}>4 bp (Higher stringency)</option>
              <option value={5}>5 bp</option>
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({stemLoops.length})
            </button>
            <button
              onClick={() => setFilterMode('stable')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterMode === 'stable' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Stable (ΔG &lt; 0)
            </button>
            <button
              onClick={() => setFilterMode('tetraloops')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                filterMode === 'tetraloops' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tetraloops
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="energy">Sort: Fold Stability (ΔG°)</option>
              <option value="position">Sort: Position (5' → 3')</option>
              <option value="length">Sort: Stem Length</option>
              <option value="tm">Sort: Melting Temp (Tm)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Widget Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Left Column: Hairpin Candidate Cards */}
        <div className="lg:col-span-5 p-3.5 space-y-2 max-h-[460px] overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Predicted Hairpin Stems ({filteredCandidates.length})</span>
            <span className="font-mono text-[10px]">Ranked by ΔG°37</span>
          </div>

          {filteredCandidates.map((cand, idx) => {
            const isSelected = cand.id === selectedCandidateId;
            const isHighlyStable = cand.foldEnergy.stability === 'Highly Stable';
            const isStable = cand.foldEnergy.stability === 'Stable';

            return (
              <div
                key={cand.id}
                onClick={() => {
                  setSelectedCandidateId(cand.id);
                  if (onSelectRegion) onSelectRegion(cand.start, cand.end);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{cand.name}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isHighlyStable
                        ? 'bg-emerald-100 text-emerald-800'
                        : isStable
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    ΔG: {cand.foldEnergy.deltaG37} kcal/mol
                  </span>
                </div>

                {/* Subsequence Specs */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Stem: <strong className="text-slate-800 font-bold">{cand.stemLength} bp</strong></span>
                  <span>•</span>
                  <span>Loop: <strong className="text-slate-800 font-bold">{cand.loopLength} nt</strong> ({cand.loopSequence})</span>
                  <span>•</span>
                  <span>Tm: <strong className="text-rose-700 font-bold">{cand.foldEnergy.meltingTemperatureTm}°C</strong></span>
                  {cand.hasTetraloop && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-bold text-[9px] uppercase tracking-wide">
                      {cand.tetraloopMotif} Tetraloop
                    </span>
                  )}
                </div>

                {/* Dot-Bracket Snippet */}
                <div className="mt-2 bg-slate-900 text-emerald-400 font-mono text-[10px] p-1.5 rounded truncate select-all">
                  {cand.dotBracket}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Stem-Loop Detailed Interactive Schematic & Energy Decomposition */}
        {activeCandidate ? (
          <div className="lg:col-span-7 p-5 space-y-5 bg-white">
            {/* Active Candidate Title & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900">{activeCandidate.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    Pos {activeCandidate.start}–{activeCandidate.end} ({activeCandidate.length} nt)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeCandidate.biologicalRoleHint}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopySequence(activeCandidate)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy FASTA with dot-bracket notation"
                >
                  {copiedId === activeCandidate.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedId === activeCandidate.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownloadFasta(activeCandidate)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Download FASTA structure record"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>FASTA</span>
                </button>
              </div>
            </div>

            {/* Fold-Energy Decomposition Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Net Fold ΔG°37</span>
                <div className="text-base font-extrabold text-indigo-700 mt-0.5">
                  {activeCandidate.foldEnergy.deltaG37} <span className="text-[10px] font-normal text-slate-500">kcal/mol</span>
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                  {activeCandidate.foldEnergy.stability}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Stem Stacking ΔG°</span>
                <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {activeCandidate.foldEnergy.stemDeltaG} <span className="text-[10px] font-normal text-slate-500">kcal/mol</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{activeCandidate.stemLength} base pairs</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Loop Strain Penalty</span>
                <div className="text-base font-extrabold text-amber-700 mt-0.5">
                  +{activeCandidate.foldEnergy.loopPenalty} <span className="text-[10px] font-normal text-slate-500">kcal/mol</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{activeCandidate.loopLength} nt hairpin loop</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Unimolecular Tm</span>
                <div className="text-base font-extrabold text-rose-700 mt-0.5">
                  {activeCandidate.foldEnergy.meltingTemperatureTm}°C
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">GC: {activeCandidate.gcContentPercent}%</div>
              </div>
            </div>

            {/* Visual Hairpin Stem-Loop Ladder Schematic */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Stem-Loop Structural Ladder Schematic</span>
                </h5>
                <span className="text-[10px] font-mono text-slate-400">
                  GC (3 H-bonds) • AU (2 H-bonds) • GU (Wobble)
                </span>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-center select-none overflow-x-auto">
                {/* Apical Loop Curve */}
                <div className="flex flex-col items-center">
                  <div className="px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-mono font-black text-xs shadow-2xs tracking-widest flex items-center gap-1">
                    <span>{activeCandidate.loopSequence}</span>
                    {activeCandidate.hasTetraloop && <Sparkles className="w-3 h-3 text-amber-600 ml-0.5" />}
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    Terminal Hairpin Loop ({activeCandidate.loopLength} nt)
                  </div>
                  {/* Connector lines to top stem pair */}
                  <div className="w-8 h-3 border-x-2 border-slate-300" />
                </div>

                {/* Stem Base Pairs Ladder (Inside -> Outside or Top -> Bottom) */}
                <div className="space-y-1.5 w-full max-w-sm">
                  {[...activeCandidate.basePairs].reverse().map((bp, idx) => {
                    const isGC = bp.pairType === 'GC';
                    const isAU = bp.pairType === 'AU';
                    const bondSymbol = isGC ? '≡' : isAU ? '=' : '•';
                    const bondColor = isGC ? 'text-emerald-700' : isAU ? 'text-amber-700' : 'text-purple-700';
                    const badgeBg = isGC
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : isAU
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-purple-50 text-purple-900 border-purple-300';

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-1 bg-slate-50/70 border border-slate-200/80 rounded-md font-mono text-xs hover:bg-slate-100 transition-colors"
                      >
                        {/* 5' nucleotide */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-6 text-right">{bp.pos5}</span>
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-bold border ${badgeBg}`}>
                            {bp.base5}
                          </span>
                        </div>

                        {/* Hydrogen bonds indicator */}
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <span className={bondColor}>{bondSymbol}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal">
                            ({bp.pairType})
                          </span>
                        </div>

                        {/* 3' nucleotide */}
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-bold border ${badgeBg}`}>
                            {bp.base3}
                          </span>
                          <span className="text-[10px] text-slate-400 w-6">{bp.pos3}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5' and 3' Flank Terminal labels */}
                <div className="flex items-center justify-between w-full max-w-sm px-4 pt-2 text-[10px] font-mono text-slate-400">
                  <span>5' End (Pos {activeCandidate.start})</span>
                  <span>3' End (Pos {activeCandidate.end})</span>
                </div>
              </div>
            </div>

            {/* Dot-Bracket & Subsequence Code Viewer */}
            <div className="space-y-1.5 font-mono text-xs">
              <span className="text-slate-500 font-semibold block text-[11px]">
                Aligned Secondary Structure String:
              </span>
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto space-y-1 select-all">
                <div className="text-slate-400 text-[10px] font-sans">Sequence:</div>
                <div className="tracking-widest font-bold">{activeCandidate.fullSequence}</div>
                <div className="text-slate-400 text-[10px] font-sans pt-1">Dot-Bracket:</div>
                <div className="tracking-widest text-teal-300 font-bold">{activeCandidate.dotBracket}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
