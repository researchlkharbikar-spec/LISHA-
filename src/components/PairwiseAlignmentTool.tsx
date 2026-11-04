/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Pairwise Sequence Alignment Tool Component
 * Performs Needleman-Wunsch global alignment between two user-provided lncRNA sequences,
 * computing dynamic programming scores, nucleotide identity percentage, gap frequencies,
 * and chunked residue visualization.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState, useMemo } from 'react';
import {
  AlignLeft,
  ArrowRight,
  ArrowLeftRight,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Save,
  Sliders,
  Info,
  CheckCircle2,
  AlertCircle,
  FileText,
  Dna,
  Layers,
  ChevronDown,
  ChevronUp,
  Table,
  Zap,
} from 'lucide-react';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';
import { validateLncRnaSequence, sanitizeToRnaSequence } from '../utils/sequenceValidator';
import {
  performNeedlemanWunschAlignment,
  formatPairwiseToFasta,
  formatPairwiseToTextReport,
  DEFAULT_ALIGNMENT_PARAMS,
  type PairwiseAlignmentResult,
  type AlignmentScoringParameters,
} from '../utils/pairwiseAlignment';

interface PairwiseAlignmentToolProps {
  onSaveAnalysis?: (record: {
    title: string;
    lncRnaName: string;
    lncRnaSequence: string;
    interactionType: string;
    targetName: string;
    score: number;
    summary: string;
  }) => void;
  onRequestGeminiInterpretation?: (prompt: string, title: string) => void;
  initialSeq1?: { name: string; sequence: string };
  initialSeq2?: { name: string; sequence: string };
}

