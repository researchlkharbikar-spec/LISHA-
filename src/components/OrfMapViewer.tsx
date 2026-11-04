/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Open Reading Frame (ORF) Color-Coded Sequence Map Viewer
 * Interactive visualization component mapping potential ORFs across forward reading frames (+1, +2, +3),
 * featuring codon-level translation, Kozak initiation context, and plant lncRNA coding potential diagnostics.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Dna,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Copy,
  Check,
  FileDown,
  Filter,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  ExternalLink,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  findOpenReadingFrames,
  formatOrfsToFasta,
  FRAME_COLORS,
  type OpenReadingFrame,
  type ReadingFrame,
  type OrfAnalysisResult,
} from '../utils/orfFinder';

interface OrfMapViewerProps {
  sequence: string;
  name?: string;
  onExportFasta?: () => void;
}

export const OrfMapViewer: React.FC<OrfMapViewerProps> = ({
  sequence,
  name = 'Query lncRNA',
  onExportFasta,
}) => {
  const [minAaLength, setMinAaLength] = useState<number>(15);
  const [selectedFrame, setSelectedFrame] = useState<string>('all');
  const [selectedOrfId, setSelectedOrfId] = useState<string | null>(null);
  const [hoveredOrfId, setHoveredOrfId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'track-map' | 'codon-sequence' | 'both'>('both');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGUTacgut]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  // Execute ORF detection
  const analysisResult: OrfAnalysisResult = useMemo(() => {
    return findOpenReadingFrames(cleanSeq, { minAaLength });
  }, [cleanSeq, minAaLength]);

  const allOrfs = analysisResult.orfs;

  // Filter ORFs based on frame and search query
  const filteredOrfs = useMemo(() => {
    return allOrfs.filter((orf) => {
      const matchesFrame = selectedFrame === 'all' || orf.frame === selectedFrame;
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        orf.peptideSequence.toLowerCase().includes(q) ||
        orf.nucleotideSequence.toLowerCase().includes(q) ||
        orf.frame.toLowerCase().includes(q) ||
        orf.classification.toLowerCase().includes(q) ||
        `nt ${orf.start}-${orf.end}`.includes(q);

      return matchesFrame && matchesSearch;
    });
  }, [allOrfs, selectedFrame, searchFilter]);

  // Selected ORF
  const activeOrf = useMemo(() => {
    if (!selectedOrfId) return allOrfs[0] || null;
    return allOrfs.find((o) => o.id === selectedOrfId) || allOrfs[0] || null;
  }, [selectedOrfId, allOrfs]);

  // Hovered ORF
  const activeHoverOrf = useMemo(() => {
    if (!hoveredOrfId) return null;
    return allOrfs.find((o) => o.id === hoveredOrfId) || null;
  }, [hoveredOrfId, allOrfs]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPeptideFasta = () => {
    const fasta = formatOrfsToFasta(filteredOrfs, name, true);
    const blob = new Blob([fasta], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (name || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_Translated_ORFs_Peptide.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const header = 'ORF_ID,Frame,Start_nt,End_nt,Length_nt,Length_aa,Start_Codon,Stop_Codon,Kozak_Score_Pct,Peptide_Sequence,Classification';
    const rows = filteredOrfs.map(
      (o) =>
        `"${o.id}","${o.frame}",${o.start},${o.end},${o.ntLength},${o.aaLength},"${o.startCodon}","${o.stopCodon}",${o.kozakScorePercent},"${o.peptideSequence}","${o.classification}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (name || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_ORFs_Inventory.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Base highlight map (1-indexed base -> Set of frame strings)
  const baseOrfMembership = useMemo(() => {
    const map = new Map<number, { frames: ReadingFrame[]; orfs: OpenReadingFrame[] }>();
    for (const orf of filteredOrfs) {
      for (let p = orf.start; p <= orf.end; p++) {
        const item = map.get(p) || { frames: [], orfs: [] };
        if (!item.frames.includes(orf.frame)) {
          item.frames.push(orf.frame);
        }
        item.orfs.push(orf);
        map.set(p, item);
      }
    }
    return map;
  }, [filteredOrfs]);

  const seqLen = Math.max(1, cleanSeq.length);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              Coding Potential Map
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Open Reading Frame (ORF) Sequence Map</span>
            </h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-full">
              {allOrfs.length} ORFs Found
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-coded reading frame mapping across forward frames (+1, +2, +3), identifying canonical initiation (AUG), stop codons, and plant micropeptide (sORF) candidates.
          </p>
        </div>

        {/* View Mode Switcher and Export Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('track-map')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'track-map' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tracks Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('codon-sequence')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'codon-sequence' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Codon Sequence
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'both' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split View
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPeptideFasta}
            disabled={filteredOrfs.length === 0}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Download identified ORFs as translated peptide FASTA"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>Peptide FASTA</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={filteredOrfs.length === 0}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Export ORF inventory table as CSV"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Coding Potential & Micropeptide Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Longest Potential ORF</div>
          <div className="text-xl font-extrabold text-slate-900 font-mono flex items-center gap-1.5">
            <span>{analysisResult.longestAaLength} aa</span>
            <span className="text-xs text-slate-500 font-sans font-normal">
              ({analysisResult.longestOrf ? analysisResult.longestOrf.ntLength : 0} nt)
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Cutoff for bona fide lncRNA: &lt; 100 aa (300 nt)
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Classification</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {analysisResult.bonaFideNonCoding ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-extrabold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bona Fide Non-Coding</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Dual / Long ORF (&ge;100 aa)</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-600 truncate" title={analysisResult.codingPotentialAssessment}>
            {analysisResult.codingPotentialAssessment}
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Frame Distribution</div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold mt-1">
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded border border-indigo-200">
              +1: {analysisResult.frameCounts['+1']}
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
              +2: {analysisResult.frameCounts['+2']}
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-200">
              +3: {analysisResult.frameCounts['+3']}
            </span>
          </div>
          <div className="text-[10px] text-slate-500">Forward reading frames</div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Micropeptides (sORFs)</div>
          <div className="text-xl font-extrabold text-indigo-900 font-mono">
            {allOrfs.filter((o) => o.aaLength >= 30 && o.aaLength < 100).length}
          </div>
          <div className="text-[10px] text-slate-500">
            Putative 30–99 aa signaling peptides
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Reading Frame:</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
            <button
              type="button"
              onClick={() => setSelectedFrame('all')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                selectedFrame === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allOrfs.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFrame('+1')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                selectedFrame === '+1' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              +1 ({analysisResult.frameCounts['+1']})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFrame('+2')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                selectedFrame === '+2' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              +2 ({analysisResult.frameCounts['+2']})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFrame('+3')}
              className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                selectedFrame === '+3' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              +3 ({analysisResult.frameCounts['+3']})
            </button>
          </div>
        </div>

        {/* Min Length Slider */}
        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-semibold">Min ORF Length:</span>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={minAaLength}
            onChange={(e) => setMinAaLength(Number(e.target.value))}
            className="w-24 accent-indigo-600 cursor-pointer"
          />
          <span className="font-mono font-bold text-indigo-700 min-w-10">
            &ge; {minAaLength} aa ({minAaLength * 3} nt)
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by peptide or coordinates..."
            className="text-xs pl-8 pr-3 py-1 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-48"
          />
        </div>
      </div>

      {/* Part 1: Color-Coded Multi-Track Sequence Map Canvas */}
      {(viewMode === 'track-map' || viewMode === 'both') && (
        <div className="bg-slate-950 rounded-xl p-4 text-slate-100 shadow-inner space-y-3">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
            <span className="font-mono text-slate-400 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Track Reading Frame Architecture (5' &rarr; 3')</span>
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>AUG Start</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span>UAA/UAG/UGA Stop</span>
              </span>
              <span className="text-slate-500">Length: {seqLen} nt</span>
            </div>
          </div>

          {/* Coordinate Axis Ruler */}
          <div className="relative w-full h-5 border-b border-slate-800 font-mono text-[10px] text-slate-400 select-none">
            <div className="absolute left-0 top-0">1 nt</div>
            <div className="absolute left-1/4 -translate-x-1/2 top-0 hidden sm:block">
              {Math.round(seqLen * 0.25)} nt
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0">
              {Math.round(seqLen * 0.5)} nt
            </div>
            <div className="absolute left-3/4 -translate-x-1/2 top-0 hidden sm:block">
              {Math.round(seqLen * 0.75)} nt
            </div>
            <div className="absolute right-0 top-0">{seqLen} nt</div>
          </div>

          {/* 3 Reading Frame Tracks (+1, +2, +3) */}
          <div className="space-y-3 pt-1">
            {(['+1', '+2', '+3'] as ReadingFrame[]).map((frame) => {
              const frameOrfs = filteredOrfs.filter((o) => o.frame === frame);
              const isSelectedFrame = selectedFrame === 'all' || selectedFrame === frame;

              return (
                <div
                  key={frame}
                  className={`space-y-1 transition-opacity ${isSelectedFrame ? 'opacity-100' : 'opacity-40'}`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold" style={{ color: FRAME_COLORS[frame].track }}>
                      Frame {frame} ({frameOrfs.length} ORFs)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Offset: {frame === '+1' ? '0 nt' : frame === '+2' ? '1 nt' : '2 nt'}
                    </span>
                  </div>

                  {/* Track Bar */}
                  <div className="relative w-full h-8 bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                      <div className="w-px h-full bg-slate-400"></div>
                      <div className="w-px h-full bg-slate-400"></div>
                      <div className="w-px h-full bg-slate-400"></div>
                      <div className="w-px h-full bg-slate-400"></div>
                    </div>

                    {/* ORFs in this frame */}
                    {frameOrfs.map((orf) => {
                      const leftPct = (orf.start / seqLen) * 100;
                      const widthPct = Math.max(0.8, (orf.ntLength / seqLen) * 100);
                      const isSelected = selectedOrfId === orf.id;
                      const isHovered = hoveredOrfId === orf.id;

                      return (
                        <div
                          key={orf.id}
                          onClick={() => setSelectedOrfId(orf.id)}
                          onMouseEnter={() => setHoveredOrfId(orf.id)}
                          onMouseLeave={() => setHoveredOrfId(null)}
                          className={`absolute top-1 bottom-1 rounded-md transition-all cursor-pointer flex items-center justify-between px-1 group shadow-xs ${
                            isSelected
                              ? 'ring-2 ring-white z-20 brightness-125'
                              : isHovered
                              ? 'ring-1 ring-white/80 z-10 brightness-110'
                              : 'hover:brightness-110'
                          }`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: FRAME_COLORS[frame].track,
                          }}
                          title={`Frame ${orf.frame}: nt ${orf.start}–${orf.end} (${orf.aaLength} aa / ${orf.ntLength} nt) - ${orf.classification}`}
                        >
                          {/* Green Start pip */}
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0"></div>

                          {/* Length text if wide enough */}
                          {widthPct > 5 && (
                            <span className="text-[9px] font-mono font-extrabold text-white truncate px-0.5">
                              {orf.aaLength} aa
                            </span>
                          )}

                          {/* Red Stop pip */}
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Hover / Selection Indicator in Canvas */}
          {(activeHoverOrf || activeOrf) && (
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: (activeHoverOrf || activeOrf)!.color.track }}
                >
                  {(activeHoverOrf || activeOrf)!.frame}
                </span>
                <span className="font-bold text-white">
                  nt {(activeHoverOrf || activeOrf)!.start}–{(activeHoverOrf || activeOrf)!.end}
                </span>
                <span>•</span>
                <span>{(activeHoverOrf || activeOrf)!.aaLength} aa ({(activeHoverOrf || activeOrf)!.ntLength} nt)</span>
                <span>•</span>
                <span className="text-emerald-400">{(activeHoverOrf || activeOrf)!.classification}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Peptide: <strong className="text-indigo-300 font-bold">{(activeHoverOrf || activeOrf)!.peptideSequence.slice(0, 24)}...</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Part 2: Color-Coded Codon-Level Sequence Map */}
      {(viewMode === 'codon-sequence' || viewMode === 'both') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Color-Coded Nucleotide Map with In-Frame ORFs</span>
            </h4>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                <span>Start (AUG)</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                <span>Stop (UAA/UAG/UGA)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(cleanSeq, 'seq')}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'seq' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'seq' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Color-Coded Sequence Monospace View */}
          <div className="p-4 bg-slate-900 rounded-xl font-mono text-xs overflow-x-auto max-h-72 leading-relaxed select-text shadow-inner">
            {/* Split sequence into 60-nt blocks with coordinate prefixes */}
            {Array.from({ length: Math.ceil(cleanSeq.length / 60) }, (_, lineIdx) => {
              const startIdx = lineIdx * 60;
              const endIdx = Math.min(cleanSeq.length, startIdx + 60);
              const lineSeq = cleanSeq.slice(startIdx, endIdx);

              return (
                <div key={lineIdx} className="flex items-start gap-3 py-0.5 hover:bg-slate-800/40 rounded">
                  {/* Coordinate prefix */}
                  <span className="text-slate-500 text-[10px] w-12 text-right shrink-0 select-none">
                    [{startIdx + 1}]
                  </span>

                  {/* Characters with color highlight */}
                  <div className="break-all tracking-wider text-slate-300">
                    {Array.from(lineSeq).map((char, charOffset) => {
                      const pos = startIdx + charOffset + 1; // 1-indexed position
                      const orfData = baseOrfMembership.get(pos);

                      // Check if part of selected ORF
                      const isSelectedOrf = activeOrf && pos >= activeOrf.start && pos <= activeOrf.end;

                      // Check if start codon
                      const isStartCodon =
                        activeOrf && pos >= activeOrf.start && pos <= activeOrf.start + 2;

                      // Check if stop codon
                      const isStopCodon =
                        activeOrf && pos >= activeOrf.end - 2 && pos <= activeOrf.end;

                      let bgClass = '';
                      let textClass = 'text-slate-300';
                      let extraStyle: React.CSSProperties = {};

                      if (isStartCodon) {
                        bgClass = 'bg-emerald-500 font-extrabold text-white px-0.5 rounded-xs';
                        textClass = 'text-white';
                      } else if (isStopCodon) {
                        bgClass = 'bg-rose-500 font-extrabold text-white px-0.5 rounded-xs';
                        textClass = 'text-white';
                      } else if (isSelectedOrf) {
                        bgClass = 'bg-indigo-600/60 font-bold text-white';
                        textClass = 'text-white';
                      } else if (orfData && orfData.frames.length > 0) {
                        const firstFrame = orfData.frames[0];
                        if (firstFrame === '+1') textClass = 'text-indigo-400 font-semibold';
                        else if (firstFrame === '+2') textClass = 'text-emerald-400 font-semibold';
                        else textClass = 'text-purple-400 font-semibold';
                      }

                      return (
                        <span
                          key={pos}
                          className={`${bgClass} ${textClass} transition-colors`}
                          style={extraStyle}
                          title={
                            orfData
                              ? `Position ${pos}: Inside ORF(s) in frame(s) ${orfData.frames.join(', ')}`
                              : `Position ${pos}: ${char}`
                          }
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Part 3: Selected ORF Detail Inspector */}
      {activeOrf && (
        <div className="p-4.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-2xs"
                style={{ backgroundColor: activeOrf.color.track }}
              >
                Frame {activeOrf.frame}
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                ORF Coordinates: nt {activeOrf.start} &rarr; {activeOrf.end}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200">
                {activeOrf.aaLength} Amino Acids ({activeOrf.ntLength} nt)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeOrf.peptideSequence, `pep_${activeOrf.id}`)}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedKey === `pep_${activeOrf.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Copy Peptide</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(activeOrf.nucleotideSequence, `nt_${activeOrf.id}`)}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedKey === `nt_${activeOrf.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Copy DNA/RNA</span>
              </button>
            </div>
          </div>

          {/* Kozak Context & Coding Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Initiation Context</span>
              <div className="font-mono text-sm font-bold text-slate-800">
                {activeOrf.kozakContext}
              </div>
              <div className="text-[10px] text-slate-500">
                Plant Kozak Match: <strong className="text-emerald-700">{activeOrf.kozakScorePercent}%</strong>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Codon Signatures</span>
              <div className="font-mono text-sm font-bold text-slate-800">
                Start: <span className="text-emerald-600">{activeOrf.startCodon}</span> • Stop: <span className="text-rose-600">{activeOrf.stopCodon}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Reading Frame {activeOrf.frame} (Triplet Code)
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Bioinformatic Category</span>
              <div className="font-bold text-sm text-indigo-900 truncate">
                {activeOrf.classification}
              </div>
              <div className="text-[10px] text-slate-500">
                {activeOrf.aaLength < 100 ? 'Meets lncRNA non-coding benchmark' : 'Exceeds 100 aa threshold'}
              </div>
            </div>
          </div>

          {/* Translated Peptide Display */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Translated Peptide Sequence ({activeOrf.aaLength} aa):
            </div>
            <div className="p-3 bg-white border border-indigo-200 rounded-lg font-mono text-xs text-indigo-950 break-all select-all leading-relaxed shadow-inner">
              {activeOrf.peptideSequence}
            </div>
          </div>
        </div>
      )}

      {/* Part 4: Detected ORFs Inventory Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            All Potential Open Reading Frames ({filteredOrfs.length} displayed)
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            Min size: &ge; {minAaLength} aa
          </span>
        </div>

        {filteredOrfs.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
            No open reading frames matching the current length filter (&ge; {minAaLength} aa) in {selectedFrame === 'all' ? 'any reading frame' : `frame ${selectedFrame}`}.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Frame</th>
                    <th className="py-2.5 px-3">Coordinates</th>
                    <th className="py-2.5 px-3">Length</th>
                    <th className="py-2.5 px-3">Codons</th>
                    <th className="py-2.5 px-3">Kozak</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredOrfs.map((orf) => {
                    const isSelected = activeOrf?.id === orf.id;

                    return (
                      <tr
                        key={orf.id}
                        onClick={() => setSelectedOrfId(orf.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/80 font-semibold' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: orf.color.track }}
                          >
                            {orf.frame}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          nt {orf.start}–{orf.end}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          <strong>{orf.aaLength} aa</strong> ({orf.ntLength} nt)
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="text-emerald-700 font-bold">{orf.startCodon}</span>...
                          <span className="text-rose-700 font-bold">{orf.stopCodon}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-sans">
                          {orf.kozakScorePercent}% ({orf.kozakContext})
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              orf.aaLength < 30
                                ? 'bg-slate-100 text-slate-700'
                                : orf.aaLength < 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900 font-bold'
                            }`}
                          >
                            {orf.classification.split(' ')[0]} {orf.classification.split(' ')[1]}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(orf.peptideSequence, `table_${orf.id}`);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-sans font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            {copiedKey === `table_${orf.id}` ? 'Copied' : 'Copy Peptide'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
