/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Computational Interaction Screening Engine
 */

import React, { useState, useMemo } from 'react';
import {
  Dna,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Grid,
  Edit3,
  Thermometer,
  Flame,
  Eye,
  Sliders,
  FileDown,
  Compass,
} from 'lucide-react';
import { HomologyComparisonMatrix } from './HomologyComparisonMatrix';
import { VisualSequenceViewer } from './VisualSequenceViewer';
import { ThermophysicalCalculator } from './ThermophysicalCalculator';
import { SecondaryStructureView } from './SecondaryStructureView';
import { MotifDiscoveryViewer } from './MotifDiscoveryViewer';
import { FastaExportModal } from './FastaExportModal';
import {
  validateLncRnaSequence,
  sanitizeToRnaSequence,
  type SequenceValidationResult,
} from '../utils/sequenceValidator';
import {
  cleanSequence,
  cleanDnaSequence,
  smithWatermanAlign,
  needlemanWunschAlign,
  predictRnaSecondaryStructure,
  screenLncRnaProteinInteraction,
  screenLncRnaMiRnaInteraction,
  screenLncRnaDnaTriplex,
  type ProteinInteractionResult,
  type MiRnaTargetResult,
  type DnaTriplexResult,
  type SecondaryStructureResult,
  type AlignmentResult,
} from '../utils/bioCalculations';
import { CURATED_LNCRNAS } from '../data/curatedLncRNAs';

interface ScreeningEngineProps {
  onSaveAnalysis?: (record: {
    title: string;
    lncRnaName: string;
    lncRnaSequence: string;
    interactionType: string;
    targetName: string;
    score: number;
    summary: string;
  }) => void;
  onRequestGeminiInterpretation?: (prompt: string, title: string) => void;
  prefillLncRna?: { name: string; sequence: string } | null;
}

export type ScreeningModuleType =
  | 'protein'
  | 'mirna'
  | 'dna'
  | 'homology'
  | 'visual-seq'
  | 'thermodynamics'
  | 'structure'
  | 'motifs';

