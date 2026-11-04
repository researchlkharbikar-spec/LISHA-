/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Formal PDF Screening Report Export Modal
 * Provides interactive options, section toggles, and customized investigator remarks
 * before generating and downloading publication-ready PDF screening reports.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Layers,
  Activity,
  Dna,
  Shield,
  Sparkles,
  Sliders,
  Check,
  FileDown,
} from 'lucide-react';
import { generateFormalPdfReport, type PdfReportData } from '../utils/pdfReportGenerator';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: PdfReportData;
  onDownloadSuccess?: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  reportData,
  onDownloadSuccess,
}) => {
  const [investigatorRemarks, setInvestigatorRemarks] = useState(
    reportData.investigatorNotes ||
      `Screening assessment conducted under ICAR-NIBSM Computational Plant Stress Genomics framework. Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM, Raipur, India.`
  );

  const [includeScores, setIncludeScores] = useState(true);
  const [includeHomology, setIncludeHomology] = useState(true);
  const [includeMotifs, setIncludeMotifs] = useState(true);
  const [includeStructure, setIncludeStructure] = useState(true);
  const [includeSequence, setIncludeSequence] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  if (!isOpen) return null;

  const handleExecuteDownload = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const finalData: PdfReportData = {
          ...reportData,
          investigatorNotes: investigatorRemarks.trim() || undefined,
          proteinResult: includeScores ? reportData.proteinResult : null,
          mirnaResults: includeScores ? reportData.mirnaResults : null,
          triplexResults: includeScores ? reportData.triplexResults : null,
          alignmentResult: includeHomology ? reportData.alignmentResult : null,
          motifResult: includeMotifs ? reportData.motifResult : null,
          structureResult: includeStructure ? reportData.structureResult : null,
        };

        const doc = generateFormalPdfReport(finalData);
        const safeName = (reportData.lncRnaName || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`LISHA_Formal_Screening_Report_${safeName}_${dateStr}.pdf`);

        setDownloadCompleted(true);
        onDownloadSuccess?.();
        setTimeout(() => {
          setDownloadCompleted(false);
          onClose();
        }, 1200);
      } catch (err) {
        console.error('Failed to generate formal PDF report:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Formal PDF Screening Summary Report</span>
                <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Publication Ready
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                ICAR-NIBSM Computational LncRNA Screening & Biotic Stress Assessment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Target Summary Snapshot */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 text-sm">
                Target: {reportData.lncRnaName}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                {reportData.length} nt • GC: {reportData.gcPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-500 text-[10px]">Protein Propensity</div>
                <div className="font-bold text-blue-700">
                  {reportData.proteinResult ? `${reportData.proteinResult.bindingPropensity}%` : 'N/A'}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-500 text-[10px]">miRNA Sponging</div>
                <div className="font-bold text-emerald-700">
                  {reportData.mirnaResults && reportData.mirnaResults.length > 0
                    ? `${reportData.mirnaResults[0].spongingEfficiency}%`
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-500 text-[10px]">DNA Triplex Score</div>
                <div className="font-bold text-purple-700">
                  {reportData.triplexResults && reportData.triplexResults.length > 0
                    ? `${reportData.triplexResults[0].triplexScore}%`
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-500 text-[10px]">Motifs Identified</div>
                <div className="font-bold text-indigo-700">
                  {reportData.motifResult ? `${reportData.motifResult.hits.length} hits` : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Section Selection Toggles */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Included Report Sections
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeScores}
                  onChange={(e) => setIncludeScores(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-medium text-slate-800">1. Computational Interaction Scores</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHomology}
                  onChange={(e) => setIncludeHomology(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-medium text-slate-800">2. Plant Stress Homology Alignment</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMotifs}
                  onChange={(e) => setIncludeMotifs(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-medium text-slate-800">3. Regulatory Motif Inventory Table</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStructure}
                  onChange={(e) => setIncludeStructure(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-medium text-slate-800">4. 2D Fold & Thermodynamic Parameters</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={includeSequence}
                  onChange={(e) => setIncludeSequence(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-medium text-slate-800">5. Full Validated RNA Sequence with Coordinate Grid</span>
              </label>
            </div>
          </div>

          {/* Investigator Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Investigator Remarks & Session Notes
            </label>
            <textarea
              rows={3}
              value={investigatorRemarks}
              onChange={(e) => setInvestigatorRemarks(e.target.value)}
              placeholder="Add investigator observations, experimental aims, cultivar annotations, or notes for collaborators..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-500">
              These remarks will be permanently printed in Section 6 of the formal PDF document.
            </p>
          </div>

          {/* Institutional Compliance Notice */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-950 text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Formal Academic & Research Documentation</div>
              <div className="text-[11px] text-indigo-800 mt-0.5">
                The generated PDF includes unique reference timestamps, ICAR-NIBSM affiliation, and PI attribution: <em>Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM, Raipur</em>.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteDownload}
            disabled={isGenerating}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              downloadCompleted
                ? 'bg-emerald-600 text-white'
                : isGenerating
                ? 'bg-indigo-400 text-white cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {downloadCompleted ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded Successfully!</span>
              </>
            ) : isGenerating ? (
              <>
                <FileDown className="w-4 h-4 animate-bounce" />
                <span>Compiling Formal PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Generate & Download Formal PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
