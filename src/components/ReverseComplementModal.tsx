/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Reverse Complement & Antisense Interaction Utility Modal
 * Interactive tool for generating, inspecting, and applying reverse complement lncRNA sequences.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  Copy,
  Check,
  FileDown,
  Play,
  RotateCcw,
  Dna,
  ShieldAlert,
  Flame,
  Layers,
  Thermometer,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  analyzeReverseComplement,
  formatReverseComplementFasta,
  type ReverseComplementAnalysis,
} from '../utils/reverseComplement';

interface ReverseComplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSequence: string;
  lncRnaName: string;
  onApplyReverseComplement: (revCompSeq: string, newName: string) => void;
  onOpenInPairwiseAlignment?: (seq1: { name: string; sequence: string }, seq2: { name: string; sequence: string }) => void;
}

export const ReverseComplementModal: React.FC<ReverseComplementModalProps> = ({
  isOpen,
  onClose,
  originalSequence,
  lncRnaName,
  onApplyReverseComplement,
  onOpenInPairwiseAlignment,
}) => {
  const [isRnaMode, setIsRnaMode] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'revcomp' | 'duplex' | 'comparison' | 'biology'>('revcomp');

  const analysis: ReverseComplementAnalysis = useMemo(() => {
    return analyzeReverseComplement(originalSequence, isRnaMode);
  }, [originalSequence, isRnaMode]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFasta = () => {
    const fastaContent = formatReverseComplementFasta(
      lncRnaName || 'lncRNA',
      analysis.reverseComplement,
      analysis.length,
      isRnaMode
    );
    const blob = new Blob([fastaContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (lncRnaName || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_RevComp_${isRnaMode ? 'RNA' : 'DNA'}.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    const antisenseName = lncRnaName.includes('(Antisense')
      ? lncRnaName.replace(/\s*\(Antisense[^)]*\)/g, '')
      : `${lncRnaName} (Antisense / RevComp)`;
    onApplyReverseComplement(analysis.reverseComplement, antisenseName);
    onClose();
  };

  const handleLaunchPairwise = () => {
    if (onOpenInPairwiseAlignment) {
      onOpenInPairwiseAlignment(
        { name: `${lncRnaName} (Sense 5'->3')`, sequence: analysis.originalSequence },
        { name: `${lncRnaName} (RevComp 5'->3')`, sequence: analysis.reverseComplement }
      );
      onClose();
    }
  };

  // Slice preview for long sequences
  const previewSlice = (seq: string, max = 300) => {
    if (!seq) return '';
    if (seq.length <= max) return seq;
    return `${seq.slice(0, max)}... [${seq.length - max} more nt]`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Reverse Complement & Antisense Interaction Utility
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wide">
                  Watson-Crick Canonical
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Generate inverted antisense strand (5' &rarr; 3') for natural antisense transcript (NAT) modeling and duplex hybridization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar: RNA/DNA toggle & Quick Stats */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Target Nucleotide Chemistry:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-200/70">
              <button
                type="button"
                onClick={() => setIsRnaMode(true)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  isRnaMode
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                RNA (Uracil 'U')
              </button>
              <button
                type="button"
                onClick={() => setIsRnaMode(false)}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  !isRnaMode
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DNA (Thymine 'T')
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-900 font-bold">
              Length: {analysis.length} nt
            </span>
            <span>GC: {analysis.revCompGcPercent}%</span>
            <span>AU/AT: {analysis.revCompAuPercent}%</span>
            <span className="text-emerald-700 font-semibold">Duplex Tm: {analysis.estimatedDuplexTm}°C</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('revcomp')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'revcomp'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Antisense (5' &rarr; 3' Rev-Comp)
          </button>
          <button
            onClick={() => setActiveTab('duplex')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'duplex'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sense-Antisense Duplex Pairing
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'comparison'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All 4 In Silico Strands
          </button>
          <button
            onClick={() => setActiveTab('biology')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'biology'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Biological Modeling Context (cis-NATs)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {/* Tab 1: Primary Reverse Complement */}
          {activeTab === 'revcomp' && (
            <div className="space-y-4">
              {/* Hero Output Card */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Canonical Reverse Complement (5' &rarr; 3' Antisense Strand)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(analysis.reverseComplement, 'revcomp')}
                      className="px-2.5 py-1 bg-white border border-indigo-300 hover:bg-indigo-50 rounded-md text-xs font-semibold text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedKey === 'revcomp' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Sequence</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadFasta}
                      className="px-2.5 py-1 bg-white border border-indigo-300 hover:bg-indigo-50 rounded-md text-xs font-semibold text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>FASTA</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white border border-indigo-200/80 rounded-lg font-mono text-xs text-indigo-950 break-all leading-relaxed max-h-48 overflow-y-auto select-all">
                  {analysis.reverseComplement || <span className="text-slate-400">Sequence is empty</span>}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-indigo-900/80 pt-1 border-t border-indigo-200/60">
                  <div className="flex items-center gap-3">
                    <span>
                      Original: <strong className="font-mono text-slate-800">5'-{analysis.originalSequence.slice(0, 8)}...-3'</strong>
                    </span>
                    <span>&rarr;</span>
                    <span>
                      Rev-Comp: <strong className="font-mono text-indigo-800">5'-{analysis.reverseComplement.slice(0, 8)}...-3'</strong>
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono">
                    A&harr;{isRnaMode ? 'U' : 'T'} • C&harr;G • 5' &rarr; 3' Inverted
                  </div>
                </div>
              </div>

              {/* Biophysical Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duplex Melting Temp (Tm)</div>
                  <div className="text-lg font-extrabold text-indigo-900 mt-1 flex items-center gap-1.5 font-mono">
                    <Thermometer className="w-4 h-4 text-indigo-600" />
                    <span>{analysis.estimatedDuplexTm}°C</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Nearest-neighbor RNA:RNA</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hybridization Free Energy (ΔG°)</div>
                  <div className="text-lg font-extrabold text-emerald-800 mt-1 flex items-center gap-1.5 font-mono">
                    <Flame className="w-4 h-4 text-emerald-600" />
                    <span>{analysis.estimatedDuplexMfeKcal} kcal/mol</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Estimated duplex stability</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GC Composition</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1 font-mono">
                    {analysis.revCompGcPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Original GC: {analysis.originalGcPercent}% (Invariant)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Self-Complementarity</div>
                  <div className="text-lg font-extrabold text-purple-900 mt-1 font-mono">
                    {analysis.selfComplementarityScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Inverted repeat / hairpin bias</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Sense-Antisense Duplex Pairing */}
          {activeTab === 'duplex' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Dna className="w-4 h-4 text-indigo-600" />
                    <span>In Silico Sense-Antisense Duplex Hybridization</span>
                  </h4>
                  <div className="text-xs font-mono text-slate-600">
                    Pairing: <strong className="text-emerald-700">{analysis.duplexAlignment.pairingPercentage}%</strong> (
                    {analysis.duplexAlignment.wcPairs} Watson-Crick bp)
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Shows antiparallel base pairing between the query sense lncRNA (5' &rarr; 3') and its complementary antisense strand (3' &larr; 5').
                  This models direct RNA:RNA duplex pairing or RNA:DNA promoter hybridization.
                </p>

                {/* Duplex Monospace Block */}
                <div className="p-4 bg-slate-950 rounded-xl font-mono text-xs overflow-x-auto text-slate-200 space-y-1.5 leading-none shadow-inner">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="w-24 text-right shrink-0">Sense (5' &rarr; 3'):</span>
                    <span className="text-emerald-400 font-bold tracking-widest">
                      {previewSlice(analysis.duplexAlignment.sense5to3, 160)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span className="w-24 text-right shrink-0">Bonding:</span>
                    <span className="text-indigo-400 tracking-widest font-extrabold">
                      {previewSlice(analysis.duplexAlignment.matchLine, 160)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="w-24 text-right shrink-0">Antisense (3' &larr; 5'):</span>
                    <span className="text-blue-400 font-bold tracking-widest">
                      {previewSlice(analysis.duplexAlignment.antisense3to5, 160)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-indigo-600 font-bold">|</span>
                    <span>Watson-Crick Canonical Pair (A:U, G:C)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-amber-600 font-bold">:</span>
                    <span>Wobble Base Pair (G:U)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-400 font-bold">·</span>
                    <span>Mismatch / Non-complementary</span>
                  </div>
                </div>
              </div>

              {/* Pairwise Alignment Callout */}
              {onOpenInPairwiseAlignment && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <strong className="text-indigo-950">Deep Needleman-Wunsch Alignment Analysis</strong>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        Perform a formal global alignment between this Sense strand and its Reverse Complement to detect inverted repeats, palindromes, and hairpin structures.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLaunchPairwise}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Launch Pairwise Alignment</span>
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: All 4 Strands Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                In molecular biology and bioinformatics, reverse complementation operates across 4 canonical strand configurations:
              </p>

              <div className="space-y-2.5">
                {/* 1. Reverse Complement */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[10px]">1</span>
                      Reverse Complement (5' &rarr; 3') [Canonical Biological Antisense]
                    </span>
                    <button
                      onClick={() => handleCopy(analysis.reverseComplement, 'c1')}
                      className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copiedKey === 'c1' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'c1' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-200 font-mono text-xs text-indigo-950 break-all select-all">
                    {previewSlice(analysis.reverseComplement, 200)}
                  </div>
                </div>

                {/* 2. Direct Complement */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-slate-600 text-white rounded text-[10px]">2</span>
                      Direct Complement (3' &larr; 5' Antiparallel Strand)
                    </span>
                    <button
                      onClick={() => handleCopy(analysis.directComplement, 'c2')}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copiedKey === 'c2' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'c2' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900 break-all select-all">
                    {previewSlice(analysis.directComplement, 200)}
                  </div>
                </div>

                {/* 3. Reverse Only */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-slate-600 text-white rounded text-[10px]">3</span>
                      Reverse Only (5' &rarr; 3' Inverted Nucleotide Order)
                    </span>
                    <button
                      onClick={() => handleCopy(analysis.reverseOnly, 'c3')}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copiedKey === 'c3' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'c3' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900 break-all select-all">
                    {previewSlice(analysis.reverseOnly, 200)}
                  </div>
                </div>

                {/* 4. Original Sense */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px]">4</span>
                      Original Query Sense Strand (5' &rarr; 3')
                    </span>
                    <button
                      onClick={() => handleCopy(analysis.originalSequence, 'c4')}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copiedKey === 'c4' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'c4' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900 break-all select-all">
                    {previewSlice(analysis.originalSequence, 200)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Biological Modeling Context */}
          {activeTab === 'biology' && (
            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-bold text-blue-950 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Plant Natural Antisense Transcripts (cis-NATs & trans-NATs)</span>
                </h4>
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  In plant immune defense and stress biology (e.g. *Oryza sativa*, *Arabidopsis thaliana*), thousands of regulatory long non-coding RNAs originate from the opposite strand of protein-coding loci.
                  Notable examples include <strong>COOLAIR</strong> (antisense to *FLC*), <strong>cis-NATPHO1;2</strong> (mediating phosphate homeostasis), and bacterial blight/blast-responsive antisense transcripts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>DNA Triplex & Promoter Targeting</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Plant defense lncRNAs like <em>ELENA1</em> interact with genomic DNA duplexes via Hoogsteen or reverse Hoogsteen hydrogen bonds. Testing the reverse complement sequence verifies whether triplex-forming oligonucleotides (TFOs) specifically engage the purine-rich or pyrimidine-rich strand of target defense promoters (e.g. <em>AtPR1</em>).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>miRNA ceRNA Sponging Asymmetry</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sponging efficiency and seed accessibility depend strictly on 5' &rarr; 3' orientation. Inverting to the reverse complement allows researchers to confirm that detected miRNA seed matches (e.g., *osa-miR166*, *miR398*) are orientation-specific biological interactions rather than non-specific GC artifacts.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-100/80 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Lead Investigator: <strong>Prof. Lalit Laxman Kharbikar</strong>, Principal Scientist, ICAR-NIBSM, Raipur, India. LISHA In Silico Core.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Primary Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadFasta}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>Download FASTA</span>
            </button>
            {onOpenInPairwiseAlignment && (
              <button
                type="button"
                onClick={handleLaunchPairwise}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>Align Sense vs Antisense</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Reverse Complement to Screening Engine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