export const PairwiseAlignmentTool: React.FC<PairwiseAlignmentToolProps> = ({
  onSaveAnalysis,
  onRequestGeminiInterpretation,
  initialSeq1,
  initialSeq2,
}) => {
  // Sequences state
  const [seq1Name, setSeq1Name] = useState(initialSeq1?.name || `${CURATED_LNCRNAS[0].name} (Oryza sativa)`);
  const [seq1Text, setSeq1Text] = useState(initialSeq1?.sequence || CURATED_LNCRNAS[0].sequence);

  const [seq2Name, setSeq2Name] = useState(initialSeq2?.name || `${CURATED_LNCRNAS[1].name} (Rice Blast Homolog)`);
  const [seq2Text, setSeq2Text] = useState(initialSeq2?.sequence || CURATED_LNCRNAS[1].sequence);

  // Scoring parameters state
  const [scoringParams, setScoringParams] = useState<AlignmentScoringParameters>(DEFAULT_ALIGNMENT_PARAMS);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  // View presentation state
  const [viewMode, setViewMode] = useState<'block' | 'raw' | 'matrix'>('block');
  const [chunkSize, setChunkSize] = useState<number>(60);
  const [copied, setCopied] = useState(false);
  const [isAligning, setIsAligning] = useState(false);

  // Validation
  const val1 = useMemo(() => validateLncRnaSequence(seq1Text), [seq1Text]);
  const val2 = useMemo(() => validateLncRnaSequence(seq2Text), [seq2Text]);

  // Dynamic Alignment Computation
  const alignmentResult: PairwiseAlignmentResult = useMemo(() => {
    return performNeedlemanWunschAlignment(
      val1.cleanedSequence,
      val2.cleanedSequence,
      seq1Name || 'Sequence 1',
      seq2Name || 'Sequence 2',
      scoringParams,
      chunkSize
    );
  }, [val1.cleanedSequence, val2.cleanedSequence, seq1Name, seq2Name, scoringParams, chunkSize]);

  // Quick Preset Loader
  const loadPresetPair = (index1: number, index2: number) => {
    const lnc1 = CURATED_LNCRNAS[index1];
    const lnc2 = CURATED_LNCRNAS[index2];
    if (lnc1 && lnc2) {
      setSeq1Name(`${lnc1.name} (${lnc1.speciesCommon})`);
      setSeq1Text(lnc1.sequence);
      setSeq2Name(`${lnc2.name} (${lnc2.speciesCommon})`);
      setSeq2Text(lnc2.sequence);
    }
  };

  // Swap sequences
  const handleSwapSequences = () => {
    const tempName = seq1Name;
    const tempText = seq1Text;
    setSeq1Name(seq2Name);
    setSeq1Text(seq2Text);
    setSeq2Name(tempName);
    setSeq2Text(tempText);
  };

  // Export functions
  const handleDownloadFasta = () => {
    const fasta = formatPairwiseToFasta(alignmentResult);
    const blob = new Blob([fasta], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_Needleman_Wunsch_${alignmentResult.seq1Name.replace(/\W+/g, '_')}_vs_${alignmentResult.seq2Name.replace(/\W+/g, '_')}.fasta`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTextReport = () => {
    const report = formatPairwiseToTextReport(alignmentResult);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_Needleman_Wunsch_Alignment_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAlignment = () => {
    const report = formatPairwiseToTextReport(alignmentResult);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color helper for nucleotide residues
  const getNucleotideColor = (char: string): string => {
    switch (char) {
      case 'A':
        return 'text-emerald-700 bg-emerald-50';
      case 'C':
        return 'text-blue-700 bg-blue-50';
      case 'G':
        return 'text-amber-700 bg-amber-50';
      case 'U':
      case 'T':
        return 'text-purple-700 bg-purple-50';
      case '-':
        return 'text-rose-600 bg-rose-50/50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getMatchCharColor = (char: string): string => {
    if (char === '|') return 'text-emerald-600 font-bold';
    if (char === ':') return 'text-amber-500 font-bold';
    if (char === '.') return 'text-slate-400';
    return 'text-rose-400';
  };

  // Badge color based on identity percent
  const getIdentityBadge = (percent: number) => {
    if (percent >= 70) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-200',
        bar: 'bg-emerald-500',
        label: 'High Sequence Identity',
      };
    }
    if (percent >= 50) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-300 ring-blue-200',
        bar: 'bg-blue-500',
        label: 'Moderate Homology',
      };
    }
    if (percent >= 35) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-200',
        bar: 'bg-amber-500',
        label: 'Partial / Weak Homology',
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-200',
      bar: 'bg-slate-400',
      label: 'Divergent Sequence',
    };
  };

  const identityBadge = getIdentityBadge(alignmentResult.identityPercent);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md">
                Algorithm: Needleman-Wunsch Global DP
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Pairwise lncRNA Global Sequence Alignment
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Computes end-to-end global dynamic programming sequence alignment between two plant lncRNAs to evaluate sequence identity percentage, gap frequency, and transition/transversion profiles.
            </p>
          </div>

          {/* Quick-Load Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1">Compare:</span>
            <button
              onClick={() => loadPresetPair(0, 1)}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Compare Rice ALEX1 vs Rice Blast lncRNA-Rsm1"
            >
              ALEX1 vs lncRNA-Rsm1
            </button>
            <button
              onClick={() => loadPresetPair(2, 5)}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Compare Arabidopsis ELENA1 vs Arabidopsis APOLO"
            >
              ELENA1 vs APOLO
            </button>
            <button
              onClick={() => loadPresetPair(3, 4)}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Compare Tomato lncRNA16397 vs Tomato lncRNA39026"
            >
              lncRNA16397 vs lncRNA39026
            </button>
          </div>
        </div>

        {/* Scoring Parameters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>DP Scoring Parameters:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                Match: <strong className="text-emerald-700">+{scoringParams.matchReward}</strong>
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                Mismatch: <strong className="text-rose-700">{scoringParams.mismatchPenalty}</strong>
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                Gap: <strong className="text-slate-700">{scoringParams.gapPenalty}</strong>
              </span>
            </div>
            <button
              onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAdvancedParams ? 'Hide Controls' : 'Adjust Scores'}</span>
              {showAdvancedParams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwapSequences}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Swap Query and Subject sequence inputs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Swap 1 &harr; 2</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Parameters */}
        {showAdvancedParams && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Match Reward
              </label>
              <input
                type="number"
                value={scoringParams.matchReward}
                onChange={(e) =>
                  setScoringParams((p) => ({ ...p, matchReward: Number(e.target.value) || 1 }))
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
              <span className="text-[10px] text-slate-500">Reward for identical bases</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Mismatch Penalty
              </label>
              <input
                type="number"
                value={scoringParams.mismatchPenalty}
                onChange={(e) =>
                  setScoringParams((p) => ({ ...p, mismatchPenalty: Number(e.target.value) || -1 }))
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
              <span className="text-[10px] text-slate-500">Penalty for non-matching bases</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Gap Penalty
              </label>
              <input
                type="number"
                value={scoringParams.gapPenalty}
                onChange={(e) =>
                  setScoringParams((p) => ({ ...p, gapPenalty: Number(e.target.value) || -2 }))
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
              />
              <span className="text-[10px] text-slate-500">Linear penalty per inserted gap</span>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setScoringParams(DEFAULT_ALIGNMENT_PARAMS)}
                className="px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset to Standard Defaults</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dual Sequence Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sequence 1 Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold flex items-center justify-center">
                1
              </span>
              <span>Sequence 1 (Query lncRNA)</span>
            </h3>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{val1.cleanedSequence.length} nt</span>
              <span>•</span>
              <span>GC: {alignmentResult.gc1}%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Sequence Identifier / Name
            </label>
            <input
              type="text"
              value={seq1Name}
              onChange={(e) => setSeq1Name(e.target.value)}
              placeholder="e.g. ALEX1 (Oryza sativa)"
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">
                FASTA / Nucleotide Sequence (5' &rarr; 3')
              </label>
              {/* Quick load from curated lncRNAs dropdown */}
              <select
                onChange={(e) => {
                  const item = CURATED_LNCRNAS.find((c) => c.id === e.target.value);
                  if (item) {
                    setSeq1Name(`${item.name} (${item.speciesCommon})`);
                    setSeq1Text(item.sequence);
                  }
                }}
                defaultValue=""
                className="text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-0.5 bg-slate-50 hover:bg-white"
              >
                <option value="" disabled>Load from Curated Database...</option>
                {CURATED_LNCRNAS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.speciesCommon} - {item.sequenceLength}nt)
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={4}
              value={seq1Text}
              onChange={(e) => setSeq1Text(e.target.value)}
              className={`w-full text-xs font-mono px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden uppercase leading-relaxed ${
                !val1.isValid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 focus:ring-1 focus:ring-blue-500'
              }`}
              placeholder="Paste RNA or DNA sequence (A, C, G, U/T)..."
            />

            {!val1.isValid && (
              <div className="flex items-center justify-between text-xs text-rose-800 bg-rose-50 border border-rose-300 p-2 rounded-lg mt-1.5">
                <span>Detected invalid characters in Sequence 1.</span>
                <button
                  type="button"
                  onClick={() => setSeq1Text(sanitizeToRnaSequence(seq1Text))}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold"
                >
                  Auto-Sanitize
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sequence 2 Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold flex items-center justify-center">
                2
              </span>
              <span>Sequence 2 (Subject / Candidate lncRNA)</span>
            </h3>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{val2.cleanedSequence.length} nt</span>
              <span>•</span>
              <span>GC: {alignmentResult.gc2}%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Sequence Identifier / Name
            </label>
            <input
              type="text"
              value={seq2Name}
              onChange={(e) => setSeq2Name(e.target.value)}
              placeholder="e.g. lncRNA-Rsm1 (Oryza sativa)"
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">
                FASTA / Nucleotide Sequence (5' &rarr; 3')
              </label>
              {/* Quick load from curated lncRNAs dropdown */}
              <select
                onChange={(e) => {
                  const item = CURATED_LNCRNAS.find((c) => c.id === e.target.value);
                  if (item) {
                    setSeq2Name(`${item.name} (${item.speciesCommon})`);
                    setSeq2Text(item.sequence);
                  }
                }}
                defaultValue=""
                className="text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-0.5 bg-slate-50 hover:bg-white"
              >
                <option value="" disabled>Load from Curated Database...</option>
                {CURATED_LNCRNAS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.speciesCommon} - {item.sequenceLength}nt)
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={4}
              value={seq2Text}
              onChange={(e) => setSeq2Text(e.target.value)}
              className={`w-full text-xs font-mono px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden uppercase leading-relaxed ${
                !val2.isValid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 focus:ring-1 focus:ring-emerald-500'
              }`}
              placeholder="Paste RNA or DNA sequence (A, C, G, U/T)..."
            />

            {!val2.isValid && (
              <div className="flex items-center justify-between text-xs text-rose-800 bg-rose-50 border border-rose-300 p-2 rounded-lg mt-1.5">
                <span>Detected invalid characters in Sequence 2.</span>
                <button
                  type="button"
                  onClick={() => setSeq2Text(sanitizeToRnaSequence(seq2Text))}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold"
                >
                  Auto-Sanitize
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Results Display: Sequence Identity & Global Alignment Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {/* Top Result Hero: Identity Score % */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl text-white">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[11px] font-mono font-semibold rounded border border-indigo-400/30">
                Needleman-Wunsch Global Alignment
              </span>
              <span className="text-xs text-slate-300">
                {alignmentResult.len1} nt vs {alignmentResult.len2} nt
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Pairwise Sequence Identity Score
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              {alignmentResult.homologyDescription}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15">
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Sequence Identity
              </div>
              <div className="text-4xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {alignmentResult.identityPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-300 font-mono">
                {alignmentResult.matchesCount} / {alignmentResult.alignmentLength} matches
              </div>
            </div>

            <div className="w-14 h-14 rounded-full border-4 border-emerald-500/30 flex items-center justify-center p-1 relative">
              <div
                className="w-full h-full rounded-full border-4 border-emerald-400 flex items-center justify-center"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% ${alignmentResult.identityPercent}%, 0 ${alignmentResult.identityPercent}%)`,
                }}
              />
              <Zap className="w-5 h-5 text-emerald-300 absolute" />
            </div>
          </div>
        </div>

        {/* Detailed Metrics Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Identity Score</div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
              {alignmentResult.identityPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {alignmentResult.matchesCount} identical
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Similarity Score</div>
            <div className="text-xl font-extrabold text-blue-700 font-mono mt-0.5">
              {alignmentResult.similarityPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Transitions included</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Alignment Score</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
              {alignmentResult.score}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">DP Matrix Max</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Aligned Length</div>
            <div className="text-xl font-extrabold text-indigo-700 font-mono mt-0.5">
              {alignmentResult.alignmentLength}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Columns with gaps</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Gap Frequency</div>
            <div className="text-xl font-extrabold text-amber-700 font-mono mt-0.5">
              {alignmentResult.gapPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {alignmentResult.gapsCount} gaps
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Mismatches</div>
            <div className="text-xl font-extrabold text-rose-700 font-mono mt-0.5">
              {alignmentResult.mismatchesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Substitutions</div>
          </div>
        </div>

        {/* View Mode Switcher and Export Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('block')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'block' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Block Traceback View ({chunkSize} nt/block)</span>
            </button>

            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'raw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Full Monospace Text</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-indigo-600" />
              <span>DP Matrix Traceback Slice</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAlignment}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadFasta}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download FASTA aligned sequence file"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export FASTA</span>
            </button>

            <button
              onClick={handleDownloadTextReport}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download detailed alignment text report"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Text Report</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Color-Coded Chunked Block View */}
        {viewMode === 'block' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-medium">
                Alignment Display: 5' to 3' across {alignmentResult.blocks.length} blocks
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> A (Adenine)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> C (Cytosine)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> G (Guanine)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> U (Uracil)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Gap (-)
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto p-3 bg-slate-900 rounded-xl font-mono text-xs">
              {alignmentResult.blocks.map((block) => (
                <div key={block.blockIndex} className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                  {/* Sequence 1 Row */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[10px] text-slate-400 truncate shrink-0">
                      Seq1 [{block.start1}..{block.end1}]
                    </span>
                    <div className="flex flex-wrap tracking-widest text-sm">
                      {block.seq1Chunk.split('').map((ch, idx) => (
                        <span key={idx} className={`inline-block px-0.5 rounded ${getNucleotideColor(ch)} font-bold`}>
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Match Line Row */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[10px] text-slate-600 shrink-0">
                      Match:
                    </span>
                    <div className="flex flex-wrap tracking-widest text-sm select-none">
                      {block.matchChunk.split('').map((ch, idx) => (
                        <span key={idx} className={`inline-block px-0.5 ${getMatchCharColor(ch)}`}>
                          {ch === ' ' ? '\u00A0' : ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sequence 2 Row */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[10px] text-slate-400 truncate shrink-0">
                      Seq2 [{block.start2}..{block.end2}]
                    </span>
                    <div className="flex flex-wrap tracking-widest text-sm">
                      {block.seq2Chunk.split('').map((ch, idx) => (
                        <span key={idx} className={`inline-block px-0.5 rounded ${getNucleotideColor(ch)} font-bold`}>
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Mode 2: Raw Monospace Text View */}
        {viewMode === 'raw' && (
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed space-y-2">
            <div className="text-slate-400">// Needleman-Wunsch Global Alignment Traceback</div>
            <div className="text-slate-400">// Sequence 1: {alignmentResult.seq1Name} ({alignmentResult.len1} nt)</div>
            <div className="text-slate-400">// Sequence 2: {alignmentResult.seq2Name} ({alignmentResult.len2} nt)</div>
            <div className="text-emerald-400">// Identity Score: {alignmentResult.identityPercent}% ({alignmentResult.matchesCount}/{alignmentResult.alignmentLength} matches)</div>
            <div className="pt-2 text-slate-300 break-all leading-loose">
              <div>Seq1:  {alignmentResult.alignedSeq1}</div>
              <div className="text-emerald-400">Match: {alignmentResult.matchLine}</div>
              <div className="text-blue-300">Seq2:  {alignmentResult.alignedSeq2}</div>
            </div>
          </div>
        )}

        {/* View Mode 3: DP Matrix Traceback Preview */}
        {viewMode === 'matrix' && alignmentResult.matrixPreview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">
                Dynamic Programming Grid Slice (First {alignmentResult.matrixPreview.matrix.length} &times; {alignmentResult.matrixPreview.matrix[0].length} Cells)
              </span>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Optimal Traceback Cell Path
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
              <table className="text-center font-mono text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 text-slate-400"></th>
                    {alignmentResult.matrixPreview.seq2Chars.map((ch, j) => (
                      <th key={j} className="p-1.5 font-bold text-slate-700 bg-slate-100 border border-slate-200">
                        {ch}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alignmentResult.matrixPreview.matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="p-1.5 font-bold text-slate-700 bg-slate-100 border border-slate-200">
                        {alignmentResult.matrixPreview?.seq1Chars[i]}
                      </td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`p-1.5 border border-slate-200 ${
                            cell.isTracebackPath
                              ? 'bg-emerald-100 text-emerald-900 font-bold ring-1 ring-emerald-400'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cell.score}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">
              Cells highlighted in emerald represent the optimal traceback path computed by the Needleman-Wunsch algorithm from cell (M, N) back to (0, 0).
            </p>
          </div>
        )}

        {/* Action Row: Save to Workspace & Gemini Interpretation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={() =>
              onSaveAnalysis?.({
                title: `Needleman-Wunsch: ${alignmentResult.seq1Name} x ${alignmentResult.seq2Name}`,
                lncRnaName: alignmentResult.seq1Name,
                lncRnaSequence: val1.cleanedSequence,
                interactionType: 'Pairwise Alignment (Needleman-Wunsch)',
                targetName: alignmentResult.seq2Name,
                score: alignmentResult.identityPercent,
                summary: `Needleman-Wunsch Global Alignment Identity: ${alignmentResult.identityPercent}%, Score: ${alignmentResult.score}, Similarity: ${alignmentResult.similarityPercent}%, Gaps: ${alignmentResult.gapsCount}/${alignmentResult.alignmentLength} (${alignmentResult.gapPercent}%).`,
              })
            }
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-blue-600" />
            <span>Save Alignment to Workspace</span>
          </button>

          <button
            onClick={() =>
              onRequestGeminiInterpretation?.(
                `Provide a deep comparative biological analysis of the Needleman-Wunsch global pairwise alignment between plant lncRNAs "${alignmentResult.seq1Name}" (${alignmentResult.len1} nt) and "${alignmentResult.seq2Name}" (${alignmentResult.len2} nt).\n\nAlignment Metrics:\n- Identity Score: ${alignmentResult.identityPercent}%\n- Similarity: ${alignmentResult.similarityPercent}%\n- Alignment Score: ${alignmentResult.score}\n- Gaps: ${alignmentResult.gapsCount} (${alignmentResult.gapPercent}%)\n- Homology Class: ${alignmentResult.homologyCategory}\n\nExplain the biological significance of this sequence identity score in plant defense responses, whether conserved stems, loops, or cis-elements are indicated, and how this relates to pathogen resistance against fungal/bacterial invaders.`,
                `Pairwise Homology: ${alignmentResult.seq1Name} vs ${alignmentResult.seq2Name}`
              )
            }
            className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Gemini Pairwise Homology Interpretation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
