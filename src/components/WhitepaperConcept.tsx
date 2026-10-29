/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Scientific Concept, Novelty & Collaborative Research Whitepaper
 * Developed by Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM, Raipur, India.
 */

import React from 'react';
import {
  BookOpen,
  Award,
  Layers,
  Thermometer,
  Dna,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building,
  Mail,
  FileCheck,
} from 'lucide-react';

export const WhitepaperConcept: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Affiliation Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
            Research Proposal & Concept Whitepaper
          </span>
          <span className="text-xs text-slate-400 font-mono">ICAR-NIBSM / LISHA-2026-V1</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          LISHA: LncRNA Interaction Screening and Homology Assessment
        </h1>
        <p className="text-sm font-semibold text-slate-600">
          A Computational Paradigm Bridging lncRNA-Mediated Regulatory Networks with Multi-Omic, Thermal, and Stomatal Signatures for Early Detection of Plant Biotic Stress
        </p>

        {/* Lead Scientist Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Developed & Proposed by: Prof. Lalit Laxman Kharbikar</span>
            </div>
            <div className="text-slate-600">
              Principal Scientist, ICAR-National Institute of Biotic Stress Management (NIBSM), Raipur, India
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Email: LALITKHARBIKAR@gmail.com • ICAR Agricultural Research System
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 rounded-full shrink-0">
            Open Scientific Initiative
          </span>
        </div>
      </div>

      {/* Section 1: Scientific Novelty */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            1. Scientific Concept & Novelty of LISHA
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          Long noncoding RNAs (lncRNAs, &gt; 200 nt) have emerged as pivotal master regulators of plant immunity, orchestrating chromatin architecture, transcriptional reprogramming, and post-transcriptional surveillance. However, existing computational resources (e.g. GreeNC, CANTATAdb, NONCODE) remain primarily passive sequence repositories with limited predictive modeling for pathogen interaction and zero coupling to physiological field signatures.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Tri-partite Interaction</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Unified simultaneous screening of lncRNA-Protein (catRAPID/RPISeq propensity), lncRNA-miRNA (ceRNA sponging), and lncRNA-DNA (Hoogsteen triplex binding) within one computational interface.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-emerald-600" />
              <span>Multi-Omic Bridge</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Coupling transcriptomic log2FC with biophysical Canopy Temperature Depression (&Delta;T) and stomatal conductance (g<sub>s</sub>) to identify pre-symptomatic infection signatures.
            </p>
          </div>

          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Biotic Stress Specialization</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Curated focus on agricultural pathosystems: Rice Blast (<em>M. oryzae</em>), Bacterial Blight (<em>Xoo</em>), Tomato Late Blight (<em>P. infestans</em>), and Wheat Rust (<em>P. striiformis</em>).
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Datasets, Computational Requirements & Validation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            2. Datasets, Computational Architecture & Validation Roadmaps
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-1 uppercase tracking-wide">
              A. Available Datasets & Cross-Resource Federation
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>NCBI Entrez & RefSeq Plant Genomes (Rice IRGSP-1.0, Arabidopsis TAIR10, Tomato SL4.0).</li>
              <li>miRBase & Plant MicroRNA Encyclopedia (PMRD) for miRNA seed complementarity matrices.</li>
              <li>GEO & SRA RNA-Seq time-series profiling host response at 2, 6, 12, 24, 48, and 72 hpi.</li>
              <li>Infrared thermography datasets and porometer leaf gas exchange records under pathogen challenge.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-1 uppercase tracking-wide">
              B. Computational Algorithms Implemented
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li><strong>Smith-Waterman & Needleman-Wunsch Alignment:</strong> Affine gap penalty nucleotide alignment with conservation tracking.</li>
              <li><strong>Nussinov Dynamic Programming:</strong> Base-pairing prediction (GC, AU, GU wobble) and Minimum Free Energy (&Delta;G) approximation for RNA secondary structures.</li>
              <li><strong>catRAPID-Inspired Physicochemical Matrix:</strong> Evaluation of electrostatic charge compatibility, aromatic residue stacking, and loop accessibility.</li>
              <li><strong>Hoogsteen Triplex Algorithm:</strong> Identification of Triplex-Forming Oligonucleotides (TFO) and Triplex Target Sites (TTS) at promoter duplexes.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-1 uppercase tracking-wide">
              C. Experimental Validation Strategies
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>RNA-Protein Binding:</strong> RNA immunoprecipitation (RIP-seq), CLIP-seq, and in vitro RNA pull-down assays.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>ceRNA Sponging:</strong> Dual-luciferase reporter assays and 5' RLM-RACE for cleavage site mapping.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Triplex & Chromatin:</strong> Chromatin Isolation by RNA Purification (ChIRP-seq) and Triplex-seq at candidate defense promoters.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Phenomics & Early Detection:</strong> High-resolution thermal drone camera imaging calibrated against stomatal porometer aperture measurements in quarantine biocontainment facilities.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Call for Collaborative Contributions */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">
            3. Call for Interdisciplinary Collaboration
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Contributions and research partnerships are warmly invited across bioinformatics, computational biology, lncRNA biology, plant pathology, functional genomics, and precision agriculture. By pooling experimental datasets and computational expertise, we can advance LISHA into an internationally recognized, peer-reviewed, open-access standard for plant biotic stress intelligence.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-800 text-xs">
          <div>
            <div className="font-bold text-white">ICAR-National Institute of Biotic Stress Management</div>
            <div className="text-slate-400">Baronda, Raipur, Chhattisgarh 493225, India</div>
          </div>
          <a
            href="mailto:LALITKHARBIKAR@gmail.com?subject=LISHA%20Collaborative%20Research%20Contribution"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Prof. Lalit Kharbikar</span>
          </a>
        </div>
      </div>
    </div>
  );
};
