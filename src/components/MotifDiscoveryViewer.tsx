/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Sequence Motif Discovery Viewer Component
 * Identifies conserved plant stress regulatory motifs, cis-elements, miRNA seeds, and de novo k-mers
 * using IUPAC degenerate pattern matching.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Info,
  Shield,
  Layers,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  Flame,
  FileDown,
  Compass,
} from 'lucide-react';
import {
  discoverRegulatoryMotifs,
  calculateKmerFrequencies,
  findMotifHitsInSequence,
  convertIupacToRegex,
  type RegulatoryMotifDefinition,
  type DiscoveredMotifHit,
  type MotifCategory,
  type KmerFrequencyHit,
  type MotifDiscoveryResult,
} from '../utils/motifDiscovery';
import { D3SequenceMotifViewer } from './D3SequenceMotifViewer';

interface MotifDiscoveryViewerProps {
  sequence: string;
  name?: string;
  onExportFasta?: () => void;
}

export const MotifDiscoveryViewer: React.FC<MotifDiscoveryViewerProps> = ({
  sequence,
  name = 'Query lncRNA',
  onExportFasta,
}) => {
  const [trackMode, setTrackMode] = useState<'d3-multitrack' | 'compact-bar'>('d3-multitrack');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedHitId, setSelectedHitId] = useState<string | null>(null);
  const [expandedHitId, setExpandedHitId] = useState<string | null>(null);
  const [copiedHitSeq, setCopiedHitSeq] = useState<string | null>(null);

  // Custom user motif input states
  const [customPattern, setCustomPattern] = useState<string>('');
  const [customName, setCustomName] = useState<string>('Custom Candidate Motif');
  const [customFactor, setCustomFactor] = useState<string>('Experimental Target');
  const [customCategory, setCustomCategory] = useState<MotifCategory>('Custom User Motif');
  const [userCustomMotifs, setUserCustomMotifs] = useState<RegulatoryMotifDefinition[]>([]);
  const [isCustomPanelOpen, setIsCustomPanelOpen] = useState<boolean>(false);

  // K-mer length selector (4, 5, or 6)
  const [selectedK, setSelectedK] = useState<number>(5);

  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  // Execute full motif discovery
  const discoveryResult: MotifDiscoveryResult = useMemo(() => {
    return discoverRegulatoryMotifs(cleanSeq, userCustomMotifs);
  }, [cleanSeq, userCustomMotifs]);

  // Reactive K-mer analysis with selectable k
  const kmerHits: KmerFrequencyHit[] = useMemo(() => {
    return calculateKmerFrequencies(cleanSeq, selectedK, 8);
  }, [cleanSeq, selectedK]);

  // Filter hits based on category and search query
  const filteredHits = useMemo(() => {
    return discoveryResult.hits.filter((hit) => {
      const matchesCategory =
        activeCategory === 'all' || hit.category === activeCategory;
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        hit.motifName.toLowerCase().includes(q) ||
        hit.targetFactorOrPathway.toLowerCase().includes(q) ||
        hit.matchedSequence.toLowerCase().includes(q) ||
        hit.pattern.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [discoveryResult.hits, activeCategory, searchFilter]);

  // Find currently selected hit details
  const selectedHit = useMemo(() => {
    if (!selectedHitId) return null;
    return discoveryResult.hits.find((h) => h.hitId === selectedHitId) || null;
  }, [selectedHitId, discoveryResult.hits]);

  // Add custom motif to list
  const handleAddCustomMotif = () => {
    const trimmed = customPattern.trim().toUpperCase();
    if (!trimmed) return;

    const newMotif: RegulatoryMotifDefinition = {
      id: `custom_${Date.now()}`,
      name: customName.trim() || 'Custom User Motif',
      pattern: trimmed,
      category: customCategory,
      consensusDisplay: trimmed,
      targetFactorOrPathway: customFactor.trim() || 'Custom Factor',
      description: `User-defined motif pattern: ${trimmed}`,
      significance: 'Custom motif defined for user screening investigation.',
      biologicalContext: 'Evaluated against submitted sequence using IUPAC pattern matching.',
      colorBadge: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        dot: 'bg-indigo-500',
      },
    };

    setUserCustomMotifs((prev) => [...prev, newMotif]);
    setCustomPattern('');
    setCustomName('Custom Candidate Motif');
  };

  const handleRemoveCustomMotif = (id: string) => {
    setUserCustomMotifs((prev) => prev.filter((m) => m.id !== id));
    if (selectedHitId && selectedHitId.startsWith(id)) {
      setSelectedHitId(null);
    }
  };

  const handleCopy = (text: string, hitId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHitSeq(hitId);
    setTimeout(() => setCopiedHitSeq(null), 2000);
  };

  // Export hits to TSV/CSV format
  const handleExportTsv = () => {
    const header = [
      'Motif_Name',
      'Category',
      'Target_Factor',
      'IUPAC_Pattern',
      'Matched_Sequence',
      'Start_1idx',
      'End_1idx',
      'Length_nt',
      'Relative_Position_Pct',
      'Description',
    ].join('\t');

    const rows = discoveryResult.hits.map((h) =>
      [
        h.motifName,
        h.category,
        h.targetFactorOrPathway,
        h.pattern,
        h.matchedSequence,
        h.start,
        h.end,
        h.length,
        h.relativePositionPercent,
        `"${h.description.replace(/"/g, '""')}"`,
      ].join('\t')
    );

    const tsvContent = [header, ...rows].join('\n');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'lncRNA').replace(/\s+/g, '_')}_discovered_motifs.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Append IUPAC code to custom input
  const insertIupacCode = (code: string) => {
    setCustomPattern((prev) => prev + code);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[11px] font-bold rounded-md flex items-center gap-1">
              <Compass className="w-3 h-3 text-violet-600" />
              Motif Architecture
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Conserved Regulatory Motif Discovery Engine
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Discovers stress-responsive cis-acting elements (DRE/CRT, ABRE, W-box, HSE, MBS), RNA decay signals (ARE, PAS), and miRNA decoy seed matches via IUPAC pattern matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportFasta && (
            <button
              onClick={onExportFasta}
              className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export FASTA with biophysical properties"
            >
              <FileDown className="w-3.5 h-3.5 text-violet-600" />
              <span>Export FASTA</span>
            </button>
          )}

          <button
            onClick={handleExportTsv}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download Discovered Motifs as TSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export TSV</span>
          </button>
        </div>
      </div>

      {/* Summary Scorecard Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
          <div className="text-slate-500 text-[11px]">Transcript Length</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{cleanSeq.length} nt</div>
        </div>
        <div className="bg-violet-50/80 border border-violet-200 rounded-lg p-2.5 text-center">
          <div className="text-violet-800 text-[11px] font-medium">Total Motif Hits</div>
          <div className="font-mono font-bold text-violet-700 text-sm mt-0.5">
            {discoveryResult.totalHitsCount}
          </div>
        </div>
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center">
          <div className="text-blue-800 text-[11px] font-medium">Abiotic Stress Hits</div>
          <div className="font-mono font-bold text-blue-700 text-sm mt-0.5">
            {discoveryResult.categoryCounts['Abiotic Stress']}
          </div>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
          <div className="text-emerald-800 text-[11px] font-medium">Biotic Defense Hits</div>
          <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
            {discoveryResult.categoryCounts['Biotic Defense']}
          </div>
        </div>
        <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-2.5 text-center">
          <div className="text-purple-800 text-[11px] font-medium">RNA Stability / PAS</div>
          <div className="font-mono font-bold text-purple-700 text-sm mt-0.5">
            {discoveryResult.categoryCounts['RNA Processing & Stability']}
          </div>
        </div>
        <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-2.5 text-center">
          <div className="text-sky-800 text-[11px] font-medium">miRNA Seeds & G4</div>
          <div className="font-mono font-bold text-sky-700 text-sm mt-0.5">
            {discoveryResult.categoryCounts['miRNA Target Seed'] + discoveryResult.categoryCounts['RBP & Structural Hub']}
          </div>
        </div>
      </div>

      {/* View Switcher: D3 Multi-Track Architecture Viewer vs Compact Track */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTrackMode('d3-multitrack')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              trackMode === 'd3-multitrack'
                ? 'bg-white text-blue-700 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>D3 Graphical Sequence & Motif Viewer (Multi-Track)</span>
          </button>
          <button
            type="button"
            onClick={() => setTrackMode('compact-bar')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              trackMode === 'compact-bar'
                ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Linear Map</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {trackMode === 'd3-multitrack'
            ? 'Interactive D3 zoom, staggered non-overlapping lanes, base tiles & plant stress conservation'
            : 'Compact 5\' -> 3\' transcript overview'}
        </span>
      </div>

      {/* Track Viewport: Either D3 Multi-Track or Compact Linear Track */}
      {trackMode === 'd3-multitrack' ? (
        <D3SequenceMotifViewer
          sequence={cleanSeq}
          name={name}
          motifs={discoveryResult.hits}
          conservationProfile={discoveryResult.conservationProfile}
          selectedMotifId={selectedHitId}
          onSelectMotif={(hit) => {
            setSelectedHitId(hit?.hitId || null);
            if (hit) {
              setExpandedHitId(hit.hitId);
            }
          }}
        />
      ) : (
        /* Linear Transcript Motif Map (Interactive Track) */
        <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Transcript Linear Architecture Map (5' &rarr; 3')
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                1 - {cleanSeq.length} nt
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span>Abiotic</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Biotic</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span>ARE/PAS</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                <span>miRNA</span>
              </div>
            </div>
          </div>

          {/* Proportional Linear Track */}
          <div className="relative pt-6 pb-4 px-2">
            {/* Track Bar Background */}
            <div className="h-2.5 bg-slate-800 rounded-full w-full relative border border-slate-700/80">
              {/* Position Ticks */}
              <div className="absolute -bottom-4 left-0 text-[10px] text-slate-500 font-mono">1 nt</div>
              <div className="absolute -bottom-4 left-1/4 -translate-x-1/2 text-[10px] text-slate-600 font-mono">
                {Math.round(cleanSeq.length * 0.25)}
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-mono">
                {Math.round(cleanSeq.length * 0.5)}
              </div>
              <div className="absolute -bottom-4 left-3/4 -translate-x-1/2 text-[10px] text-slate-600 font-mono">
                {Math.round(cleanSeq.length * 0.75)}
              </div>
              <div className="absolute -bottom-4 right-0 text-[10px] text-slate-500 font-mono">
                {cleanSeq.length} nt
              </div>

              {/* Motif Markers */}
              {discoveryResult.hits.map((hit) => {
                const leftPercent = Math.max(1, Math.min(99, hit.relativePositionPercent));
                const isSelected = selectedHitId === hit.hitId;

                // Color mapping
                let markerColor = 'bg-blue-400 border-blue-200';
                if (hit.category === 'Biotic Defense') markerColor = 'bg-emerald-400 border-emerald-200';
                if (hit.category === 'RNA Processing & Stability') markerColor = 'bg-red-400 border-red-200';
                if (hit.category === 'miRNA Target Seed') markerColor = 'bg-sky-400 border-sky-200';
                if (hit.category === 'RBP & Structural Hub') markerColor = 'bg-violet-400 border-violet-200';
                if (hit.category === 'Custom User Motif') markerColor = 'bg-amber-400 border-amber-200';

                return (
                  <button
                    key={hit.hitId}
                    type="button"
                    onClick={() => setSelectedHitId(hit.hitId === selectedHitId ? null : hit.hitId)}
                    style={{ left: `${leftPercent}%` }}
                    className={`absolute -top-3.5 -translate-x-1/2 w-4 h-9 flex flex-col items-center group cursor-pointer transition-all z-10 ${
                      isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                    }`}
                    title={`${hit.motifName} (${hit.start}-${hit.end} nt): ${hit.matchedSequence}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border shadow-xs transition-all ${markerColor} ${
                        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 animate-pulse' : ''
                      }`}
                    />
                    <div className="w-0.5 h-4 bg-slate-600 group-hover:bg-white transition-colors mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Marker Callout */}
          {selectedHit ? (
            <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">{selectedHit.motifName}</span>
                  <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-mono">
                    {selectedHit.category}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    pos {selectedHit.start} - {selectedHit.end} nt ({selectedHit.length} nt)
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Target / Role:</span> {selectedHit.targetFactorOrPathway} &bull;{' '}
                  <span className="text-slate-400">Sequence:</span>{' '}
                  <span className="font-mono text-amber-300 font-bold bg-slate-900/60 px-1 py-0.5 rounded">
                    {selectedHit.matchedSequence}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHitId(null)}
                className="text-xs text-slate-400 hover:text-white underline shrink-0 cursor-pointer"
              >
                Clear Focus
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">
              Click any pin marker above to inspect its exact nucleotide coordinates, target regulatory factor, and sequence.
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Motifs ({discoveryResult.totalHitsCount})
          </button>
          <button
            onClick={() => setActiveCategory('Abiotic Stress')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'Abiotic Stress'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Abiotic Stress ({discoveryResult.categoryCounts['Abiotic Stress']})
          </button>
          <button
            onClick={() => setActiveCategory('Biotic Defense')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'Biotic Defense'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Biotic Defense ({discoveryResult.categoryCounts['Biotic Defense']})
          </button>
          <button
            onClick={() => setActiveCategory('RNA Processing & Stability')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'RNA Processing & Stability'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            Stability & PAS ({discoveryResult.categoryCounts['RNA Processing & Stability']})
          </button>
          <button
            onClick={() => setActiveCategory('miRNA Target Seed')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCategory === 'miRNA Target Seed'
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            miRNA Seeds ({discoveryResult.categoryCounts['miRNA Target Seed']})
          </button>
          {userCustomMotifs.length > 0 && (
            <button
              onClick={() => setActiveCategory('Custom User Motif')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeCategory === 'Custom User Motif'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              Custom ({discoveryResult.categoryCounts['Custom User Motif']})
            </button>
          )}
        </div>

        {/* Search input & Custom toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter motifs or sequence..."
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-48 sm:w-56 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCustomPanelOpen(!isCustomPanelOpen)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-300 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Custom Motif</span>
          </button>
        </div>
      </div>

      {/* Collapsible Custom Motif Pattern Tool */}
      {isCustomPanelOpen && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Define Custom Candidate Sequence Motif</span>
            </h4>
            <span className="text-[11px] text-slate-500">Supports IUPAC Degeneracy Codes & Regex</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Motif Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Novel Drought Box"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Pattern (IUPAC / RNA)</label>
              <input
                type="text"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value.toUpperCase())}
                placeholder="e.g. RCCGAC or UUGAC[CU]"
                className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded bg-white uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Target Factor / Pathway</label>
              <input
                type="text"
                value={customFactor}
                onChange={(e) => setCustomFactor(e.target.value)}
                placeholder="e.g. bZIP / Rice Immunity"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddCustomMotif}
                disabled={!customPattern.trim()}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Scan Custom Motif</span>
              </button>
            </div>
          </div>

          {/* IUPAC Quick-Insert Helper Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500 font-semibold mr-1">Insert IUPAC:</span>
            {[
              { code: 'R', desc: 'A/G (puRine)' },
              { code: 'Y', desc: 'C/U (pYrimidine)' },
              { code: 'S', desc: 'G/C (Strong)' },
              { code: 'W', desc: 'A/U (Weak)' },
              { code: 'K', desc: 'G/U (Keto)' },
              { code: 'M', desc: 'A/C (aMino)' },
              { code: 'N', desc: 'A/C/G/U (aNy)' },
            ].map(({ code, desc }) => (
              <button
                key={code}
                type="button"
                onClick={() => insertIupacCode(code)}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded text-slate-700 font-mono font-bold transition-colors cursor-pointer"
                title={desc}
              >
                {code} <span className="font-normal text-[10px] text-slate-500">({desc.split(' ')[0]})</span>
              </button>
            ))}
          </div>

          {/* Active Custom Motifs List */}
          {userCustomMotifs.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-[11px] font-semibold text-slate-700 mb-1">
                Active Custom Patterns ({userCustomMotifs.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {userCustomMotifs.map((cm) => (
                  <span
                    key={cm.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 rounded text-xs text-indigo-900 font-medium"
                  >
                    <span>{cm.name}</span>
                    <code className="text-indigo-600 font-mono font-bold">[{cm.pattern}]</code>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomMotif(cm.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                      title="Remove custom motif"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discovered Motifs Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Motif Name & Target</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Consensus (IUPAC)</th>
                <th className="py-2.5 px-3">Matched Sequence</th>
                <th className="py-2.5 px-3 text-center">Positions (5' &rarr; 3')</th>
                <th className="py-2.5 px-3 text-center">Rel. Position</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredHits.length > 0 ? (
                filteredHits.map((hit) => {
                  const isExpanded = expandedHitId === hit.hitId;
                  const isFocused = selectedHitId === hit.hitId;

                  return (
                    <React.Fragment key={hit.hitId}>
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isFocused
                            ? 'bg-amber-50/70 font-medium'
                            : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => setSelectedHitId(hit.hitId === selectedHitId ? null : hit.hitId)}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${hit.colorBadge.dot}`} />
                            <span>{hit.motifName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {hit.targetFactorOrPathway}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${hit.colorBadge.bg} ${hit.colorBadge.text} ${hit.colorBadge.border}`}
                          >
                            {hit.category}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                          {hit.pattern}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            {hit.matchedSequence}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {hit.start} &ndash; {hit.end} nt
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {hit.relativePositionPercent}%
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(hit.matchedSequence, hit.hitId)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Copy matched sequence"
                            >
                              {copiedHitSeq === hit.hitId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedHitId(isExpanded ? null : hit.hitId)}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
                              title="Toggle biological mechanism details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row with Biological Significance */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 text-xs space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Biological Description</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {hit.description}
                                </p>
                              </div>

                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Stress Adaptation Significance</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {hit.significance}
                                </p>
                              </div>

                              <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Mechanism in Crop Immunity</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {hit.biologicalContext}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                    No regulatory motif hits found matching the current filters. Try selecting "All Motifs" or define a custom pattern above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* De Novo K-mer Oligomer Frequency Analysis */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>De Novo Repeated K-mer Frequency Analysis</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Identifies overrepresented short words across the query transcript to reveal unannotated repeat hubs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Word Length (k):</span>
            {[4, 5, 6].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedK(k)}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  selectedK === k
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {k}-mer
              </button>
            ))}
          </div>
        </div>

        {kmerHits.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {kmerHits.map((kh) => (
              <div
                key={kh.kmer}
                onClick={() => {
                  setCustomName(`${selectedK}-mer (${kh.kmer})`);
                  setCustomPattern(kh.kmer);
                  setIsCustomPanelOpen(true);
                }}
                className="bg-white border border-slate-200 rounded-lg p-2.5 text-center hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group"
                title={`Click to test ${kh.kmer} as custom regulatory motif`}
              >
                <div className="font-mono font-bold text-slate-900 group-hover:text-amber-700 text-xs">
                  {kh.kmer}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  <span className="font-semibold text-emerald-700">{kh.count}x</span> ({kh.frequencyPercent}%)
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  GC: {kh.gcPercent}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic text-center py-2">
            Sequence is too short or uniform for {selectedK}-mer repeat enrichment analysis.
          </div>
        )}
      </div>
    </div>
  );
};
