/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Multi-Sequence Alignment (MSA) Engine View
 * Center-Star Progressive Alignment & Visual Block Viewer for Plant Stress lncRNAs
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState, useMemo } from 'react';
import {
  AlignLeft,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  CheckSquare,
  Square,
  FileText,
  FileCode,
  Flame,
  Layers,
} from 'lucide-react';
import {
  performMultiSequenceAlignment,
  formatToClustalAln,
  formatToAlignedFasta,
  calculatePairwiseDistanceMatrix,
  type MsaInputSequence,
  type MsaResult,
} from '../utils/msaAlignment';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';

interface MultiSequenceAlignmentViewProps {
  initialSequences?: MsaInputSequence[];
}

export const MultiSequenceAlignmentView: React.FC<MultiSequenceAlignmentViewProps> = ({
  initialSequences,
}) => {
  // Candidate pool available for alignment
  const [selectedIds, setSelectedIds] = useState<string[]>([
    CURATED_LNCRNAS[0].id,
    CURATED_LNCRNAS[1].id,
    CURATED_LNCRNAS[2].id,
    CURATED_LNCRNAS[3].id,
  ]);

  // Custom user-added sequences
  const [customSequences, setCustomSequences] = useState<MsaInputSequence[]>([]);
  const [customName, setCustomName] = useState<string>('');
  const [customSeq, setCustomSeq] = useState<string>('');
  const [isCustomAdderOpen, setIsCustomAdderOpen] = useState<boolean>(false);

  // Visualization settings
  const [blockWidth, setBlockWidth] = useState<number>(60);
  const [colorMode, setColorMode] = useState<'nucleotide' | 'conservation'>('nucleotide');
  const [copiedAln, setCopiedAln] = useState<boolean>(false);
  const [copiedFasta, setCopiedFasta] = useState<boolean>(false);
  const [showDistanceMatrix, setShowDistanceMatrix] = useState<boolean>(false);

  // Combine curated database + custom sequences
  const allAvailableCandidates: MsaInputSequence[] = useMemo(() => {
    const curatedMapped: MsaInputSequence[] = CURATED_LNCRNAS.map((c) => ({
      id: c.id,
      name: c.name,
      sequence: c.sequence,
      species: c.species,
      category: `${c.diseaseName} (${c.pathogen})`,
    }));

    return [...curatedMapped, ...customSequences];
  }, [customSequences]);

  // Selected sequences to be aligned
  const activeInputSequences = useMemo(() => {
    return allAvailableCandidates.filter((cand) => selectedIds.includes(cand.id));
  }, [allAvailableCandidates, selectedIds]);

  // Multi-sequence alignment computation
  const msaResult: MsaResult | null = useMemo(() => {
    if (activeInputSequences.length < 2) return null;
    return performMultiSequenceAlignment(activeInputSequences);
  }, [activeInputSequences]);

  // Distance matrix computation
  const distanceMatrix = useMemo(() => {
    if (!showDistanceMatrix || activeInputSequences.length < 2) return null;
    return calculatePairwiseDistanceMatrix(activeInputSequences);
  }, [showDistanceMatrix, activeInputSequences]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurated = () => {
    setSelectedIds(allAvailableCandidates.map((c) => c.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleAddCustomSequence = () => {
    const clean = customSeq.toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
    if (!customName.trim() || clean.length < 10) return;

    const newSeq: MsaInputSequence = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      sequence: clean,
      species: 'User Submission',
      category: 'Custom Sequence',
    };

    setCustomSequences((prev) => [...prev, newSeq]);
    setSelectedIds((prev) => [...prev, newSeq.id]);
    setCustomName('');
    setCustomSeq('');
    setIsCustomAdderOpen(false);
  };

  // Color mapper helper
  const getNucleotideClass = (base: string, colConservation: number) => {
    if (base === '-') return 'bg-slate-100 text-slate-400';

    if (colorMode === 'conservation') {
      if (colConservation === 1.0) return 'bg-emerald-600 text-white font-bold';
      if (colConservation >= 0.75) return 'bg-emerald-200 text-emerald-950 font-semibold';
      if (colConservation >= 0.5) return 'bg-emerald-50 text-emerald-800';
      return 'bg-slate-50 text-slate-700';
    }

    switch (base) {
      case 'A':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'C':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'G':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'U':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Export handlers
  const handleDownloadClustal = () => {
    if (!msaResult) return;
    const aln = formatToClustalAln(msaResult, blockWidth);
    const blob = new Blob([aln], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lisha_alignment_${Date.now()}.aln`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAlignedFasta = () => {
    if (!msaResult) return;
    const fasta = formatToAlignedFasta(msaResult);
    const blob = new Blob([fasta], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lisha_aligned_sequences_${Date.now()}.fasta`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyClustal = () => {
    if (!msaResult) return;
    const aln = formatToClustalAln(msaResult, blockWidth);
    navigator.clipboard.writeText(aln);
    setCopiedAln(true);
    setTimeout(() => setCopiedAln(false), 2000);
  };

  // Pre-slice into blocks for multi-row rendering
  const blocks = useMemo(() => {
    if (!msaResult) return [];
    const blockList: { start: number; end: number }[] = [];
    for (let i = 0; i < msaResult.alignmentLength; i += blockWidth) {
      blockList.push({
        start: i,
        end: Math.min(msaResult.alignmentLength, i + blockWidth),
      });
    }
    return blockList;
  }, [msaResult, blockWidth]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                Comparative Genomics
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Multi-Sequence Alignment (MSA) & Block Visualizer
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Center-star progressive multiple sequence alignment with pairwise Needleman-Wunsch distance matrices,
              Clustal-compliant consensus formatting, and column conservation profiling across plant stress lncRNA candidates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomAdderOpen((o) => !o)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom lncRNA</span>
            </button>
            <button
              onClick={handleSelectAllCurated}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Custom Sequence Adder Modal / Expander */}
        {isCustomAdderOpen && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Add Sequence to Alignment Pool</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Sequence Name (e.g. Novel_Rice_lncRNA1)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
              <input
                type="text"
                placeholder="RNA or DNA Sequence (e.g. GGGAGCCUUGGC...)"
                value={customSeq}
                onChange={(e) => setCustomSeq(e.target.value)}
                className="text-xs font-mono p-2 rounded-lg border border-slate-300 bg-white sm:col-span-2"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCustomAdderOpen(false)}
                className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomSequence}
                disabled={!customName.trim() || customSeq.trim().length < 10}
                className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 text-white disabled:opacity-50"
              >
                Include in Alignment
              </button>
            </div>
          </div>
        )}

        {/* Candidate Selector Badges */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 mb-2 block">
            Select lncRNAs to Compare ({selectedIds.length} selected, minimum 2 required):
          </label>
          <div className="flex flex-wrap gap-2">
            {allAvailableCandidates.map((cand) => {
              const isSelected = selectedIds.includes(cand.id);
              return (
                <button
                  key={cand.id}
                  onClick={() => handleToggleSelect(cand.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{cand.name}</span>
                  {cand.species && (
                    <span className={`text-[10px] ml-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({cand.species})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {activeInputSequences.length < 2 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <AlignLeft className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">Please Select At Least 2 lncRNA Candidates</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Choose candidates from the curated ICAR-NIBSM stress collection above or add your own sequence to compute multi-sequence alignment and column conservation.
          </p>
        </div>
      ) : msaResult ? (
        <div className="space-y-6">
          {/* Alignment Analytics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alignment Length</span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">{msaResult.alignmentLength} bp</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{activeInputSequences.length} sequences aligned</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Mean Conservation</span>
              </span>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                {msaResult.meanConservationPercent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Average column similarity</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Identical Positions</span>
              </span>
              <div className="text-xl font-extrabold text-blue-700 mt-0.5">
                {msaResult.identicalColumnsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {msaResult.alignmentLength > 0
                  ? Math.round((msaResult.identicalColumnsCount / msaResult.alignmentLength) * 100)
                  : 0}
                % fully conserved (*)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gap Fraction</span>
              <div className="text-xl font-extrabold text-slate-800 mt-0.5">{msaResult.gapFractionTotal}%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Inserted insertion/deletion gaps</div>
            </div>
          </div>

          {/* Alignment Visualizer & Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Control Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              {/* Visual Tweaks */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold">Block Width:</span>
                  <select
                    value={blockWidth}
                    onChange={(e) => setBlockWidth(Number(e.target.value))}
                    className="text-xs py-1 px-2 rounded border border-slate-200 bg-white font-medium"
                  >
                    <option value={50}>50 nt</option>
                    <option value={60}>60 nt (Standard Clustal)</option>
                    <option value={80}>80 nt</option>
                    <option value={100}>100 nt</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold">Coloring:</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white p-0.5">
                    <button
                      onClick={() => setColorMode('nucleotide')}
                      className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                        colorMode === 'nucleotide' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Nucleotides
                    </button>
                    <button
                      onClick={() => setColorMode('conservation')}
                      className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                        colorMode === 'conservation' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Conservation
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowDistanceMatrix((s) => !s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                    showDistanceMatrix
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Pairwise Distance Matrix</span>
                </button>
              </div>

              {/* Exports */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadClustal}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download .aln (Clustal)</span>
                </button>
                <button
                  onClick={handleDownloadAlignedFasta}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aligned FASTA</span>
                </button>
                <button
                  onClick={handleCopyClustal}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Copy Clustal alignment text"
                >
                  {copiedAln ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Pairwise Distance Matrix Modal / Collapsible */}
            {showDistanceMatrix && distanceMatrix && (
              <div className="p-4 bg-amber-50/50 border-b border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pairwise Evolutionary Distance Matrix (Needleman-Wunsch 1 - Identity)</span>
                  </h4>
                  <button
                    onClick={() => setShowDistanceMatrix(false)}
                    className="text-xs text-amber-800 hover:underline"
                  >
                    Hide
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse font-mono">
                    <thead>
                      <tr>
                        <th className="p-2 border border-amber-200 bg-amber-100/60 text-slate-700"></th>
                        {activeInputSequences.map((s, idx) => (
                          <th key={s.id} className="p-2 border border-amber-200 bg-amber-100/60 text-slate-800 truncate max-w-[120px]">
                            {idx + 1}. {s.name.slice(0, 14)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {distanceMatrix.map((row, i) => (
                        <tr key={i}>
                          <td className="p-2 border border-amber-200 bg-amber-100/30 font-bold text-slate-800">
                            {i + 1}. {activeInputSequences[i].name.slice(0, 14)}
                          </td>
                          {row.map((val, j) => (
                            <td
                              key={j}
                              className={`p-2 border border-amber-200 text-center font-bold ${
                                i === j
                                  ? 'bg-slate-100 text-slate-400'
                                  : val < 0.3
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : val < 0.6
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              {val.toFixed(3)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Block Alignment Visualizer */}
            <div className="p-5 space-y-8 overflow-x-auto">
              {blocks.map((block, blockIdx) => (
                <div key={blockIdx} className="space-y-1 font-mono text-xs border-b border-slate-100 pb-5 last:border-b-0">
                  {/* Position Header Line */}
                  <div className="flex items-center text-[10px] text-slate-400 font-semibold mb-1">
                    <div className="w-48 shrink-0 text-slate-500 font-sans">
                      Position {block.start + 1} - {block.end}
                    </div>
                    <div className="flex items-center">
                      {Array.from({ length: block.end - block.start }).map((_, offset) => {
                        const pos = block.start + offset + 1;
                        return (
                          <div
                            key={offset}
                            className="w-5 text-center select-none"
                            style={{ fontSize: '8px' }}
                          >
                            {pos % 10 === 0 ? pos : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sequences in Block */}
                  {msaResult.alignedSequences.map((seq, sIdx) => {
                    const chunk = seq.alignedSeq.slice(block.start, block.end);
                    return (
                      <div key={seq.id} className="flex items-center hover:bg-slate-50 rounded py-0.5">
                        <div
                          className="w-48 shrink-0 font-sans text-xs font-semibold text-slate-800 truncate pr-3"
                          title={seq.name}
                        >
                          <span className="text-[10px] text-slate-400 font-mono mr-1.5">{sIdx + 1}.</span>
                          {seq.name}
                        </div>
                        <div className="flex items-center">
                          {chunk.split('').map((char, cIdx) => {
                            const globalCol = block.start + cIdx;
                            const colAnalysis = msaResult.columns[globalCol];
                            const colConservation = colAnalysis ? colAnalysis.conservationScore : 0;
                            return (
                              <div
                                key={cIdx}
                                className={`w-5 h-6 flex items-center justify-center text-[11px] font-bold rounded-xs mx-[0.5px] select-all ${getNucleotideClass(
                                  char,
                                  colConservation
                                )}`}
                                title={`Col ${globalCol + 1} | Base: ${char} | Conservation: ${colAnalysis?.conservationPercent || 0}%`}
                              >
                                {char}
                              </div>
                            );
                          })}
                        </div>
                        <div className="ml-3 text-[10px] text-slate-400 font-mono">{block.end}</div>
                      </div>
                    );
                  })}

                  {/* Consensus Sequence Line */}
                  <div className="flex items-center pt-1 border-t border-slate-100">
                    <div className="w-48 shrink-0 font-sans text-[11px] font-bold text-slate-700">
                      Consensus Sequence
                    </div>
                    <div className="flex items-center">
                      {msaResult.consensusSequence.slice(block.start, block.end).split('').map((char, cIdx) => (
                        <div
                          key={cIdx}
                          className="w-5 h-5 flex items-center justify-center text-[11px] font-extrabold text-blue-900 bg-blue-50/70 mx-[0.5px] rounded-xs select-all"
                        >
                          {char}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clustal Identity Line (*, :, .) */}
                  <div className="flex items-center">
                    <div className="w-48 shrink-0 font-sans text-[10px] text-slate-500 font-semibold">
                      Clustal Identity
                    </div>
                    <div className="flex items-center select-none font-bold text-slate-900">
                      {msaResult.identityLine.slice(block.start, block.end).split('').map((sym, cIdx) => (
                        <div
                          key={cIdx}
                          className={`w-5 text-center text-xs ${
                            sym === '*'
                              ? 'text-emerald-700 font-black'
                              : sym === ':'
                              ? 'text-blue-700'
                              : sym === '.'
                              ? 'text-slate-400'
                              : 'text-transparent'
                          }`}
                        >
                          {sym || ' '}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conservation Histogram Bars */}
                  <div className="flex items-center pt-0.5">
                    <div className="w-48 shrink-0 font-sans text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                      Conservation %
                    </div>
                    <div className="flex items-end h-4">
                      {Array.from({ length: block.end - block.start }).map((_, offset) => {
                        const globalCol = block.start + offset;
                        const colData = msaResult.columns[globalCol];
                        const pct = colData ? colData.conservationPercent : 0;
                        return (
                          <div
                            key={offset}
                            className="w-5 flex items-end justify-center h-full mx-[0.5px]"
                            title={`Position ${globalCol + 1}: ${pct}% conservation`}
                          >
                            <div
                              className={`w-3 rounded-t-xs transition-all ${
                                pct === 100
                                  ? 'bg-emerald-600'
                                  : pct >= 75
                                  ? 'bg-teal-500'
                                  : pct >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-slate-200'
                              }`}
                              style={{ height: `${Math.max(15, pct)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
