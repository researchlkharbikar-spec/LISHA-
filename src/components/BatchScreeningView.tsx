/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Batch Screening Engine View
 * Automated sequential screening of multiple plant stress lncRNA candidates
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Play,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Thermometer,
  Layers,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Sparkles,
  Info,
  X,
  Filter,
} from 'lucide-react';
import {
  parseBatchSequenceInput,
  screenBatchSequences,
  calculateBatchSummary,
  exportBatchToCsv,
  exportBatchToMultiFasta,
  type BatchInputRecord,
  type BatchScreeningItem,
  type BatchScreeningSummary,
} from '../utils/batchScreening';
import { CURATED_LNCRNAS } from '../data/curatedLncRNAs';

interface BatchScreeningViewProps {
  onSelectSequenceForDetailedScreening?: (sequence: string, name: string) => void;
  onRequestGeminiInterpretation?: (prompt: string, title: string) => void;
}

export const BatchScreeningView: React.FC<BatchScreeningViewProps> = ({
  onSelectSequenceForDetailedScreening,
  onRequestGeminiInterpretation,
}) => {
  // Input states
  const [inputText, setInputText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressIndex, setProgressIndex] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentProcessingName, setCurrentProcessingName] = useState<string>('');
  const [results, setResults] = useState<BatchScreeningItem[]>([]);
  const cancelExecutionRef = useRef<boolean>(false);

  // Table filtering & sorting states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stabilityFilter, setStabilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'length' | 'tm' | 'mfe' | 'similarity' | 'gc'>('similarity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Detail Modal inspection
  const [inspectedItem, setInspectedItem] = useState<BatchScreeningItem | null>(null);
  const [copiedSeq, setCopiedSeq] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Load benchmark dataset
  // Load benchmark datasets
  const handleLoadBenchmark = () => {
    const fastaLines: string[] = [];
    CURATED_LNCRNAS.forEach((lnc) => {
      fastaLines.push(`>${lnc.name} [${lnc.species}] ${lnc.diseaseName} (${lnc.pathogen})`);
      fastaLines.push(lnc.sequence);
    });

    // Add 2 realistic synthetic agricultural lncRNA candidates
    fastaLines.push(`>DROUGHT-DR1 [Triticum aestivum] Dehydration Response Element Candidate`);
    fastaLines.push(`GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA`);
    fastaLines.push(`>SALINITY-SALT9 [Hordeum vulgare] Salt Tolerance Putative lncRNA`);
    fastaLines.push(`AUGGCCUUGGAUCCGCUUAAGCCUUGGAGGAUCCGCUGGAUCCGCUUAAGCCUUGGAUCCGCU`);

    setInputText(fastaLines.join('\n'));
  };

  const handleLoadAbioticBenchmark = () => {
    const lines = [
      `>DROUGHT-RESP1 [Zea mays] Maize Drought Stress Response lncRNA Candidate`,
      `GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA`,
      `>HEAT-SHOCK-LNC3 [Arabidopsis thaliana] Heat Stress Thermotolerance Transcript`,
      `AUGGCCUUGGAUCCGCUUAAGCCUUGGAGGAUCCGCUGGAUCCGCUUAAGCCUUGGAUCCGCU`,
      `>COLD-IND-LNCRNA [Oryza sativa indica] Low Temperature Chilling Responsive`,
      `UUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGAUUCCGCGCGGCC`,
      `>SALINITY-SALT9 [Hordeum vulgare] High Salinity Osmotic Adaptation Candidate`,
      `AUGGCCUUGGAUCCGCUUAAGCCUUGGAGGAUCCGCUGGAUCCGCUUAAGCCUUGGAUCCGCU`,
    ];
    setInputText(lines.join('\n'));
  };

  const handleLoadCsvExample = () => {
    const csvLines = [
      `Name,Sequence,Species,Notes`,
      `ALEX1_Rice,GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA,Oryza sativa,Bacterial Blight Xanthomonas`,
      `lncRNA-Rsm1_Rice,AUGGCCUUGGAUCCGCUUAAGCCUUGGAGGAUCCGCUGGAUCCGCUUAAGCCUUGGAUCCGCU,Oryza sativa,Rice Blast Magnaporthe`,
      `ELENA1_Arabidopsis,AAAAAGGGGGGAAAAAAAGGGGGGTTTTTCCCCCCAAAAAGGGGGGAAAAAAAGGGGGGTTTTT,Arabidopsis thaliana,Pathogen defense PR1 triplex`,
      `lncRNA16397_Tomato,GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA,Solanum lycopersicum,Late Blight Phytophthora`,
    ];
    setInputText(csvLines.join('\n'));
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    setProgressIndex(0);
    setTotalCount(0);
    setCurrentProcessingName('');
  };

  // File drag & drop or file selection
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Run automated sequential screening
  const handleRunBatchScreening = async () => {
    const records = parseBatchSequenceInput(inputText);
    if (records.length === 0) return;

    cancelExecutionRef.current = false;
    setIsRunning(true);
    setTotalCount(records.length);
    setProgressIndex(0);
    setResults([]);

    const screenedItems = await screenBatchSequences(
      records,
      (current: number, _total: number, item: BatchScreeningItem) => {
        if (cancelExecutionRef.current) return;
        setProgressIndex(current);
        setCurrentProcessingName(item.name);
        setResults((prev) => [...prev, item]);
      }
    );

    if (!cancelExecutionRef.current) {
      setResults(screenedItems);
    }
    setIsRunning(false);
  };

  const handleCancelScreening = () => {
    cancelExecutionRef.current = true;
    setIsRunning(false);
  };

  // Summary statistics calculation
  const summary: BatchScreeningSummary | null = useMemo(() => {
    if (results.length === 0) return null;
    return calculateBatchSummary(results);
  }, [results]);

  // Filtered and sorted items
  const filteredAndSortedResults = useMemo(() => {
    return results
      .filter((item) => {
        // Search filter
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matchName = item.name.toLowerCase().includes(s);
          const matchSeq = item.cleanedSequence.toLowerCase().includes(s);
          const matchTemplate = item.topHomologyTemplate.toLowerCase().includes(s);
          const matchDisease = item.topHomologyDisease.toLowerCase().includes(s);
          if (!matchName && !matchSeq && !matchTemplate && !matchDisease) {
            return false;
          }
        }

        // Stability filter
        if (stabilityFilter !== 'all') {
          if (stabilityFilter === 'invalid' && item.isValid) return false;
          if (stabilityFilter === 'hyper' && !item.stabilityCategory.toLowerCase().includes('hyper')) return false;
          if (stabilityFilter === 'standard' && !item.stabilityCategory.toLowerCase().includes('standard')) return false;
          if (stabilityFilter === 'labile' && !item.stabilityCategory.toLowerCase().includes('labile')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') diff = a.name.localeCompare(b.name);
        else if (sortBy === 'length') diff = a.length - b.length;
        else if (sortBy === 'tm') diff = a.tmSaltAdjusted - b.tmSaltAdjusted;
        else if (sortBy === 'mfe') diff = a.mfeKcal - b.mfeKcal;
        else if (sortBy === 'similarity') diff = a.topSimilarityPercent - b.topSimilarityPercent;
        else if (sortBy === 'gc') diff = a.gcPercent - b.gcPercent;

        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [results, searchTerm, stabilityFilter, sortBy, sortDirection]);

  // Export handlers
  const handleDownloadCsv = () => {
    if (results.length === 0) return;
    const csvData = exportBatchToCsv(results);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lisha_batch_screening_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFasta = () => {
    if (results.length === 0) return;
    const fastaData = exportBatchToMultiFasta(results);
    const blob = new Blob([fastaData], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lisha_batch_annotated_${Date.now()}.fasta`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsvClipboard = () => {
    if (results.length === 0) return;
    const csvData = exportBatchToCsv(results);
    navigator.clipboard.writeText(csvData);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const parsedPreviewCount = useMemo(() => {
    if (!inputText.trim()) return 0;
    return parseBatchSequenceInput(inputText).length;
  }, [inputText]);

  return (
    <div className="space-y-6">
      {/* Header & Attribution Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                High-Throughput Mode
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Automated Batch Screening & Sequential Biophysical Assessment
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Upload multiple lncRNA candidates in Multi-FASTA, CSV, or TSV format for rapid automated screening across
              Nearest-Neighbor thermodynamics ($T_m$, $\Delta G^\circ_{37}$), Nussinov 2D fold MFE, conserved regulatory motif patterns, and plant stress homology.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Pre-load:</span>
            <button
              onClick={handleLoadBenchmark}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="6 Curated Plant Stress lncRNAs (Rice, Arabidopsis, Tomato, Wheat, Barley)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plant Stress Batch</span>
            </button>
            <button
              onClick={handleLoadAbioticBenchmark}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Drought, Heat, Cold, and Salinity responsive candidates"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Abiotic Batch</span>
            </button>
            <button
              onClick={handleLoadCsvExample}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Comma-separated format example"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Format</span>
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Input Dropzone & Text Area */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="font-semibold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Input Sequences (Multi-FASTA / CSV / TSV)</span>
              </label>
              <span className="font-mono text-slate-400">
                {parsedPreviewCount} candidate{parsedPreviewCount === 1 ? '' : 's'} detected
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`>lncRNA_candidate_1 [Oryza sativa]\nGGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA\n\n>lncRNA_candidate_2 [Solanum lycopersicum]\nAUGGCCUUGGAUCCGCUUAAGCCUUGGAGGAUCCGCUGGAUCCGCUUAAGCCUUGGAUCCGCU`}
              rows={7}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
            />
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".fasta,.fa,.txt,.csv,.tsv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Drag & Drop Batch File</p>
              <p className="text-[10px] text-slate-400 mt-1">Supports .fasta, .fa, .txt, .csv, .tsv</p>
            </div>

            {/* Run Button */}
            <div>
              {isRunning ? (
                <button
                  onClick={handleCancelScreening}
                  className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Stop Batch Screening</span>
                </button>
              ) : (
                <button
                  onClick={handleRunBatchScreening}
                  disabled={parsedPreviewCount === 0}
                  className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    parsedPreviewCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Automated Screening ({parsedPreviewCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Execution Progress Bar */}
        {isRunning && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Screening in Progress: {currentProcessingName || 'Calculating parameters...'}
              </span>
              <span className="font-mono text-slate-500 font-bold">
                {progressIndex} / {totalCount} ({Math.round((progressIndex / Math.max(1, totalCount)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-150"
                style={{ width: `${Math.round((progressIndex / Math.max(1, totalCount)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Analytics Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Evaluated</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.totalSequences}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {summary.validSequences} Valid / {summary.invalidSequences} Errors
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              <span>Mean NN Tm</span>
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.averageTm}°C</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Salt-adjusted nearest-neighbor</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Mean GC%</span>
            </span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.averageGcPercent}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Avg Length: {summary.averageLength} nt</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Mean 2D Fold MFE</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{summary.averageMfeKcal}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">kcal/mol minimum free energy</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>Stability Profile</span>
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {summary.hyperStableCount} Hyper / {summary.standardStableCount} Std
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{summary.labileCount} Labile (Tm &lt; 50°C)</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Dominant Stress</span>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={summary.dominantStressCategory}>
              {summary.dominantStressCategory}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Top Homology Alignment</div>
          </div>
        </div>
      )}

      {/* Results Workspace */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Action Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, disease, sequence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Stability Category Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={stabilityFilter}
                  onChange={(e) => setStabilityFilter(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">All Stabilities</option>
                  <option value="hyper">Hyper-Stable (&gt;75°C)</option>
                  <option value="standard">Standard Stable</option>
                  <option value="labile">Labile (&lt;50°C)</option>
                  <option value="invalid">Invalid Only</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="similarity">Sort: Homology Similarity</option>
                  <option value="tm">Sort: NN Tm (°C)</option>
                  <option value="mfe">Sort: 2D Fold MFE</option>
                  <option value="gc">Sort: GC Content</option>
                  <option value="length">Sort: Length</option>
                  <option value="name">Sort: Name</option>
                </select>
                <button
                  onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-100 text-slate-700"
                  title="Toggle Ascending/Descending"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCsv}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleDownloadFasta}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Annotated FASTA</span>
              </button>
              <button
                onClick={handleCopyCsvClipboard}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                title="Copy CSV to clipboard"
              >
                {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Sequence Name</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Length</th>
                  <th className="py-3 px-3">GC%</th>
                  <th className="py-3 px-3">NN Tm (°C)</th>
                  <th className="py-3 px-3">ΔG°37</th>
                  <th className="py-3 px-3">2D MFE</th>
                  <th className="py-3 px-3">Top Stress Homology</th>
                  <th className="py-3 px-3">Motifs</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredAndSortedResults.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 max-w-[220px]">
                      <div className="font-semibold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        {item.cleanedSequence.slice(0, 24)}...
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Valid</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                          title={item.validationError || 'Invalid characters'}
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Invalid</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{item.length} nt</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700">{item.gcPercent}%</span>
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, item.gcPercent)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{item.tmSaltAdjusted}°C</span>
                        {item.tmSaltAdjusted >= 75 ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            Hyper
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {item.freeEnergyDeltaG37} <span className="text-[10px] text-slate-400">kcal/mol</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px]">
                      <span className="font-semibold text-indigo-700">{item.mfeKcal}</span> kcal/mol
                      <div className="text-[10px] text-slate-400">{item.basePairsCount} bp</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="font-semibold text-slate-800 truncate" title={item.topHomologyTemplate}>
                        {item.topHomologyTemplate}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="text-emerald-700 font-bold">{item.topSimilarityPercent}% Sim</span>
                        <span>•</span>
                        <span className="truncate">{item.topHomologyDisease}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                        {item.motifHitsCount} motifs
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectedItem(item)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View Full Biophysical Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onSelectSequenceForDetailedScreening && item.isValid && (
                          <button
                            onClick={() => onSelectSequenceForDetailedScreening(item.cleanedSequence, item.name)}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Load into Single Sequence Engine (Modules 1-8)"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Item Inspection Modal */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Screening Summary Card
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{inspectedItem.name}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  Length: {inspectedItem.length} nt | GC: {inspectedItem.gcPercent}% | AU: {inspectedItem.auPercent}%
                </p>
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Biophysical Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">NN Tm (Salt-Adj)</span>
                <div className="text-base font-extrabold text-slate-900">{inspectedItem.tmSaltAdjusted}°C</div>
                <div className="text-[10px] text-slate-500">{inspectedItem.stabilityCategory}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Gibbs ΔG°37</span>
                <div className="text-base font-extrabold text-slate-900">{inspectedItem.freeEnergyDeltaG37}</div>
                <div className="text-[10px] text-slate-500">kcal/mol</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">2D Fold MFE</span>
                <div className="text-base font-extrabold text-slate-900">{inspectedItem.mfeKcal}</div>
                <div className="text-[10px] text-slate-500">{inspectedItem.basePairsCount} base pairs</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Homology Match</span>
                <div className="text-base font-extrabold text-slate-900">{inspectedItem.topSimilarityPercent}%</div>
                <div className="text-[10px] text-slate-500 truncate">{inspectedItem.topHomologyTemplate}</div>
              </div>
            </div>

            {/* Dot-Bracket Secondary Structure View */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Secondary Structure (Dot-Bracket Notation):</span>
              <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-lg overflow-x-auto select-all">
                {inspectedItem.dotBracket || 'No structure available'}
              </div>
            </div>

            {/* Sequence with Copy Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Cleaned RNA Sequence:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inspectedItem.cleanedSequence);
                    setCopiedSeq(true);
                    setTimeout(() => setCopiedSeq(false), 2000);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {copiedSeq ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSeq ? 'Copied' : 'Copy Sequence'}</span>
                </button>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs break-all text-slate-700 max-h-32 overflow-y-auto">
                {inspectedItem.cleanedSequence}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Close
              </button>
              {onSelectSequenceForDetailedScreening && inspectedItem.isValid && (
                <button
                  onClick={() => {
                    onSelectSequenceForDetailedScreening(inspectedItem.cleanedSequence, inspectedItem.name);
                    setInspectedItem(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Load into Single Sequence Engine</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
