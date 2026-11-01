/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Visual Nucleotide Sequence Component
 * Biophysical sequence visualizer with GC-content and secondary structure base-pairing highlights.
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Info,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Eye,
  Sliders,
  Layers,
  FileDown,
} from 'lucide-react';
import { predictRnaSecondaryStructure, type SecondaryStructureResult } from '../utils/bioCalculations';
import { D3SequenceMotifViewer } from './D3SequenceMotifViewer';
import { discoverRegulatoryMotifs } from '../utils/motifDiscovery';

interface VisualSequenceViewerProps {
  sequence: string;
  name?: string;
  structureResult?: SecondaryStructureResult | null;
  onExportFasta?: () => void;
}

export const VisualSequenceViewer: React.FC<VisualSequenceViewerProps> = ({
  sequence,
  name = 'Query lncRNA',
  structureResult: externalStructure,
  onExportFasta,
}) => {
  const [highlightMode, setHighlightMode] = useState<'d3' | 'gc' | 'basepairs' | 'nucleotide'>('d3');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(15);

  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  const motifResult = useMemo(() => {
    return discoverRegulatoryMotifs(cleanSeq);
  }, [cleanSeq]);

  // Compute structure if not provided
  const structure = useMemo(() => {
    return externalStructure || predictRnaSecondaryStructure(cleanSeq);
  }, [cleanSeq, externalStructure]);

  // Map each index to its base-pairing partner (0-indexed)
  const pairMap = useMemo(() => {
    const map = new Map<number, number>();
    if (structure && structure.basePairs) {
      for (const [i, j] of structure.basePairs) {
        map.set(i, j);
        map.set(j, i);
      }
    }
    return map;
  }, [structure]);

  // Overall nucleotide counts and GC percentage
  const stats = useMemo(() => {
    const len = cleanSeq.length;
    const g = (cleanSeq.match(/G/g) || []).length;
    const c = (cleanSeq.match(/C/g) || []).length;
    const a = (cleanSeq.match(/A/g) || []).length;
    const u = (cleanSeq.match(/U/g) || []).length;
    const gc = g + c;
    const gcPercent = len > 0 ? Math.round((gc / len) * 1000) / 10 : 0;
    const pairedCount = pairMap.size;
    const pairedPercent = len > 0 ? Math.round((pairedCount / len) * 1000) / 10 : 0;
    return { len, g, c, a, u, gc, gcPercent, pairedCount, pairedPercent };
  }, [cleanSeq, pairMap]);

  // Sliding window GC profile
  const gcSlidingProfile = useMemo(() => {
    const len = cleanSeq.length;
    if (len === 0) return [];
    const points: { index: number; gcPct: number }[] = [];
    const w = Math.min(len, Math.max(5, windowSize));

    for (let i = 0; i < len; i++) {
      const start = Math.max(0, i - Math.floor(w / 2));
      const end = Math.min(len, start + w);
      const sub = cleanSeq.slice(start, end);
      const gc = (sub.match(/[GC]/g) || []).length;
      points.push({ index: i, gcPct: Math.round((gc / (sub.length || 1)) * 100) });
    }
    return points;
  }, [cleanSeq, windowSize]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanSeq);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hovered base information
  const hoveredInfo = useMemo(() => {
    if (hoveredIndex === null || hoveredIndex < 0 || hoveredIndex >= cleanSeq.length) {
      return null;
    }
    const base = cleanSeq[hoveredIndex];
    const partnerIdx = pairMap.get(hoveredIndex);
    const partnerBase = partnerIdx !== undefined ? cleanSeq[partnerIdx] : null;

    let pairType = 'Unpaired (Loop / Single-stranded)';
    let hBonds = 0;
    if (partnerBase) {
      if ((base === 'G' && partnerBase === 'C') || (base === 'C' && partnerBase === 'G')) {
        pairType = 'Watson-Crick G≡C Strong Pair';
        hBonds = 3;
      } else if ((base === 'A' && partnerBase === 'U') || (base === 'U' && partnerBase === 'A')) {
        pairType = 'Watson-Crick A=U Standard Pair';
        hBonds = 2;
      } else if ((base === 'G' && partnerBase === 'U') || (base === 'U' && partnerBase === 'G')) {
        pairType = 'G·U Wobble Non-Canonical Pair';
        hBonds = 1;
      }
    }

    const localGcPct = gcSlidingProfile[hoveredIndex]?.gcPct ?? 0;

    return {
      pos: hoveredIndex + 1,
      base,
      partnerPos: partnerIdx !== undefined ? partnerIdx + 1 : null,
      partnerBase,
      pairType,
      hBonds,
      isGc: base === 'G' || base === 'C',
      localGcPct,
    };
  }, [hoveredIndex, cleanSeq, pairMap, gcSlidingProfile]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md">
              Biophysical Visualizer
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Nucleotide Sequence Architecture: {name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physicochemical base inspection, GC-content thermodynamics, and Watson-Crick pairing tracks.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-medium">
            <button
              onClick={() => setHighlightMode('d3')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                highlightMode === 'd3'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>D3 Multi-Track Architecture</span>
            </button>
            <button
              onClick={() => setHighlightMode('gc')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                highlightMode === 'gc'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GC Content (3 H-Bonds)
            </button>
            <button
              onClick={() => setHighlightMode('basepairs')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                highlightMode === 'basepairs'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Base Pairings (Folded)
            </button>
            <button
              onClick={() => setHighlightMode('nucleotide')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                highlightMode === 'nucleotide'
                  ? 'bg-white text-purple-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4-Base Palette
            </button>
          </div>

          {onExportFasta && (
            <button
              onClick={onExportFasta}
              className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export FASTA with biophysical properties"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Export FASTA</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1 cursor-pointer"
            title="Copy Clean Sequence"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {highlightMode === 'd3' ? (
        <D3SequenceMotifViewer
          sequence={cleanSeq}
          name={name}
          motifs={motifResult.hits}
          conservationProfile={motifResult.conservationProfile}
        />
      ) : (
        <>
          {/* Metric Quick Stats Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
          <div className="text-slate-500 text-[11px]">Sequence Length</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{stats.len} nt</div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 text-center">
          <div className="text-blue-900 text-[11px] font-medium">GC Content (G+C)</div>
          <div className="font-mono font-bold text-blue-700 text-sm mt-0.5">
            {stats.gcPercent}% <span className="text-[10px] text-blue-500 font-normal">({stats.gc} nt)</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-center">
          <div className="text-amber-900 text-[11px] font-medium">AU Content (A+U)</div>
          <div className="font-mono font-bold text-amber-700 text-sm mt-0.5">
            {(100 - stats.gcPercent).toFixed(1)}% <span className="text-[10px] text-amber-600 font-normal">({stats.a + stats.u} nt)</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-center">
          <div className="text-emerald-900 text-[11px] font-medium">Paired Bases</div>
          <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
            {stats.pairedCount} nt <span className="text-[10px] text-emerald-600 font-normal">({stats.pairedPercent}%)</span>
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-2.5 text-center">
          <div className="text-purple-900 text-[11px] font-medium">Base Composition</div>
          <div className="font-mono text-[11px] text-purple-700 font-bold mt-0.5">
            A:{stats.a} C:{stats.c} G:{stats.g} U:{stats.u}
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        {highlightMode === 'gc' && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">GC Mode:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                G
              </span>
              <span className="w-3.5 h-3.5 rounded bg-cyan-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                C
              </span>
              <span className="text-slate-600 text-[11px]">G/C High Stability (3 Hydrogen Bonds, High Tm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                A
              </span>
              <span className="w-3.5 h-3.5 rounded bg-orange-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                U
              </span>
              <span className="text-slate-600 text-[11px]">A/U Lower Melting (2 Hydrogen Bonds)</span>
            </div>
          </div>
        )}

        {highlightMode === 'basepairs' && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">Pairing Mode:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400"></span>
              <span className="text-slate-600 text-[11px]">G≡C Stem (3 H-Bonds)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-400"></span>
              <span className="text-slate-600 text-[11px]">A=U Stem (2 H-Bonds)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-indigo-500 border border-indigo-400"></span>
              <span className="text-slate-600 text-[11px]">G·U Wobble</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
              <span className="text-slate-600 text-[11px]">Unpaired Loop / Singlet</span>
            </div>
          </div>
        )}

        {highlightMode === 'nucleotide' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Bases:</span>
            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold text-[11px]">A (Adenine)</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[11px]">C (Cytosine)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[11px]">G (Guanine)</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]">U (Uracil)</span>
          </div>
        )}

        <div className="text-[11px] text-slate-400">
          Hover any nucleotide to view partner & biophysical parameters
        </div>
      </div>

      {/* Main Interactive Sequence Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono select-none overflow-x-auto">
        <div className="space-y-2 min-w-[500px]">
          {Array.from({ length: Math.ceil(cleanSeq.length / 50) }).map((_, blockIdx) => {
            const start = blockIdx * 50;
            const end = Math.min(cleanSeq.length, start + 50);
            const lineBases = cleanSeq.slice(start, end).split('');

            return (
              <div key={blockIdx} className="flex items-center gap-3 text-xs leading-none">
                {/* 1-indexed Line Start Label */}
                <div className="w-12 text-slate-500 text-right font-mono text-[10px] shrink-0">
                  {start + 1}
                </div>

                {/* Nucleotide Sequence Badges in 10-nt chunks */}
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: Math.ceil(lineBases.length / 10) }).map((_, chunkIdx) => {
                    const chunkStart = chunkIdx * 10;
                    const chunkEnd = Math.min(lineBases.length, chunkStart + 10);
                    const chunk = lineBases.slice(chunkStart, chunkEnd);

                    return (
                      <div key={chunkIdx} className="flex items-center gap-0.5">
                        {chunk.map((base, i) => {
                          const globalIdx = start + chunkStart + i;
                          const isHovered = hoveredIndex === globalIdx;
                          const partnerIdx = pairMap.get(globalIdx);
                          const isPartnerOfHovered =
                            hoveredIndex !== null && pairMap.get(hoveredIndex) === globalIdx;

                          // Dynamic styling based on mode
                          let bgClass = 'bg-slate-800 text-slate-300';
                          let borderClass = 'border-transparent';

                          if (highlightMode === 'gc') {
                            if (base === 'G') {
                              bgClass = 'bg-blue-600 text-white font-bold';
                            } else if (base === 'C') {
                              bgClass = 'bg-cyan-600 text-white font-bold';
                            } else if (base === 'A') {
                              bgClass = 'bg-amber-500/90 text-slate-950 font-bold';
                            } else if (base === 'U') {
                              bgClass = 'bg-orange-500/90 text-white font-bold';
                            }
                          } else if (highlightMode === 'basepairs') {
                            if (partnerIdx !== undefined) {
                              const partner = cleanSeq[partnerIdx];
                              if (
                                (base === 'G' && partner === 'C') ||
                                (base === 'C' && partner === 'G')
                              ) {
                                bgClass = 'bg-blue-600 text-white font-bold';
                                borderClass = 'border-blue-400';
                              } else if (
                                (base === 'A' && partner === 'U') ||
                                (base === 'U' && partner === 'A')
                              ) {
                                bgClass = 'bg-emerald-600 text-white font-bold';
                                borderClass = 'border-emerald-400';
                              } else {
                                bgClass = 'bg-indigo-600 text-white font-bold';
                                borderClass = 'border-indigo-400';
                              }
                            } else {
                              bgClass = 'bg-slate-800/80 text-slate-400';
                            }
                          } else if (highlightMode === 'nucleotide') {
                            if (base === 'A') bgClass = 'bg-rose-600 text-white font-bold';
                            else if (base === 'C') bgClass = 'bg-sky-600 text-white font-bold';
                            else if (base === 'G') bgClass = 'bg-amber-500 text-slate-950 font-bold';
                            else if (base === 'U') bgClass = 'bg-emerald-600 text-white font-bold';
                          }

                          // Active hover state
                          if (isHovered) {
                            borderClass = 'border-white ring-2 ring-white scale-110 z-10';
                          } else if (isPartnerOfHovered) {
                            borderClass = 'border-amber-400 ring-2 ring-amber-400 scale-110 z-10';
                          }

                          return (
                            <button
                              key={i}
                              type="button"
                              onMouseEnter={() => setHoveredIndex(globalIdx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              className={`w-6 h-6 rounded flex items-center justify-center text-[11px] border transition-transform duration-100 cursor-pointer ${bgClass} ${borderClass}`}
                              title={`Pos ${globalIdx + 1}: ${base}`}
                            >
                              {base}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* 1-indexed Line End Label */}
                <div className="text-slate-600 font-mono text-[10px] shrink-0">
                  {end}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating / Inline Biophysical Base Inspector */}
      {hoveredInfo ? (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-blue-600 font-mono font-bold text-sm flex items-center justify-center">
              {hoveredInfo.base}
            </span>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Position {hoveredInfo.pos} of {cleanSeq.length}</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-300">{hoveredInfo.pairType}</span>
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                {hoveredInfo.isGc ? 'G/C High-density nucleotide (3 H-bonds)' : 'A/U standard nucleotide (2 H-bonds)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {hoveredInfo.partnerPos && (
              <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                <span className="text-slate-400">Paired with: </span>
                <span className="text-emerald-400 font-bold">
                  {hoveredInfo.partnerBase} (Pos {hoveredInfo.partnerPos})
                </span>
                <span className="text-amber-400 ml-1">({hoveredInfo.hBonds} H-bonds)</span>
              </div>
            )}
            <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              <span className="text-slate-400">Local GC ({windowSize}nt): </span>
              <span className="text-cyan-300 font-bold">{hoveredInfo.localGcPct}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Tip: Hover any nucleotide badge above to inspect its 3D hydrogen bonding, Watson-Crick pairing partner, and local GC density.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{cleanSeq.length} nucleotides</span>
        </div>
      )}

      {/* Sliding Window GC Content Track */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-blue-600" />
            Sliding Window GC% Thermostability Track ({windowSize} nt window)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Window:</span>
            {[10, 15, 25].map((w) => (
              <button
                key={w}
                onClick={() => setWindowSize(w)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                  windowSize === w
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w} nt
              </button>
            ))}
          </div>
        </div>

        {/* GC Density Heat-Bar Strip */}
        <div className="w-full h-4 rounded-md overflow-hidden flex border border-slate-200 bg-slate-100">
          {gcSlidingProfile.map((pt, idx) => {
            // Color based on GC%
            let color = 'bg-amber-400';
            if (pt.gcPct >= 65) color = 'bg-blue-700';
            else if (pt.gcPct >= 50) color = 'bg-blue-500';
            else if (pt.gcPct >= 40) color = 'bg-cyan-500';
            else if (pt.gcPct >= 30) color = 'bg-emerald-400';

            return (
              <div
                key={idx}
                className={`h-full flex-1 transition-opacity ${color}`}
                title={`Position ${idx + 1}: ${pt.gcPct}% GC`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
          <span>5' End (Pos 1)</span>
          <span>Low GC (Thermally Dynamic) &larr; &rarr; High GC (Thermo-Resistant Stems)</span>
          <span>3' End (Pos {cleanSeq.length})</span>
        </div>
      </div>
    </>
  )}
</div>
  );
};
