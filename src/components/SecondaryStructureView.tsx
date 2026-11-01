/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Secondary Structure Prediction View Component
 * CSS-based dot-bracket representation generator and stem-loop folding visualizer.
 */

import React, { useState, useMemo } from 'react';
import {
  Dna,
  Layers,
  Copy,
  Check,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  GitBranch,
  Shield,
  Activity,
  FileDown,
} from 'lucide-react';
import {
  predictRnaSecondaryStructure,
  type SecondaryStructureResult,
} from '../utils/bioCalculations';

interface SecondaryStructureViewProps {
  sequence: string;
  name?: string;
  structureResult?: SecondaryStructureResult | null;
  onExportFasta?: () => void;
}

export const SecondaryStructureView: React.FC<SecondaryStructureViewProps> = ({
  sequence,
  name = 'Query lncRNA',
  structureResult: externalStructure,
  onExportFasta,
}) => {
  const [activeSubView, setActiveSubView] = useState<'css-diagram' | 'arc-diagram' | 'stem-list'>('css-diagram');
  const [hoveredBaseIndex, setHoveredBaseIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  // Compute structure if not provided
  const structure = useMemo<SecondaryStructureResult>(() => {
    return externalStructure || predictRnaSecondaryStructure(cleanSeq);
  }, [cleanSeq, externalStructure]);

  const { dotBracket, basePairs, gcContentPercent, estimatedMfeKcal } = structure;

  // Build fast lookup for base pairs
  const pairMap = useMemo(() => {
    const map = new Map<number, number>();
    basePairs.forEach(([i, j]) => {
      map.set(i, j);
      map.set(j, i);
    });
    return map;
  }, [basePairs]);

  // Structural element classification: Stem, Hairpin Loop, Internal Loop / Bulge, Unpaired Ends
  const structuralElements = useMemo(() => {
    const elements: {
      type: 'Stem' | 'Hairpin Loop' | 'Internal Loop/Bulge' | 'Single-Stranded';
      range: [number, number];
      sequence: string;
      dotBracket: string;
    }[] = [];

    // Identify hairpin loops: consecutive '.' flanked by a pair (i, j) where j is adjacent to the loop
    const n = cleanSeq.length;
    let i = 0;
    while (i < n) {
      if (dotBracket[i] === '.') {
        const start = i;
        while (i < n && dotBracket[i] === '.') i++;
        const end = i - 1;
        const leftPaired = start > 0 && dotBracket[start - 1] === '(';
        const rightPaired = end < n - 1 && dotBracket[end + 1] === ')';

        if (leftPaired && rightPaired) {
          elements.push({
            type: 'Hairpin Loop',
            range: [start + 1, end + 1],
            sequence: cleanSeq.slice(start, end + 1),
            dotBracket: dotBracket.slice(start, end + 1),
          });
        } else if (leftPaired || rightPaired) {
          elements.push({
            type: 'Internal Loop/Bulge',
            range: [start + 1, end + 1],
            sequence: cleanSeq.slice(start, end + 1),
            dotBracket: dotBracket.slice(start, end + 1),
          });
        } else {
          elements.push({
            type: 'Single-Stranded',
            range: [start + 1, end + 1],
            sequence: cleanSeq.slice(start, end + 1),
            dotBracket: dotBracket.slice(start, end + 1),
          });
        }
      } else {
        // Consecutive '(' or ')' as stem blocks
        const start = i;
        const char = dotBracket[i];
        while (i < n && dotBracket[i] === char) i++;
        const end = i - 1;
        elements.push({
          type: 'Stem',
          range: [start + 1, end + 1],
          sequence: cleanSeq.slice(start, end + 1),
          dotBracket: dotBracket.slice(start, end + 1),
        });
      }
    }

    return elements;
  }, [cleanSeq, dotBracket]);

  const handleCopyFastaVienna = () => {
    const text = `>${name}\n${cleanSeq}\n${dotBracket} (MFE = ${estimatedMfeKcal} kcal/mol)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md flex items-center gap-1">
              <Dna className="w-3 h-3 text-blue-600" />
              Secondary Structure
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              RNA Folding & Dot-Bracket Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Nussinov dynamic programming fold predicting base pairs (G-C, A-U, G-U) and minimum loop lengths.
          </p>
        </div>

        {/* View Switcher & Copy */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs font-medium">
            <button
              onClick={() => setActiveSubView('css-diagram')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeSubView === 'css-diagram'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CSS Dot-Bracket Track
            </button>
            <button
              onClick={() => setActiveSubView('arc-diagram')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeSubView === 'arc-diagram'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Arc Synteny View
            </button>
            <button
              onClick={() => setActiveSubView('stem-list')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeSubView === 'stem-list'
                  ? 'bg-white text-purple-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stem & Loop Inventory
            </button>
          </div>

          {onExportFasta && (
            <button
              onClick={onExportFasta}
              className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export FASTA with biophysical properties"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export FASTA</span>
            </button>
          )}

          <button
            onClick={handleCopyFastaVienna}
            className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Copy ViennaRNA / RNAfold format"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Vienna RNA'}</span>
          </button>
        </div>
      </div>

      {/* Structural Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-blue-900 text-[11px] font-medium">Minimum Free Energy (MFE)</div>
          <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
            {estimatedMfeKcal} kcal/mol
          </div>
          <div className="text-[10px] text-blue-500">Thermodynamic folding state</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-emerald-900 text-[11px] font-medium">Predicted Base Pairs</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
            {basePairs.length} pairs
          </div>
          <div className="text-[10px] text-emerald-600">
            {Math.round(((basePairs.length * 2) / (cleanSeq.length || 1)) * 100)}% bases in stems
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-center">
          <div className="text-purple-900 text-[11px] font-medium">Hairpin & Internal Loops</div>
          <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">
            {structuralElements.filter((e) => e.type.includes('Loop')).length} loops
          </div>
          <div className="text-[10px] text-purple-600">Single-stranded binding sites</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-amber-900 text-[11px] font-medium">Stem GC Content</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">
            {gcContentPercent}%
          </div>
          <div className="text-[10px] text-amber-600">Enhanced thermal rigidity</div>
        </div>
      </div>

      {/* VIEW 1: CSS Dot-Bracket Representation Generator */}
      {activeSubView === 'css-diagram' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700">
              Interactive Dot-Bracket Node Generator
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
                <span>Stem 5' (</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block"></span>
                <span>Stem 3' )</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-300 inline-block"></span>
                <span>Unpaired Loop .</span>
              </span>
            </div>
          </div>

          {/* CSS Node Generator Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono overflow-x-auto select-none">
            <div className="space-y-4 min-w-[550px]">
              {Array.from({ length: Math.ceil(cleanSeq.length / 40) }).map((_, blockIdx) => {
                const start = blockIdx * 40;
                const end = Math.min(cleanSeq.length, start + 40);
                const blockSlice = cleanSeq.slice(start, end).split('');

                return (
                  <div key={blockIdx} className="space-y-1">
                    {/* Position markers */}
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <span className="w-8 shrink-0">{start + 1}</span>
                      <div className="flex items-center gap-1">
                        {blockSlice.map((_, i) => (
                          <span
                            key={i}
                            className={`w-6 text-center ${
                              (start + i + 1) % 10 === 0 ? 'text-amber-400 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {(start + i + 1) % 10 === 0 ? start + i + 1 : '·'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Nucleotide row */}
                    <div className="flex items-center gap-1">
                      <span className="w-8 shrink-0 text-[10px] text-slate-400 font-mono">RNA</span>
                      <div className="flex items-center gap-1">
                        {blockSlice.map((base, i) => {
                          const idx = start + i;
                          const bracket = dotBracket[idx] || '.';
                          const partnerIdx = pairMap.get(idx);
                          const isHovered = hoveredBaseIndex === idx;
                          const isPartnerHovered =
                            hoveredBaseIndex !== null && pairMap.get(hoveredBaseIndex) === idx;

                          let bgClass = 'bg-slate-800 text-slate-300';
                          if (bracket === '(') bgClass = 'bg-blue-600 text-white font-bold';
                          else if (bracket === ')') bgClass = 'bg-emerald-600 text-white font-bold';

                          let ringClass = '';
                          if (isHovered) ringClass = 'ring-2 ring-white scale-110 z-10';
                          else if (isPartnerHovered) ringClass = 'ring-2 ring-amber-400 scale-110 z-10';

                          return (
                            <button
                              key={i}
                              type="button"
                              onMouseEnter={() => setHoveredBaseIndex(idx)}
                              onMouseLeave={() => setHoveredBaseIndex(null)}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-transform cursor-pointer ${bgClass} ${ringClass}`}
                              title={`Pos ${idx + 1}: ${base} (${bracket})`}
                            >
                              {base}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dot-Bracket row with CSS styled symbols */}
                    <div className="flex items-center gap-1">
                      <span className="w-8 shrink-0 text-[10px] text-slate-400 font-mono">2D</span>
                      <div className="flex items-center gap-1">
                        {blockSlice.map((_, i) => {
                          const idx = start + i;
                          const bracket = dotBracket[idx] || '.';
                          const isHovered =
                            hoveredBaseIndex === idx ||
                            (hoveredBaseIndex !== null && pairMap.get(hoveredBaseIndex) === idx);

                          let bracketColor = 'text-slate-500';
                          if (bracket === '(') bracketColor = 'text-blue-400 font-extrabold';
                          else if (bracket === ')') bracketColor = 'text-emerald-400 font-extrabold';

                          return (
                            <span
                              key={i}
                              className={`w-6 text-center text-xs font-mono transition-colors ${bracketColor} ${
                                isHovered ? 'text-amber-300 scale-125' : ''
                              }`}
                            >
                              {bracket}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hovered Base Pair Linkage Details */}
          {hoveredBaseIndex !== null && (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white flex items-center justify-between font-mono animate-fade-in">
              <div>
                <span className="text-slate-400">Inspecting Base #{hoveredBaseIndex + 1}: </span>
                <span className="text-amber-300 font-bold">{cleanSeq[hoveredBaseIndex]}</span>
                <span className="text-slate-400 ml-2">Bracket: </span>
                <span className="text-blue-300 font-bold">{dotBracket[hoveredBaseIndex]}</span>
              </div>
              {pairMap.get(hoveredBaseIndex) !== undefined ? (
                <div className="text-emerald-400">
                  Paired with Base #{pairMap.get(hoveredBaseIndex)! + 1} (
                  {cleanSeq[pairMap.get(hoveredBaseIndex)!]}) &bull;{' '}
                  <span className="text-amber-400">
                    {Math.abs(hoveredBaseIndex - pairMap.get(hoveredBaseIndex)!)} nt loop span
                  </span>
                </div>
              ) : (
                <div className="text-slate-400">Unpaired flexible loop / single-stranded nucleotide</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Arc Synteny View */}
      {activeSubView === 'arc-diagram' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700">
              RNA Base-Pair Arc Synteny Diagram
            </span>
            <span className="text-[11px] text-slate-500">
              Each arch connects paired nucleotides forming RNA duplex stems
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
            <div className="min-w-[600px] relative py-8">
              {/* SVG Arcs */}
              <svg className="w-full h-28" viewBox={`0 0 ${cleanSeq.length * 14 + 40} 100`}>
                <defs>
                  <linearGradient id="gcArc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="auArc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                {basePairs.map(([i, j], pIdx) => {
                  const x1 = i * 14 + 20;
                  const x2 = j * 14 + 20;
                  const dx = x2 - x1;
                  const r = dx / 2;
                  const h = Math.min(85, Math.max(20, r * 0.8));
                  const isHovered =
                    hoveredBaseIndex === i || hoveredBaseIndex === j;

                  const baseA = cleanSeq[i];
                  const baseB = cleanSeq[j];
                  const isGc = (baseA === 'G' && baseB === 'C') || (baseA === 'C' && baseB === 'G');

                  return (
                    <path
                      key={pIdx}
                      d={`M ${x1} 90 C ${x1 + dx * 0.2} ${90 - h}, ${x2 - dx * 0.2} ${90 - h}, ${x2} 90`}
                      fill="none"
                      stroke={isHovered ? '#fbbf24' : isGc ? 'url(#gcArc)' : 'url(#auArc)'}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      strokeOpacity={isHovered ? 1.0 : 0.75}
                      className="transition-all cursor-pointer hover:stroke-amber-400"
                      onMouseEnter={() => setHoveredBaseIndex(i)}
                      onMouseLeave={() => setHoveredBaseIndex(null)}
                    >
                      <title>{`Base Pair: ${i + 1}${baseA} = ${j + 1}${baseB}`}</title>
                    </path>
                  );
                })}

                {/* Nucleotide Dots Along Baseline */}
                {cleanSeq.split('').map((base, idx) => {
                  const cx = idx * 14 + 20;
                  const isPaired = pairMap.has(idx);
                  const isHovered = hoveredBaseIndex === idx || pairMap.get(hoveredBaseIndex ?? -1) === idx;

                  return (
                    <g key={idx}>
                      <circle
                        cx={cx}
                        cy={90}
                        r={isHovered ? 4 : isPaired ? 3 : 2}
                        fill={isHovered ? '#fbbf24' : isPaired ? '#3b82f6' : '#64748b'}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredBaseIndex(idx)}
                        onMouseLeave={() => setHoveredBaseIndex(null)}
                      />
                      {(idx + 1) % 10 === 0 && (
                        <text
                          x={cx}
                          y={99}
                          fontSize="7"
                          fill="#94a3b8"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {idx + 1}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Stem & Loop Inventory Table */}
      {activeSubView === 'stem-list' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700">
            Identified Structural Motifs & Loop Inventory
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Motif Type</th>
                  <th className="py-2 px-3">Coordinates</th>
                  <th className="py-2 px-3">Length</th>
                  <th className="py-2 px-3">Nucleotide Sequence</th>
                  <th className="py-2 px-3">Dot-Bracket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {structuralElements.map((el, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 font-sans">
                    <td className="py-2 px-3 font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          el.type === 'Stem'
                            ? 'bg-blue-100 text-blue-800'
                            : el.type === 'Hairpin Loop'
                            ? 'bg-rose-100 text-rose-800'
                            : el.type === 'Internal Loop/Bulge'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {el.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono">
                      nt {el.range[0]} - {el.range[1]}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono">
                      {el.sequence.length} nt
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 break-all max-w-[200px]">
                      {el.sequence}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-600 break-all max-w-[150px]">
                      {el.dotBracket}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
