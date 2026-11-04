/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Curated Knowledgebase Browser
 */

import React, { useState } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  ExternalLink,
  Bookmark,
  Dna,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  RotateCcw,
  X,
  SlidersHorizontal,
  Activity,
  ArrowUpDown,
} from 'lucide-react';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';

interface DatabaseBrowserProps {
  onSelectForScreening: (lncRna: CuratedLncRNA) => void;
  onBookmarkLncRNA: (lncRna: CuratedLncRNA) => void;
  bookmarkedIds?: string[];
}

export const DatabaseBrowser: React.FC<DatabaseBrowserProps> = ({
  onSelectForScreening,
  onBookmarkLncRNA,
  bookmarkedIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [interactionFilter, setInteractionFilter] = useState('All');
  const [lengthFilter, setLengthFilter] = useState<'all' | 'short' | 'medium' | 'long' | 'custom'>('all');
  const [minCustomLength, setMinCustomLength] = useState<number>(0);
  const [maxCustomLength, setMaxCustomLength] = useState<number>(2000);
  const [pathogenFilter, setPathogenFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'default' | 'length-asc' | 'length-desc' | 'name-asc'>('default');
  const [selectedRecord, setSelectedRecord] = useState<CuratedLncRNA | null>(null);

  // Derived filter counts for species
  const speciesCounts = React.useMemo(() => {
    const counts: Record<string, number> = { All: CURATED_LNCRNAS.length };
    CURATED_LNCRNAS.forEach((item) => {
      counts[item.species] = (counts[item.species] || 0) + 1;
    });
    return counts;
  }, []);

  // Derived filter counts for interaction types
  const interactionCounts = React.useMemo(() => {
    return {
      All: CURATED_LNCRNAS.length,
      protein: CURATED_LNCRNAS.filter((i) => i.interactionType.includes('Protein') || i.interactionType === 'Multi-modal').length,
      mirna: CURATED_LNCRNAS.filter((i) => i.interactionType.includes('miRNA') || i.interactionType === 'Multi-modal').length,
      dna: CURATED_LNCRNAS.filter((i) => i.interactionType.includes('DNA')).length,
      multimodal: CURATED_LNCRNAS.filter((i) => i.interactionType === 'Multi-modal').length,
    };
  }, []);

  // Filter and sort logic
  const filtered = React.useMemo(() => {
    return CURATED_LNCRNAS.filter((item) => {
      // 1. Text Search
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        term === '' ||
        item.name.toLowerCase().includes(term) ||
        item.accession.toLowerCase().includes(term) ||
        item.species.toLowerCase().includes(term) ||
        item.speciesCommon.toLowerCase().includes(term) ||
        item.pathogen.toLowerCase().includes(term) ||
        item.diseaseName.toLowerCase().includes(term) ||
        item.primaryTarget.toLowerCase().includes(term) ||
        item.functionalMechanism.toLowerCase().includes(term) ||
        item.pmid.includes(term);

      // 2. Species Filter
      const matchSpecies = speciesFilter === 'All' || item.species === speciesFilter;

      // 3. Interaction Type Filter (supports miRNA, protein, DNA, multi-modal)
      let matchInteraction = true;
      if (interactionFilter === 'protein') {
        matchInteraction = item.interactionType.includes('Protein') || item.targetType === 'Protein' || item.interactionType === 'Multi-modal';
      } else if (interactionFilter === 'mirna') {
        matchInteraction = item.interactionType.includes('miRNA') || item.targetType === 'miRNA' || item.interactionType === 'Multi-modal';
      } else if (interactionFilter === 'dna') {
        matchInteraction = item.interactionType.includes('DNA') || item.targetType === 'DNA Promoter';
      } else if (interactionFilter === 'Multi-modal') {
        matchInteraction = item.interactionType === 'Multi-modal';
      } else if (interactionFilter !== 'All') {
        matchInteraction = item.interactionType === interactionFilter;
      }

      // 4. Length Filter
      let matchLength = true;
      if (lengthFilter === 'short') {
        matchLength = item.sequenceLength < 650;
      } else if (lengthFilter === 'medium') {
        matchLength = item.sequenceLength >= 650 && item.sequenceLength <= 850;
      } else if (lengthFilter === 'long') {
        matchLength = item.sequenceLength > 850;
      } else if (lengthFilter === 'custom') {
        matchLength = item.sequenceLength >= minCustomLength && item.sequenceLength <= maxCustomLength;
      }

      // 5. Pathogen Filter
      const matchPathogen = pathogenFilter === 'All' || item.pathogenType === pathogenFilter;

      return matchSearch && matchSpecies && matchInteraction && matchLength && matchPathogen;
    }).sort((a, b) => {
      if (sortBy === 'length-asc') return a.sequenceLength - b.sequenceLength;
      if (sortBy === 'length-desc') return b.sequenceLength - a.sequenceLength;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [searchTerm, speciesFilter, interactionFilter, lengthFilter, minCustomLength, maxCustomLength, pathogenFilter, sortBy]);

  const activeFilterCount =
    (speciesFilter !== 'All' ? 1 : 0) +
    (interactionFilter !== 'All' ? 1 : 0) +
    (lengthFilter !== 'all' ? 1 : 0) +
    (pathogenFilter !== 'All' ? 1 : 0) +
    (searchTerm !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSpeciesFilter('All');
    setInteractionFilter('All');
    setLengthFilter('all');
    setMinCustomLength(0);
    setMaxCustomLength(2000);
    setPathogenFilter('All');
    setSortBy('default');
  };

  // Export functions
  const handleExportFASTA = () => {
    const fasta = filtered
      .map((item) => `>${item.accession} | ${item.name} | ${item.species} | ${item.diseaseName}\n${item.sequence}`)
      .join('\n\n');
    const blob = new Blob([fasta], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_lncRNA_database_${new Date().toISOString().slice(0, 10)}.fasta`;
    a.click();
  };

  const handleExportCSV = () => {
    const headers = ['Accession', 'Name', 'Species', 'Pathogen', 'Disease', 'InteractionType', 'Target', 'Length', 'PMID'];
    const rows = filtered.map((i) => [
      i.accession,
      `"${i.name}"`,
      `"${i.species}"`,
      `"${i.pathogen}"`,
      `"${i.diseaseName}"`,
      `"${i.interactionType}"`,
      `"${i.primaryTarget}"`,
      i.sequenceLength,
      i.pmid,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_lncRNA_database_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md">
                Curated Repository
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Plant Biotic Stress lncRNA Knowledgebase
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Curated, peer-reviewed plant lncRNAs with validated molecular interactors, pathogen targets, and physiological biomarker metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFASTA}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export FASTA</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search Input and Quick Interaction Type Filter */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by gene name, accession, pathogen, disease, target or mechanism..."
                className="w-full text-xs pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Interaction Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-600" />
                <span>Interaction:</span>
              </span>

              <button
                type="button"
                onClick={() => setInteractionFilter('All')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  interactionFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({interactionCounts.All})
              </button>

              <button
                type="button"
                onClick={() => setInteractionFilter('mirna')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  interactionFilter === 'mirna'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
                title="Filter by miRNA interactions (ceRNA sponging)"
              >
                <Activity className="w-3 h-3" />
                <span>miRNA ({interactionCounts.mirna})</span>
              </button>

              <button
                type="button"
                onClick={() => setInteractionFilter('protein')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  interactionFilter === 'protein'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Filter by protein interactions (catRAPID / RBM)"
              >
                <Layers className="w-3 h-3" />
                <span>Protein ({interactionCounts.protein})</span>
              </button>

              <button
                type="button"
                onClick={() => setInteractionFilter('dna')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  interactionFilter === 'dna'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
                title="Filter by DNA interactions (Hoogsteen triplex binding)"
              >
                <Dna className="w-3 h-3" />
                <span>DNA ({interactionCounts.dna})</span>
              </button>
            </div>
          </div>

          {/* Secondary Controls: Species, Length, Pathogen, and Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Species Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Plant Species
              </label>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="All">All Species ({speciesCounts.All || CURATED_LNCRNAS.length})</option>
                <option value="Oryza sativa">Oryza sativa (Rice) ({speciesCounts['Oryza sativa'] || 0})</option>
                <option value="Arabidopsis thaliana">Arabidopsis thaliana ({speciesCounts['Arabidopsis thaliana'] || 0})</option>
                <option value="Solanum lycopersicum">Solanum lycopersicum (Tomato) ({speciesCounts['Solanum lycopersicum'] || 0})</option>
                <option value="Triticum aestivum">Triticum aestivum (Wheat) ({speciesCounts['Triticum aestivum'] || 0})</option>
                <option value="Zea mays">Zea mays (Maize) ({speciesCounts['Zea mays'] || 0})</option>
              </select>
            </div>

            {/* Length Filter Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sequence Length
              </label>
              <select
                value={lengthFilter}
                onChange={(e) => setLengthFilter(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="all">All Lengths (500 – 1100+ nt)</option>
                <option value="short">Short (&lt; 650 nt)</option>
                <option value="medium">Medium (650 – 850 nt)</option>
                <option value="long">Long (&gt; 850 nt)</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Pathogen Class */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Pathogen Class
              </label>
              <select
                value={pathogenFilter}
                onChange={(e) => setPathogenFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="All">All Pathogen Classes</option>
                <option value="Fungus">Fungal Pathogens (Blast, Rust, Gray Mold)</option>
                <option value="Bacterium">Bacterial Pathogens (Blight, Speck)</option>
                <option value="Oomycete">Oomycetes (Late Blight)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sort Records
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="default">Default Order</option>
                <option value="length-asc">Length: Shortest to Longest</option>
                <option value="length-desc">Length: Longest to Shortest</option>
                <option value="name-asc">Name: Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Custom Length Range Inputs if selected */}
          {lengthFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs">
              <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                Custom Length Range:
              </span>
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium">Min (nt):</label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={50}
                  value={minCustomLength}
                  onChange={(e) => setMinCustomLength(Math.max(0, Number(e.target.value)))}
                  className="w-20 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium">Max (nt):</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={50}
                  value={maxCustomLength}
                  onChange={(e) => setMaxCustomLength(Math.max(minCustomLength, Number(e.target.value)))}
                  className="w-20 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-mono"
                />
              </div>
              <span className="text-slate-500 text-[11px]">
                Showing sequences between {minCustomLength} and {maxCustomLength} nt
              </span>
            </div>
          )}

          {/* Active Filter Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-700">
                Showing <strong className="text-slate-900">{filtered.length}</strong> of{' '}
                <strong className="text-slate-900">{CURATED_LNCRNAS.length}</strong> plant lncRNAs
              </span>

              {/* Active Filter Badges */}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-200 text-slate-800">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {speciesFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-800">
                  Species: {speciesFilter}
                  <button onClick={() => setSpeciesFilter('All')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interactionFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800">
                  Interaction: {interactionFilter}
                  <button onClick={() => setInteractionFilter('All')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {lengthFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-purple-100 text-purple-800">
                  Length:{' '}
                  {lengthFilter === 'short'
                    ? '<650 nt'
                    : lengthFilter === 'medium'
                    ? '650–850 nt'
                    : lengthFilter === 'long'
                    ? '>850 nt'
                    : `${minCustomLength}-${maxCustomLength} nt`}
                  <button onClick={() => setLengthFilter('all')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {pathogenFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                  Pathogen: {pathogenFilter}
                  <button onClick={() => setPathogenFilter('All')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State when no results match */}
      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Matching Plant lncRNAs Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No curated lncRNAs match your current combination of search keywords, species, length brackets, or interaction filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters & Show All Records</span>
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const isBookmarked = bookmarkedIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {item.accession}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs italic text-slate-600">
                      {item.species} ({item.speciesCommon})
                    </p>
                  </div>

                  <button
                    onClick={() => onBookmarkLncRNA(item)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isBookmarked
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'text-slate-400 hover:text-amber-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={isBookmarked ? 'Bookmarked' : 'Add to Bookmarks'}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {item.interactionType}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.pathogenType}: {item.pathogen}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <Dna className="w-3 h-3 text-indigo-600" />
                    {item.sequenceLength} nt
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">
                  {item.functionalMechanism}
                </p>

                {/* Biomarker signature pills */}
                <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1 font-mono border border-slate-100">
                  <div className="text-slate-500">
                    Target: <span className="font-bold text-slate-800">{item.primaryTarget}</span>
                  </div>
                  <div className="text-slate-500">
                    Peak Induction:{' '}
                    <span className="font-bold text-emerald-700">
                      {item.earlyDetectionBiomarker.peakInductionHpi} hpi (+{item.earlyDetectionBiomarker.expectedLog2FC} Log2FC)
                    </span>
                  </div>
                  <div className="text-slate-500 truncate">
                    Thermal Signature:{' '}
                    <span className="font-bold text-red-600">{item.earlyDetectionBiomarker.canopyDeltaTChange}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  <span>PMID: {item.pmid}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => onSelectForScreening(item)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>Screen in Engine</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
