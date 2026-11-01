/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA FASTA Export Modal
 * Interactive modal allowing researchers to inspect, customize, copy, and download
 * validated lncRNA sequences along with nearest-neighbor thermodynamic and secondary structure properties.
 */

import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  X,
  FileDown,
  Dna,
  Thermometer,
  Layers,
  Sparkles,
  Settings2,
  Info,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import {
  generateBiophysicalFasta,
  downloadFastaFile,
  type FastaHeaderStyle,
  type GeneratedFasta,
} from '../utils/fastaExporter';
import type { ThermodynamicParameters } from '../utils/thermodynamics';
import type { SecondaryStructureResult } from '../utils/bioCalculations';

interface FastaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceName: string;
  sequence: string;
  thermoParams?: ThermodynamicParameters;
  structureResult?: SecondaryStructureResult;
  defaultOrganism?: string;
}

export const FastaExportModal: React.FC<FastaExportModalProps> = ({
  isOpen,
  onClose,
  sequenceName,
  sequence,
  thermoParams,
  structureResult,
  defaultOrganism = 'Oryza sativa',
}) => {
  const [headerStyle, setHeaderStyle] = useState<FastaHeaderStyle>('bracket-attributes');
  const [lineWrap, setLineWrap] = useState<60 | 80 | 0>(60);
  const [asDna, setAsDna] = useState<boolean>(false);
  const [organism, setOrganism] = useState<string>(defaultOrganism);
  const [notes, setNotes] = useState<string>('LISHA ICAR-NIBSM Stress Homology & Biophysical Screening');
  const [copied, setCopied] = useState<boolean>(false);

  // Generate FASTA output reactively
  const fastaResult: GeneratedFasta = useMemo(() => {
    return generateBiophysicalFasta({
      identifier: sequenceName || 'lncRNA_candidate',
      sequence,
      headerStyle,
      lineWrap,
      asDna,
      organism,
      notes,
      thermoParams,
      structureResult,
    });
  }, [sequenceName, sequence, headerStyle, lineWrap, asDna, organism, notes, thermoParams, structureResult]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fastaResult.rawFastaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownload = () => {
    const filename = `${(sequenceName || 'lncRNA').replace(/\s+/g, '_')}_biophysical.fasta`;
    downloadFastaFile(filename, fastaResult.rawFastaText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Export Annotated FASTA & Biophysical Profile
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wider">
                  FASTA v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Exports validated sequence with embedded thermodynamic, GC content, and structural parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Biophysical Metadata Strip */}
        <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Sequence Length</div>
            <div className="font-mono font-bold text-emerald-400 text-sm">{fastaResult.metadata.length} nt</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">GC Content</div>
            <div className="font-mono font-bold text-cyan-300 text-sm">{fastaResult.metadata.gcPercent}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Nearest-Neighbor Tm</div>
            <div className="font-mono font-bold text-rose-300 text-sm">{fastaResult.metadata.tmNearestNeighbor}°C</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Gibbs ΔG°37</div>
            <div className="font-mono font-bold text-amber-300 text-sm">{fastaResult.metadata.deltaG37} <span className="text-[10px] font-normal text-slate-400">kcal/mol</span></div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Enthalpy ΔH°</div>
            <div className="font-mono font-bold text-violet-300 text-sm">{fastaResult.metadata.deltaH} <span className="text-[10px] font-normal text-slate-400">kcal/mol</span></div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">MFE 2D Fold</div>
            <div className="font-mono font-bold text-blue-300 text-sm">{fastaResult.metadata.mfeKcal} <span className="text-[10px] font-normal text-slate-400">kcal/mol</span></div>
          </div>
        </div>

        {/* Scrollable Configuration & Preview Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Export Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
            {/* Header Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>FASTA Header Notation</span>
              </label>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="headerStyle"
                    value="bracket-attributes"
                    checked={headerStyle === 'bracket-attributes'}
                    onChange={() => setHeaderStyle('bracket-attributes')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Bracket Attributes (NCBI/GFF Standard)</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      &gt;ID [length=...nt] [gc=...%] [tm_nn=...C] [dg37=...kcal/mol]
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="headerStyle"
                    value="pipe-delimited"
                    checked={headerStyle === 'pipe-delimited'}
                    onChange={() => setHeaderStyle('pipe-delimited')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Pipe-Delimited (Human Readable)</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      &gt;ID | Length: ... | GC: ... | Tm(NN): ... | ΔG°37: ...
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="headerStyle"
                    value="viennarna-structure"
                    checked={headerStyle === 'viennarna-structure'}
                    onChange={() => setHeaderStyle('viennarna-structure')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">ViennaRNA Fold (Includes Dot-Bracket)</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Appends secondary structure line: (((...))) (-28.4 kcal/mol)
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="headerStyle"
                    value="detailed-biophysical"
                    checked={headerStyle === 'detailed-biophysical'}
                    onChange={() => setHeaderStyle('detailed-biophysical')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Comprehensive Thermodynamic Profile</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Includes base counts, ΔH°, ΔS°, Wallace Tm, and ionic buffer conditions
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Sequence Formatting & Metadata */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Sequence Representation & Line Wrap
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAsDna(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !asDna
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Dna className="w-3.5 h-3.5" />
                    <span>RNA (Uracil 'U')</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsDna(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      asDna
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>cDNA (Thymine 'T')</span>
                  </button>
                </div>
              </div>

              {/* Line Length */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  FASTA Line Wrapping:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLineWrap(60)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-colors cursor-pointer ${
                      lineWrap === 60
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    60 nt / line (NCBI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineWrap(80)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-colors cursor-pointer ${
                      lineWrap === 80
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    80 nt / line
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineWrap(0)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-colors cursor-pointer ${
                      lineWrap === 0
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Single line
                  </button>
                </div>
              </div>

              {/* Optional Organism & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Host Organism</label>
                  <input
                    type="text"
                    value={organism}
                    onChange={(e) => setOrganism(e.target.value)}
                    placeholder="e.g. Oryza sativa"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Annotation Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Stress-responsive screening"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Interactive FASTA Code Block */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Live FASTA Preview</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500">
                  {fastaResult.sequenceLines.length} sequence line(s) • {fastaResult.rawFastaText.length} bytes
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Preview'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed shadow-inner max-h-64 scrollbar-thin">
              {/* Header line highlighting */}
              <div className="text-amber-400 font-bold select-all break-all pb-1 border-b border-slate-800/80 mb-2">
                {fastaResult.header}
              </div>

              {/* Wrapped sequence lines */}
              <div className="space-y-0.5 select-all">
                {fastaResult.sequenceLines.map((line, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-slate-600 text-[11px] select-none w-8 text-right shrink-0">
                      {idx * (lineWrap || line.length) + 1}
                    </span>
                    <span className="text-emerald-300 tracking-wider break-all">{line}</span>
                  </div>
                ))}
              </div>

              {/* ViennaRNA Secondary Structure line if present */}
              {fastaResult.structureLine && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex gap-4 select-all">
                  <span className="text-slate-600 text-[11px] select-none w-8 text-right shrink-0">
                    2D
                  </span>
                  <span className="text-cyan-300 tracking-wider break-all font-semibold">
                    {fastaResult.structureLine}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Standards Compliance Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Interoperability & Pipeline Integration:</span> This generated FASTA file is fully compatible with standard downstream tools including NCBI BLAST+, ViennaRNA Package (<code className="bg-white/80 px-1 py-0.5 rounded text-[11px]">RNAfold</code>, <code className="bg-white/80 px-1 py-0.5 rounded text-[11px]">RNAalifold</code>), Bedtools, EMBOSS, and oligonucleotide synthesis ordering portals.
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Validated Sequence ({fastaResult.metadata.length} nt, GC: {fastaResult.metadata.gcPercent}%)</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy FASTA'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .fasta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
