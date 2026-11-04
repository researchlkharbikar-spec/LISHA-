/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Plant-Specific Regulatory Motif Scanner
 * Scans input lncRNA sequence for common plant-specific regulatory motifs
 * and displays matches in a filterable, responsive, scrollable list.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Shield,
  Layers,
  Activity,
  Flame,
  Copy,
  Check,
  Filter,
  FileDown,
  Info,
  Compass,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  discoverRegulatoryMotifs,
  type DiscoveredMotifHit,
  type MotifCategory,
} from '../utils/motifDiscovery';

interface PlantMotifScannerProps {
  sequence: string;
  lncRnaName?: string;
  onSelectMotif?: (hit: DiscoveredMotifHit) => void;
  className?: string;
  maxHeight?: string;
}

export const PlantMotifScanner: React.FC<PlantMotifScannerProps> = ({
  sequence,
  lncRnaName = 'Query lncRNA',
  onSelectMotif,
  className = '',
  maxHeight = 'max-h-80',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Clean sequence (A, C, G, U)
  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  // Execute motif discovery
  const discoveryResult = useMemo(() => {
    return discoverRegulatoryMotifs(cleanSeq);
  }, [cleanSeq]);

  const hits = discoveryResult.hits;

  // Filter matches based on category and search query
  const filteredHits = useMemo(() => {
    return hits.filter((hit) => {
      const matchesCategory =
        selectedCategory === 'all' || hit.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        hit.motifName.toLowerCase().includes(q) ||
        hit.targetFactorOrPathway.toLowerCase().includes(q) ||
        hit.matchedSequence.toLowerCase().includes(q) ||
        hit.pattern.toLowerCase().includes(q) ||
        hit.description.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [hits, selectedCategory, searchQuery]);

  const handleCopySeq = (seq: string, id: string) => {
    navigator.clipboard.writeText(seq);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (filteredHits.length === 0) return;
    const header = 'Motif\tCategory\tStart\tEnd\tLength\tMatched_Sequence\tTarget_Factor\tBiological_Context';
    const rows = filteredHits.map(
      (h) =>
        `${h.motifName}\t${h.category}\t${h.start}\t${h.end}\t${h.length}\t${h.matchedSequence}\t${h.targetFactorOrPathway}\t${h.biologicalContext}`
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  const handleExportCsv = () => {
    if (filteredHits.length === 0) return;
    const header = 'Motif Name,Category,Start,End,Length,Sequence,Target Factor,Significance';
    const rows = filteredHits.map(
      (h) =>
        `"${h.motifName}","${h.category}",${h.start},${h.end},${h.length},"${h.matchedSequence}","${h.targetFactorOrPathway}","${h.significance.replace(/"/g, '""')}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (lncRnaName || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_Plant_Regulatory_Motifs.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Density calculation
  const motifDensityPer100nt =
    cleanSeq.length > 0 ? ((hits.length / cleanSeq.length) * 100).toFixed(1) : '0';

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5 ${className}`}>
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Plant Regulatory Motif Scanner
            </h4>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-extrabold rounded-full">
              {hits.length} Matches
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time screening for common plant immune, abiotic, and regulatory elements (W-box, DRE/CRT, GCC-box, ABRE, miRNA seeds).
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
            {discoveryResult.uniqueMotifsFoundCount} Unique Types
          </span>
          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-semibold">
            {motifDensityPer100nt} motifs / 100 nt
          </span>
        </div>
      </div>

      {/* Category Pills & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({hits.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('Biotic Defense')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'Biotic Defense'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Biotic Defense ({discoveryResult.categoryCounts['Biotic Defense'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('Abiotic Stress')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'Abiotic Stress'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Abiotic Stress ({discoveryResult.categoryCounts['Abiotic Stress'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('miRNA Target Seed')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'miRNA Target Seed'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            miRNA Seeds ({discoveryResult.categoryCounts['miRNA Target Seed'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('RNA Processing & Stability')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'RNA Processing & Stability'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Stability ({discoveryResult.categoryCounts['RNA Processing & Stability'] || 0})
          </button>
        </div>

        {/* Export / Copy All Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={filteredHits.length === 0}
            className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Copy all currently filtered matches as tab-separated values"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
            <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredHits.length === 0}
            className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Export filtered motif matches to CSV file"
          >
            <FileDown className="w-3 h-3 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter matches by motif name (e.g. W-box, DRE), factor (WRKY, DREB1), or sequence..."
          className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-violet-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 font-bold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Scrollable Matches List */}
      <div className={`${maxHeight} overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 scrollbar-thin`}>
        {filteredHits.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl space-y-2">
            <Compass className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">No regulatory motif matches found</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No motifs match the search filter "${searchQuery}". Try clearing the filter.`
                : 'No conserved plant regulatory motifs were detected in this sequence.'}
            </p>
          </div>
        ) : (
          filteredHits.map((hit) => (
            <div
              key={hit.hitId}
              className="pt-2 first:pt-0 group hover:bg-slate-50/80 p-2.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  {/* Top row: Motif badge, coordinates, and pathway */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${hit.colorBadge.bg} ${hit.colorBadge.text} ${hit.colorBadge.border} flex items-center gap-1`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${hit.colorBadge.dot}`}></span>
                      <span>{hit.motifName}</span>
                    </span>

                    <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-mono">
                      nt {hit.start}–{hit.end} ({hit.length} bp)
                    </span>

                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      {hit.targetFactorOrPathway}
                    </span>
                  </div>

                  {/* Middle row: Matched Sequence snippet and consensus pattern */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono">Match:</span>
                    <span className="font-mono text-xs font-bold text-violet-950 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200 select-all tracking-wider">
                      {hit.matchedSequence}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Pattern: {hit.pattern}
                    </span>
                  </div>

                  {/* Bottom row: Biological context / defense significance */}
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                    {hit.biologicalContext || hit.significance}
                  </p>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCopySeq(hit.matchedSequence, hit.hitId)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                    title="Copy matched nucleotide sequence"
                  >
                    {copiedId === hit.hitId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {onSelectMotif && (
                    <button
                      type="button"
                      onClick={() => onSelectMotif(hit)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                      title="Inspect this motif in sequence viewer"
                    >
                      <span>Focus</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Position Progress Bar along sequence length */}
              {cleanSeq.length > 0 && (
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-violet-500 h-1 rounded-full transition-all"
                    style={{
                      marginLeft: `${(hit.start / cleanSeq.length) * 100}%`,
                      width: `${Math.max(1, (hit.length / cleanSeq.length) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer provenance notice */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span>PlantCARE & TransFac verified consensus patterns</span>
        <span>ICAR-NIBSM Computational Core</span>
      </div>
    </div>
  );
};
