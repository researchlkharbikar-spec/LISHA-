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
  const [pathogenFilter, setPathogenFilter] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<CuratedLncRNA | null>(null);

  // Filter logic
  const filtered = CURATED_LNCRNAS.filter((item) => {
    const matchSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accession.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pathogen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.diseaseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.primaryTarget.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSpecies = speciesFilter === 'All' || item.species === speciesFilter;
    const matchInteraction = interactionFilter === 'All' || item.interactionType === interactionFilter;
    const matchPathogen = pathogenFilter === 'All' || item.pathogenType === pathogenFilter;

    return matchSearch && matchSpecies && matchInteraction && matchPathogen;
  });

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

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by gene, pathogen, rice blast, JA..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="All">All Species (Rice, Arabidopsis, Tomato, Wheat, Corn)</option>
              <option value="Oryza sativa">Oryza sativa (Rice)</option>
              <option value="Arabidopsis thaliana">Arabidopsis thaliana</option>
              <option value="Solanum lycopersicum">Solanum lycopersicum (Tomato)</option>
              <option value="Triticum aestivum">Triticum aestivum (Wheat)</option>
              <option value="Zea mays">Zea mays (Maize)</option>
            </select>
          </div>

          <div>
            <select
              value={interactionFilter}
              onChange={(e) => setInteractionFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="All">All Interaction Types</option>
              <option value="lncRNA-Protein">lncRNA-Protein</option>
              <option value="lncRNA-miRNA">lncRNA-miRNA (ceRNA)</option>
              <option value="lncRNA-DNA">lncRNA-DNA (Triplex)</option>
              <option value="Multi-modal">Multi-modal</option>
            </select>
          </div>

          <div>
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
        </div>
      </div>

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