export const ScreeningEngine: React.FC<ScreeningEngineProps> = ({
  onSaveAnalysis,
  onRequestGeminiInterpretation,
  prefillLncRna,
}) => {
  const [activeModule, setActiveModule] = useState<ScreeningModuleType>('protein');

  // Input states
  const [lncRnaName, setLncRnaName] = useState(prefillLncRna?.name || 'ALEX1 (Oryza sativa)');
  const [lncRnaSeq, setLncRnaSeq] = useState(
    prefillLncRna?.sequence || CURATED_LNCRNAS[0].sequence
  );

  // Target inputs
  const [proteinName, setProteinName] = useState('OsJAZ1 (Jasmonate ZIM Domain Protein)');
  const [proteinSeq, setProteinSeq] = useState('MKVVVRGFGFVEELLKKLAKRKKLLMKVVEERRGGAKRAVRRRKKAK');

  const [mirnaName, setMirnaName] = useState('osa-miR166');
  const [mirnaSeq, setMirnaSeq] = useState('UCGGACCAGGCUUCAUUCCCC');

  const [dnaTargetName, setDnaTargetName] = useState('AtPR1 Defense Gene Promoter (-320bp)');
  const [dnaSeq, setDnaSeq] = useState('AAAAAGGGGGGAAAAAAAGGGGGGTTTTTCCCCCC');

  const [homologySubjectName, setHomologySubjectName] = useState('lncRNA-Rsm1 (Homology Candidate)');
  const [homologySubjectSeq, setHomologySubjectSeq] = useState(CURATED_LNCRNAS[1].sequence);
  const [alignmentType, setAlignmentType] = useState<'local' | 'global'>('local');
  const [homologyViewMode, setHomologyViewMode] = useState<'matrix' | 'pairwise'>('matrix');
  const [isQueryEditorOpen, setIsQueryEditorOpen] = useState(false);

  // Results states
  const [proteinResult, setProteinResult] = useState<ProteinInteractionResult | null>(null);
  const [mirnaResults, setMirnaResults] = useState<MiRnaTargetResult[] | null>(null);
  const [triplexResults, setTriplexResults] = useState<DnaTriplexResult[] | null>(null);
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [structureResult, setStructureResult] = useState<SecondaryStructureResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFastaModalOpen, setIsFastaModalOpen] = useState(false);

  // Reactive regex-based sequence validation
  const validationResult: SequenceValidationResult = useMemo(() => {
    return validateLncRnaSequence(lncRnaSeq);
  }, [lncRnaSeq]);

  // Sync prefill if provided
  React.useEffect(() => {
    if (prefillLncRna) {
      setLncRnaName(prefillLncRna.name);
      setLncRnaSeq(prefillLncRna.sequence);
    }
  }, [prefillLncRna]);

  // Run calculation with validation guard
  const handleRunScreening = () => {
    const val = validateLncRnaSequence(lncRnaSeq);
    if (!val.isValid) {
      return;
    }
    const cleanSeq = val.cleanedSequence;

    setIsRunning(true);
    setTimeout(() => {
      // 2D secondary structure for input
      const struct = predictRnaSecondaryStructure(cleanSeq);
      setStructureResult(struct);

      if (activeModule === 'protein') {
        const res = screenLncRnaProteinInteraction(cleanSeq, proteinSeq, proteinName);
        setProteinResult(res);
      } else if (activeModule === 'mirna') {
        const res = screenLncRnaMiRnaInteraction(cleanSeq, mirnaSeq, mirnaName);
        setMirnaResults(res);
      } else if (activeModule === 'dna') {
        const res = screenLncRnaDnaTriplex(cleanSeq, dnaSeq);
        setTriplexResults(res);
      } else if (activeModule === 'homology') {
        const align =
          alignmentType === 'local'
            ? smithWatermanAlign(cleanSeq, homologySubjectSeq)
            : needlemanWunschAlign(cleanSeq, homologySubjectSeq);
        setAlignmentResult(align);
      }
      setIsRunning(false);
    }, 150);
  };

  // Run on mount or module change if valid
  React.useEffect(() => {
    if (validationResult.isValid) {
      handleRunScreening();
    }
  }, [activeModule]);

  // Pre-loaded preset examples
  const loadPreset = (presetKey: string) => {
    if (presetKey === 'alex1') {
      const alex = CURATED_LNCRNAS[0];
      setLncRnaName(alex.name);
      setLncRnaSeq(alex.sequence);
      setActiveModule('protein');
      setProteinName(alex.primaryTarget);
      setProteinSeq(alex.targetSequenceOrMotif);
    } else if (presetKey === 'rsm1') {
      const rsm1 = CURATED_LNCRNAS[1];
      setLncRnaName(rsm1.name);
      setLncRnaSeq(rsm1.sequence);
      setActiveModule('mirna');
      setMirnaName('osa-miR166');
      setMirnaSeq(rsm1.targetSequenceOrMotif);
    } else if (presetKey === 'elena1') {
      const elena = CURATED_LNCRNAS[2];
      setLncRnaName(elena.name);
      setLncRnaSeq(elena.sequence);
      setActiveModule('dna');
      setDnaTargetName(elena.primaryTarget);
      setDnaSeq(elena.targetSequenceOrMotif);
    } else if (presetKey === 'sl16397') {
      const sl = CURATED_LNCRNAS[3];
      setLncRnaName(sl.name);
      setLncRnaSeq(sl.sequence);
      setActiveModule('protein');
      setProteinName(sl.primaryTarget);
      setProteinSeq(sl.targetSequenceOrMotif);
    }
  };

  const handleCopySequence = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanLncRna = cleanSequence(lncRnaSeq);
  const gcPct = cleanLncRna.length
    ? Math.round(((cleanLncRna.match(/[GC]/g) || []).length / cleanLncRna.length) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Attribution & Pre-load Quick Chips */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                Computational Core
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                LISHA Interaction Screening & Homology Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physicochemical scoring matrices, catRAPID/RPISeq-inspired interaction propensities, seed matching, and Hoogsteen triplex binding.
            </p>
          </div>

          {/* Quick-try presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1">Pre-load:</span>
            <button
              onClick={() => loadPreset('alex1')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
            >
              ALEX1 (Rice JA/Blight)
            </button>
            <button
              onClick={() => loadPreset('rsm1')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition-colors"
            >
              lncRNA-Rsm1 (Blast ceRNA)
            </button>
            <button
              onClick={() => loadPreset('elena1')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200 transition-colors"
            >
              ELENA1 (PR1 Triplex)
            </button>
            <button
              onClick={() => loadPreset('sl16397')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
            >
              lncRNA16397 (Tomato Late Blight)
            </button>
          </div>
        </div>

        {/* Module Selector Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-4">
          <button
            onClick={() => setActiveModule('protein')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'protein'
                ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Module 1</span>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">lncRNA-Protein</div>
            <div className="text-[10px] text-slate-500 truncate">catRAPID & RBM</div>
          </button>

          <button
            onClick={() => setActiveModule('mirna')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'mirna'
                ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Module 2</span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">lncRNA-miRNA</div>
            <div className="text-[10px] text-slate-500 truncate">ceRNA Sponging</div>
          </button>

          <button
            onClick={() => setActiveModule('dna')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'dna'
                ? 'bg-purple-50 border-purple-400 shadow-xs ring-1 ring-purple-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Module 3</span>
              <Dna className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">lncRNA-DNA</div>
            <div className="text-[10px] text-slate-500 truncate">Hoogsteen Triplex</div>
          </button>

          <button
            onClick={() => setActiveModule('homology')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'homology'
                ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Module 4</span>
              <Grid className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">Stress Homology</div>
            <div className="text-[10px] text-slate-500 truncate">D3 Similarity Matrix</div>
          </button>

          <button
            onClick={() => setActiveModule('visual-seq')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'visual-seq'
                ? 'bg-cyan-50 border-cyan-400 shadow-xs ring-1 ring-cyan-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Module 5</span>
              <Eye className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">Sequence & GC</div>
            <div className="text-[10px] text-slate-500 truncate">Base-Pairing & GC%</div>
          </button>

          <button
            onClick={() => setActiveModule('thermodynamics')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'thermodynamics'
                ? 'bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Module 6</span>
              <Thermometer className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">Thermodynamics</div>
            <div className="text-[10px] text-slate-500 truncate">Nearest-Neighbor Tm</div>
          </button>

          <button
            onClick={() => setActiveModule('structure')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'structure'
                ? 'bg-indigo-50 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Module 7</span>
              <Dna className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">2D RNA Fold</div>
            <div className="text-[10px] text-slate-500 truncate">CSS Dot-Bracket</div>
          </button>

          <button
            onClick={() => setActiveModule('motifs')}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              activeModule === 'motifs'
                ? 'bg-violet-50 border-violet-400 shadow-xs ring-1 ring-violet-300'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Module 8</span>
              <Compass className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">Motif Discovery</div>
            <div className="text-[10px] text-slate-500 truncate">Regulatory Elements</div>
          </button>
        </div>
      </div>

      {/* If Module 4 D3 Matrix view is active, render full-width workspace with sleek query bar */}
      {activeModule === 'homology' && homologyViewMode === 'matrix' ? (
        <div className="space-y-5">
          {/* Top Bar with Mode Selector and Query Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHomologyViewMode('matrix')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-amber-600 text-white shadow-xs cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>D3 Comparative Homology Matrix (All Templates)</span>
              </button>
              <button
                onClick={() => setHomologyViewMode('pairwise')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pairwise Alignment Traceback</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Query lncRNA:</span>
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-amber-900 font-mono font-bold">
                {lncRnaName}
              </span>
              <span className="text-slate-400 font-mono">
                {cleanLncRna.length} nt • GC: {gcPct}%
              </span>
              <button
                onClick={() => setIsFastaModalOpen(true)}
                disabled={!validationResult.isValid}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  !validationResult.isValid
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 cursor-pointer'
                }`}
                title={!validationResult.isValid ? 'Fix sequence validation errors to export' : 'Export validated sequence and biophysical properties in FASTA format'}
              >
                <FileDown className="w-3 h-3 text-indigo-600" />
                <span>Export FASTA</span>
              </button>
              <button
                onClick={() => setIsQueryEditorOpen(!isQueryEditorOpen)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-slate-500" />
                <span>{isQueryEditorOpen ? 'Hide Editor' : 'Edit Query Sequence'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Query Sequence Editor if open */}
          {isQueryEditorOpen && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Edit Query lncRNA Sequence
                </h4>
                <button
                  onClick={() => handleCopySequence(cleanLncRna)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">lncRNA Name</label>
                  <input
                    type="text"
                    value={lncRnaName}
                    onChange={(e) => setLncRnaName(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">FASTA / Nucleotide Sequence</label>
                  <textarea
                    rows={3}
                    value={lncRnaSeq}
                    onChange={(e) => setLncRnaSeq(e.target.value)}
                    className={`w-full text-xs font-mono px-3 py-2 border rounded bg-slate-50 focus:bg-white uppercase ${
                      !validationResult.isValid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                    }`}
                  />
                  {!validationResult.isValid && (
                    <div className="flex items-center justify-between text-xs text-rose-800 bg-rose-50 border border-rose-300 p-2 rounded">
                      <span>Invalid characters detected in sequence ({validationResult.totalInvalidCount} invalid chars).</span>
                      <button
                        type="button"
                        onClick={() => setLncRnaSeq(sanitizeToRnaSequence(lncRnaSeq))}
                        className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-medium"
                      >
                        Sanitize
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Full-width Homology Comparison Matrix */}
          <HomologyComparisonMatrix
            querySequence={lncRnaSeq}
            queryName={lncRnaName}
            onSelectTemplateForAlignment={(template) => {
              setHomologySubjectName(template.name);
              setHomologySubjectSeq(template.sequence);
              setHomologyViewMode('pairwise');
              handleRunScreening();
            }}
          />
        </div>
      ) : (
        /* Regular Dual-Panel Workspace: Input Controls & Real-Time Output */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sequence Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Dna className="w-4 h-4 text-blue-600" />
                  Query lncRNA Sequence
                </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>{cleanLncRna.length} nt</span>
                <span>•</span>
                <span>GC: {gcPct}%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                lncRNA Identifier / Name
              </label>
              <input
                type="text"
                value={lncRnaName}
                onChange={(e) => setLncRnaName(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. ALEX1 (Oryza sativa)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">
                  Nucleotide Sequence (5' &rarr; 3')
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFastaModalOpen(true)}
                    disabled={!validationResult.isValid}
                    className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      !validationResult.isValid
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-indigo-600 hover:text-indigo-800 cursor-pointer'
                    }`}
                    title={!validationResult.isValid ? 'Fix sequence validation errors to export' : 'Export validated FASTA with biophysical properties'}
                  >
                    <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Export FASTA</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleCopySequence(cleanLncRna)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={lncRnaSeq}
                onChange={(e) => setLncRnaSeq(e.target.value)}
                className={`w-full text-xs font-mono px-3 py-2 border rounded-md focus:bg-white focus:outline-hidden focus:ring-1 leading-relaxed uppercase transition-colors ${
                  !validationResult.isValid
                    ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500'
                    : 'border-slate-300 bg-slate-50 focus:ring-blue-500'
                }`}
                placeholder="Enter RNA sequence (A, C, G, U/T)..."
              />

              {/* Regex Sequence Validation Diagnostics */}
              <div className="mt-2">
                {validationResult.isValid ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Valid Sequence (A, C, G, T, U)</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-800">
                      <span>{validationResult.length} nt</span>
                      <span>•</span>
                      <span>GC: {validationResult.composition.gcPercent}%</span>
                      <span>•</span>
                      <span>AU: {validationResult.composition.auPercent}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-2 text-rose-950">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-rose-900">Sequence Validation Error</div>
                          <div className="text-[11px] text-rose-800 mt-0.5">
                            lncRNA sequences must strictly contain only valid nucleotide bases (A, C, G, T, U).
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLncRnaSeq(sanitizeToRnaSequence(lncRnaSeq))}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] rounded flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Sanitize & Auto-Fix</span>
                      </button>
                    </div>

                    {/* Invalid Character Badges */}
                    {validationResult.invalidChars.length > 0 && (
                      <div className="bg-white/90 border border-rose-200 rounded p-2 text-[11px] font-mono text-rose-900 space-y-1">
                        <div className="font-semibold text-rose-800">
                          Detected {validationResult.totalInvalidCount} invalid character(s):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {validationResult.invalidChars.map((diag, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-rose-100 border border-rose-300 rounded text-rose-800 font-bold"
                            >
                              '{diag.char}' ({diag.count}x at pos {diag.positions.join(', ')})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Target input according to active module */}
            <div className="pt-3 border-t border-slate-100">
              {activeModule === 'protein' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Target Protein Name & Motif
                    </label>
                    <input
                      type="text"
                      value={proteinName}
                      onChange={(e) => setProteinName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Target Amino Acid Sequence
                    </label>
                    <textarea
                      rows={4}
                      value={proteinSeq}
                      onChange={(e) => setProteinSeq(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
                      placeholder="e.g. MKVVVRGFGFVEELLKKLAKRKK..."
                    />
                  </div>
                </div>
              )}

              {activeModule === 'mirna' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Target miRNA Identifier
                    </label>
                    <input
                      type="text"
                      value={mirnaName}
                      onChange={(e) => setMirnaName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      miRNA Sequence (5' &rarr; 3', 18-24 nt)
                    </label>
                    <input
                      type="text"
                      value={mirnaSeq}
                      onChange={(e) => setMirnaSeq(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 uppercase"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Seed region is evaluated across positions 2-8 from 5' end.
                    </p>
                  </div>
                </div>
              )}

              {activeModule === 'dna' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Target DNA Promoter / Locus Name
                    </label>
                    <input
                      type="text"
                      value={dnaTargetName}
                      onChange={(e) => setDnaTargetName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Promoter Duplex DNA Target Sequence (5' &rarr; 3')
                    </label>
                    <textarea
                      rows={3}
                      value={dnaSeq}
                      onChange={(e) => setDnaSeq(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 uppercase"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Screens for polypyrimidine (parallel) and polypurine (antiparallel) Hoogsteen base-pairing.
                    </p>
                  </div>
                </div>
              )}

              {activeModule === 'homology' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">
                      Subject Sequence Name
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500">Method:</label>
                      <select
                        value={alignmentType}
                        onChange={(e) => setAlignmentType(e.target.value as any)}
                        className="text-xs border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                      >
                        <option value="local">Smith-Waterman (Local)</option>
                        <option value="global">Needleman-Wunsch (Global)</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={homologySubjectName}
                    onChange={(e) => setHomologySubjectName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Subject Nucleotide Sequence
                    </label>
                    <textarea
                      rows={4}
                      value={homologySubjectSeq}
                      onChange={(e) => setHomologySubjectSeq(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 uppercase"
                    />
                  </div>
                </div>
              )}

              {(activeModule === 'visual-seq' || activeModule === 'thermodynamics' || activeModule === 'structure' || activeModule === 'motifs') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-700">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Biophysical & Motif Analysis Mode</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Directly analyzing the query sequence for conserved regulatory motifs, Watson-Crick GC architecture, nearest-neighbor melting temperature (Tm), and secondary structure dot-bracket folds.
                  </p>
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleRunScreening}
                disabled={isRunning || !validationResult.isValid}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors ${
                  !validationResult.isValid
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                    : isRunning
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {!validationResult.isValid
                    ? 'Cannot Run: Fix Invalid Characters'
                    : isRunning
                    ? 'Calculating...'
                    : 'Run Screening Assessment'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsFastaModalOpen(true)}
                disabled={!validationResult.isValid}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ${
                  !validationResult.isValid
                    ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer'
                }`}
                title={!validationResult.isValid ? 'Fix sequence validation errors to export' : 'Export validated lncRNA sequence and computed biophysical properties in FASTA format'}
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Export</span> FASTA
              </button>

              <button
                onClick={() => {
                  setLncRnaSeq('');
                  setProteinSeq('');
                }}
                className="p-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Reset sequences"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Predicted 2D RNA Fold preview */}
          {structureResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Dna className="w-3.5 h-3.5 text-blue-600" />
                  Secondary Structure (Nussinov Fold)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  MFE: {structureResult.estimatedMfeKcal} kcal/mol
                </span>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                <div className="text-slate-400">Sequence:</div>
                <div className="text-emerald-400 break-all">{structureResult.sequence.slice(0, 140)}</div>
                <div className="text-slate-400 mt-2">Dot-Bracket:</div>
                <div className="text-blue-300 break-all">{structureResult.dotBracket.slice(0, 140)}</div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Predicted base pairs: {structureResult.basePairs.length}</span>
                <span>GC Content: {structureResult.gcContentPercent}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Computational Results & Biophysical Assessment */}
        <div className={`${activeModule === 'homology' && homologyViewMode === 'matrix' ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-4`}>
          {/* Module 1: Protein Interaction View */}
          {activeModule === 'protein' && proteinResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    lncRNA-Protein Interaction Propensity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pair: <span className="font-semibold text-slate-800">{lncRnaName}</span> &harr;{' '}
                    <span className="font-semibold text-slate-800">{proteinName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      proteinResult.confidence === 'High'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : proteinResult.confidence === 'Moderate'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Confidence: {proteinResult.confidence}
                  </span>
                </div>
              </div>

              {/* Big Metrics Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-extrabold text-blue-700 font-mono">
                    {proteinResult.score.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-blue-900 font-medium mt-0.5">Interaction Score</div>
                </div>

                <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-extrabold text-teal-700 font-mono">
                    {proteinResult.bindingPropensity}%
                  </div>
                  <div className="text-[11px] text-teal-900 font-medium mt-0.5">Binding Propensity</div>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-extrabold text-purple-700 font-mono">
                    {proteinResult.detectedRnaBindingMotifs.length}
                  </div>
                  <div className="text-[11px] text-purple-900 font-medium mt-0.5">Motifs Detected</div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-extrabold text-amber-700 font-mono">
                    {proteinResult.breakdown.electrostaticScore.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-amber-900 font-medium mt-0.5">Electrostatic Fit</div>
                </div>
              </div>

              {/* Physicochemical Breakdown bars */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Biophysical Interaction Parameter Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Electrostatic Affinity (Arg/Lys vs Phosphate)</span>
                      <span className="font-mono font-semibold">
                        {(proteinResult.breakdown.electrostaticScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${proteinResult.breakdown.electrostaticScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Aromatic Stacking & Hydrophobic Propensity</span>
                      <span className="font-mono font-semibold">
                        {(proteinResult.breakdown.hydrophobicPropensity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${proteinResult.breakdown.hydrophobicPropensity * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Secondary Structure Loop Accessibility</span>
                      <span className="font-mono font-semibold">
                        {(proteinResult.breakdown.secondaryStructureAccessibility * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${proteinResult.breakdown.secondaryStructureAccessibility * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected RNA Binding Motifs in Protein */}
              {proteinResult.detectedRnaBindingMotifs.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Identified RNA-Binding Domains (RBD) & Motifs
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Position</th>
                          <th className="py-2 px-3">Motif Sequence</th>
                          <th className="py-2 px-3">Domain Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {proteinResult.detectedRnaBindingMotifs.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 font-mono text-[11px]">
                            <td className="py-1.5 px-3 text-slate-500">aa {m.position}</td>
                            <td className="py-1.5 px-3 font-bold text-blue-700">{m.motif}</td>
                            <td className="py-1.5 px-3 text-slate-800 font-sans">{m.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions: Save to Firebase / Gemini Analysis */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() =>
                    onSaveAnalysis?.({
                      title: `Screening: ${lncRnaName} x ${proteinName}`,
                      lncRnaName,
                      lncRnaSequence: lncRnaSeq,
                      interactionType: 'lncRNA-Protein',
                      targetName: proteinName,
                      score: proteinResult.score,
                      summary: `Interaction Propensity: ${proteinResult.bindingPropensity}%, Confidence: ${proteinResult.confidence}. Detected ${proteinResult.detectedRnaBindingMotifs.length} RNA-binding motifs.`,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-blue-600" />
                  <span>Save to Workspace</span>
                </button>

                <button
                  onClick={() =>
                    onRequestGeminiInterpretation?.(
                      `Provide a deep biophysical mechanism analysis of the interaction between lncRNA "${lncRnaName}" and protein "${proteinName}". The predicted interaction score is ${proteinResult.score} (${proteinResult.bindingPropensity}% propensity, ${proteinResult.confidence} confidence). Detected RNA-binding motifs: ${JSON.stringify(
                        proteinResult.detectedRnaBindingMotifs
                      )}. Explain its biological role in plant biotic stress defense and potential application in pathogen resistance.`,
                      `Biophysical Mechanism: ${lncRnaName} x ${proteinName}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gemini High-Thinking Mechanism Interpretation</span>
                </button>
              </div>
            </div>
          )}

          {/* Module 2: miRNA Sponging View */}
          {activeModule === 'mirna' && mirnaResults && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    lncRNA-miRNA ceRNA Sponging Screening
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pair: <span className="font-semibold text-slate-800">{lncRnaName}</span> &harr;{' '}
                    <span className="font-semibold text-slate-800">{mirnaName}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  {mirnaResults.length} Candidate Sites
                </span>
              </div>

              {mirnaResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-slate-200">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  No high-affinity seed matches found for this miRNA sequence. Try another miRNA or lower match stringency.
                </div>
              ) : (
                <div className="space-y-3">
                  {mirnaResults.map((hit, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-800">
                          Target Site #{idx + 1} (nt {hit.lncRnaRange[0]} - {hit.lncRnaRange[1]})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                            {hit.seedType}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">
                            &Delta;G: {hit.freeEnergyKcal} kcal/mol
                          </span>
                          <span className="font-mono text-blue-700 font-bold">
                            Sponge Eff: {hit.spongingEfficiency}%
                          </span>
                        </div>
                      </div>

                      {/* Alignment display */}
                      <div className="bg-slate-900 rounded p-2 text-slate-200 font-mono text-[11px] leading-tight overflow-x-auto">
                        <div className="text-slate-400">lncRNA (5'-3'): {hit.fullAlignmentRna}</div>
                        <div className="text-emerald-400">Match:        {hit.matchLine}</div>
                        <div className="text-amber-400">miRNA  (3'-5'): {hit.fullAlignmentMiRna}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() =>
                    onSaveAnalysis?.({
                      title: `ceRNA: ${lncRnaName} x ${mirnaName}`,
                      lncRnaName,
                      lncRnaSequence: lncRnaSeq,
                      interactionType: 'lncRNA-miRNA',
                      targetName: mirnaName,
                      score: mirnaResults[0]?.spongingEfficiency || 0,
                      summary: `Identified ${mirnaResults.length} binding sites. Top seed: ${mirnaResults[0]?.seedType}, Free energy: ${mirnaResults[0]?.freeEnergyKcal} kcal/mol.`,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-blue-600" />
                  <span>Save to Workspace</span>
                </button>

                <button
                  onClick={() =>
                    onRequestGeminiInterpretation?.(
                      `Explain the competing endogenous RNA (ceRNA) regulatory network of plant lncRNA "${lncRnaName}" sponging "${mirnaName}". Top predicted target site has ${mirnaResults[0]?.seedType} seed match and &Delta;G of ${mirnaResults[0]?.freeEnergyKcal} kcal/mol with ${mirnaResults[0]?.spongingEfficiency}% sponging efficiency. What downstream plant immune genes (e.g., HD-ZIP III, AGO1, NBS-LRR) are released from miRNA cleavage to confer biotic stress resistance?`,
                      `ceRNA Network: ${lncRnaName} x ${mirnaName}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gemini ceRNA Immune Network Hypothesis</span>
                </button>
              </div>
            </div>
          )}

          {/* Module 3: DNA Triplex View */}
          {activeModule === 'dna' && triplexResults && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    lncRNA-DNA Triplex Formation Prediction
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pair: <span className="font-semibold text-slate-800">{lncRnaName}</span> &harr;{' '}
                    <span className="font-semibold text-slate-800">{dnaTargetName}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
                  {triplexResults.length} Triplex Target Sites
                </span>
              </div>

              {triplexResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-slate-200">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  No high-affinity Hoogsteen triplex binding sites detected with current threshold (&ge; 70% polypyrimidine/polypurine content).
                </div>
              ) : (
                <div className="space-y-3">
                  {triplexResults.map((trip, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-800">
                          Triplex Binding Site #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                            {trip.motifType}
                          </span>
                          <span className="font-mono text-purple-700 font-bold">
                            Score: {trip.triplexScore}%
                          </span>
                          <span className="font-mono text-blue-700 font-bold">
                            Stability: {trip.stabilityIndex}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900 p-2.5 rounded text-slate-200">
                        <div>
                          <span className="text-slate-400">lncRNA TFO (nt {trip.lncRnaRange[0]}-{trip.lncRnaRange[1]}):</span>
                          <div className="text-emerald-400 break-all">{trip.tfoSequence}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">DNA TTS (nt {trip.dnaRange[0]}-{trip.dnaRange[1]}):</span>
                          <div className="text-amber-400 break-all">{trip.ttsSequence}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() =>
                    onSaveAnalysis?.({
                      title: `Triplex: ${lncRnaName} x ${dnaTargetName}`,
                      lncRnaName,
                      lncRnaSequence: lncRnaSeq,
                      interactionType: 'lncRNA-DNA',
                      targetName: dnaTargetName,
                      score: triplexResults[0]?.triplexScore || 0,
                      summary: `Top Triplex Motif: ${triplexResults[0]?.motifType}, Score: ${triplexResults[0]?.triplexScore}%, Stability Index: ${triplexResults[0]?.stabilityIndex}.`,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-blue-600" />
                  <span>Save to Workspace</span>
                </button>

                <button
                  onClick={() =>
                    onRequestGeminiInterpretation?.(
                      `Explain the RNA-DNA triplex formation mechanism of "${lncRnaName}" binding to the promoter of "${dnaTargetName}". Top predicted motif is ${triplexResults[0]?.motifType} with score ${triplexResults[0]?.triplexScore}% and stability index ${triplexResults[0]?.stabilityIndex}. How does this triplex recruit chromatin-modifying complexes (e.g. Mediator subunit MED19a, PRC2, histone acetyltransferases) to epigenetically activate or repress defense genes during biotic stress?`,
                      `Triplex Epigenetics: ${lncRnaName} x ${dnaTargetName}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gemini Epigenetic Triplex Interpretation</span>
                </button>
              </div>
            </div>
          )}

          {/* Module 4: Homology Pairwise Traceback View */}
          {activeModule === 'homology' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHomologyViewMode('matrix')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>&larr; Return to D3 Homology Matrix</span>
                  </button>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pairwise Alignment Traceback</span>
                  </span>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  Aligning against <strong className="text-slate-700">{homologySubjectName}</strong>
                </span>
              </div>

              {alignmentResult && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Sequence Homology & Structure Alignment
                      </h3>
                      <p className="text-xs text-slate-500">
                        {alignmentType === 'local' ? 'Smith-Waterman Local Alignment' : 'Needleman-Wunsch Global Alignment'}:{' '}
                        <span className="font-semibold text-slate-800">{lncRnaName}</span> vs{' '}
                        <span className="font-semibold text-slate-800">{homologySubjectName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        Identity: {alignmentResult.identityPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <div className="text-lg font-bold text-slate-800 font-mono">{alignmentResult.score}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Alignment Score</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <div className="text-lg font-bold text-emerald-700 font-mono">{alignmentResult.identityPercent}%</div>
                      <div className="text-[10px] text-slate-500 uppercase">Sequence Identity</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <div className="text-lg font-bold text-blue-700 font-mono">{alignmentResult.similarityPercent}%</div>
                      <div className="text-[10px] text-slate-500 uppercase">Similarity</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <div className="text-lg font-bold text-amber-700 font-mono">{alignmentResult.gaps}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Gaps</div>
                    </div>
                  </div>

                  {/* Visual Alignment Output */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      Pairwise Alignment Traceback
                    </h4>
                    <div className="bg-slate-900 rounded-lg p-3 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                      <div className="text-slate-400">Query:   {alignmentResult.alignedSeq1.slice(0, 160)}</div>
                      <div className="text-emerald-400">Match:   {alignmentResult.matchLine.slice(0, 160)}</div>
                      <div className="text-blue-300">Subject: {alignmentResult.alignedSeq2.slice(0, 160)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() =>
                        onSaveAnalysis?.({
                          title: `Homology: ${lncRnaName} x ${homologySubjectName}`,
                          lncRnaName,
                          lncRnaSequence: lncRnaSeq,
                          interactionType: 'Homology Assessment',
                          targetName: homologySubjectName,
                          score: alignmentResult.identityPercent,
                          summary: `Alignment Score: ${alignmentResult.score}, Identity: ${alignmentResult.identityPercent}%, Similarity: ${alignmentResult.similarityPercent}%, Gaps: ${alignmentResult.gaps}.`,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-blue-600" />
                      <span>Save to Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Module 5: Visual Nucleotide Sequence Viewer */}
          {activeModule === 'visual-seq' && (
            <VisualSequenceViewer
              sequence={validationResult.cleanedSequence || lncRnaSeq}
              name={lncRnaName}
              structureResult={structureResult}
              onExportFasta={() => setIsFastaModalOpen(true)}
            />
          )}

          {/* Module 6: Thermophysical Property Calculator */}
          {activeModule === 'thermodynamics' && (
            <ThermophysicalCalculator
              sequence={validationResult.cleanedSequence || lncRnaSeq}
              name={lncRnaName}
              onExportFasta={() => setIsFastaModalOpen(true)}
            />
          )}

          {/* Module 7: Secondary Structure 2D Fold & Dot-Bracket */}
          {activeModule === 'structure' && (
            <SecondaryStructureView
              sequence={validationResult.cleanedSequence || lncRnaSeq}
              name={lncRnaName}
              structureResult={structureResult}
              onExportFasta={() => setIsFastaModalOpen(true)}
            />
          )}

          {/* Module 8: Conserved Regulatory Motif Discovery */}
          {activeModule === 'motifs' && (
            <MotifDiscoveryViewer
              sequence={validationResult.cleanedSequence || lncRnaSeq}
              name={lncRnaName}
              onExportFasta={() => setIsFastaModalOpen(true)}
            />
          )}
        </div>
      </div>
    )}

    {/* FASTA Sequence & Biophysical Export Modal */}
    <FastaExportModal
      isOpen={isFastaModalOpen}
      onClose={() => setIsFastaModalOpen(false)}
      sequenceName={lncRnaName}
      sequence={validationResult.cleanedSequence || lncRnaSeq}
      structureResult={structureResult || undefined}
    />
  </div>
);
};
