/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Biotic Stress & Early Detection Workbench
 * Integrates lncRNA transcriptomics, canopy thermography, and stomatal conductance.
 */

import React, { useState } from 'react';
import {
  Activity,
  Thermometer,
  Eye,
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import { calculateEarlyBioticStressIndex, type BioticStressSignature } from '../utils/bioCalculations';

interface BioticStressWorkbenchProps {
  onRequestGeminiInterpretation?: (prompt: string, title: string) => void;
}

export const BioticStressWorkbench: React.FC<BioticStressWorkbenchProps> = ({
  onRequestGeminiInterpretation,
}) => {
  // Input parameters for simulation
  const [hpi, setHpi] = useState<number>(12);
  const [log2fc, setLog2fc] = useState<number>(3.2);
  const [deltaT, setDeltaT] = useState<number>(1.4); // T_leaf - T_air in deg C
  const [gs, setGs] = useState<number>(140); // stomatal conductance mmol m^-2 s^-1
  const [selectedPathogen, setSelectedPathogen] = useState<'blast' | 'blight' | 'late-blight' | 'rust'>('blast');

  // Image analysis states
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageType, setImageType] = useState<'leaf' | 'thermal' | 'micrograph'>('thermal');
  const [imageCustomPrompt, setImageCustomPrompt] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);

  // Compute real-time EBSDI
  const currentSignature = calculateEarlyBioticStressIndex(hpi, log2fc, deltaT, gs);

  // Preset disease scenarios
  const applyScenario = (type: 'blast' | 'blight' | 'late-blight' | 'rust') => {
    setSelectedPathogen(type);
    if (type === 'blast') {
      // Rice blast at 18 hpi: lncRNA-Rsm1 induced (+3.8), DeltaT +1.6 C, gs drops to 130
      setHpi(18);
      setLog2fc(3.8);
      setDeltaT(1.6);
      setGs(130);
    } else if (type === 'blight') {
      // Bacterial blight at 12 hpi: ALEX1 induced (+4.2), DeltaT +1.8 C, gs drops to 110
      setHpi(12);
      setLog2fc(4.2);
      setDeltaT(1.8);
      setGs(110);
    } else if (type === 'late-blight') {
      // Tomato late blight at 24 hpi: lncRNA16397 induced (+2.9), DeltaT +1.3 C, gs 160
      setHpi(24);
      setLog2fc(2.9);
      setDeltaT(1.3);
      setGs(160);
    } else if (type === 'rust') {
      // Wheat stripe rust at 36 hpi: TalncRNA18 induced (+3.1), DeltaT +1.2 C, gs 180
      setHpi(36);
      setLog2fc(3.1);
      setDeltaT(1.2);
      setGs(180);
    }
  };

  // Sample images for testing image understanding
  const loadSampleImage = (type: 'leaf' | 'thermal' | 'micrograph') => {
    setImageType(type);
    setImageAnalysisResult(null);

    // Generate lightweight SVG base64 test graphic representing real scientific imagery
    let svgContent = '';
    if (type === 'thermal') {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="thermal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00008b"/>
            <stop offset="30%" stop-color="#4169e1"/>
            <stop offset="60%" stop-color="#ffd700"/>
            <stop offset="90%" stop-color="#ff4500"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="#0b0f19"/>
        <path d="M 100 250 C 150 150, 150 100, 300 80 C 250 160, 260 220, 100 250 Z" fill="url(#thermal)"/>
        <circle cx="210" cy="140" r="28" fill="#ff0000" opacity="0.85"/>
        <text x="210" y="145" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">+2.1°C Focal Point</text>
        <text x="20" y="30" font-family="sans-serif" font-size="12" fill="#e2e8f0">FLIR Infrared Leaf Thermography (Rice Blast Focus)</text>
      </svg>`;
    } else if (type === 'micrograph') {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#2d3748"/>
        <ellipse cx="140" cy="150" rx="35" ry="50" fill="#48bb78" stroke="#22543d" stroke-width="6"/>
        <ellipse cx="140" cy="150" rx="4" ry="40" fill="#1a202c"/>
        <ellipse cx="260" cy="150" rx="35" ry="50" fill="#48bb78" stroke="#22543d" stroke-width="6"/>
        <ellipse cx="260" cy="150" rx="2" ry="38" fill="#1a202c"/>
        <text x="20" y="30" font-family="sans-serif" font-size="12" fill="#e2e8f0">Stomatal Aperture Micrograph (PAMP-induced closure)</text>
        <text x="200" y="270" font-family="sans-serif" font-size="11" fill="#cbd5e0" text-anchor="middle">Guard cells displaying rapid pore constriction (g_s: 110 mmol m^-2 s^-1)</text>
      </svg>`;
    } else {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#1e293b"/>
        <path d="M 60 260 C 140 180, 200 120, 340 70 C 270 180, 240 240, 60 260 Z" fill="#2e7d32"/>
        <ellipse cx="210" cy="140" rx="16" ry="32" fill="#8d6e63" transform="rotate(-30 210 140)"/>
        <ellipse cx="210" cy="140" rx="8" ry="18" fill="#d7ccc8" transform="rotate(-30 210 140)"/>
        <text x="20" y="30" font-family="sans-serif" font-size="12" fill="#e2e8f0">Foliar Pathological Symptoms: Spindle Blast Lesion</text>
      </svg>`;
    }

    const base64 = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    setImageFile(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile(reader.result as string);
      setImageAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImageWithGemini = async () => {
    if (!imageFile) return;
    setIsAnalyzingImage(true);
    setImageAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageFile,
          mimeType: imageFile.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/jpeg',
          imageType,
          prompt: imageCustomPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze image');
      setImageAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error(err);
      setImageAnalysisResult(`Analysis Error: ${err.message}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Generate synthetic multi-omic timeline points for the SVG chart (0 to 48 hpi)
  const timelinePoints = [0, 6, 12, 18, 24, 36, 48].map((time) => {
    // Normal healthy at 0hpi
    if (time === 0) return { h: 0, lnc: 0.1, dt: -2.0, gs: 420, ebsdi: 5 };
    if (time === 6) return { h: 6, lnc: 1.8, dt: -0.6, gs: 280, ebsdi: 35 };
    if (time === 12) return { h: 12, lnc: 3.5, dt: +1.2, gs: 140, ebsdi: 68 };
    if (time === 18) return { h: 18, lnc: 4.2, dt: +1.6, gs: 120, ebsdi: 82 };
    if (time === 24) return { h: 24, lnc: 4.0, dt: +1.8, gs: 100, ebsdi: 88 };
    if (time === 36) return { h: 36, lnc: 3.2, dt: +1.5, gs: 110, ebsdi: 79 };
    return { h: 48, lnc: 2.1, dt: +1.0, gs: 130, ebsdi: 70 };
  });

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                Multi-Omic Biomarker Integration
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Early Plant Biotic Stress & Biomarker Detection
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Synthesizing lncRNA regulatory cascades with canopy thermal infrared signatures (&Delta;T) and stomatal conductance (g<sub>s</sub>). Exploits the pre-symptomatic Golden Window (6&ndash;24 hpi) where host stomatal closure and lncRNA induction flag infection 24&ndash;48 hours prior to macroscopic lesions.
            </p>
          </div>

          {/* Scenario Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1">Pathogen Scenarios:</span>
            <button
              onClick={() => applyScenario('blast')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                selectedPathogen === 'blast'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              Rice Blast (M. oryzae)
            </button>
            <button
              onClick={() => applyScenario('blight')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                selectedPathogen === 'blight'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              Bacterial Blight (Xoo)
            </button>
            <button
              onClick={() => applyScenario('late-blight')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                selectedPathogen === 'late-blight'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              Tomato Late Blight (P. infestans)
            </button>
          </div>
        </div>

        {/* Real-time Indicator Gauge */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white flex flex-col items-center justify-center font-mono font-bold text-lg">
              {currentSignature.ebsdiScore}
              <span className="text-[9px] font-sans font-normal opacity-80">/100</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">EBSDI Score</div>
              <div className="text-[11px] text-slate-500">Early Biotic Stress Index</div>
              <span
                className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                  currentSignature.ebsdiScore >= 75
                    ? 'bg-red-100 text-red-800'
                    : currentSignature.ebsdiScore >= 50
                    ? 'bg-amber-100 text-amber-800'
                    : currentSignature.ebsdiScore >= 25
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {currentSignature.pathogenRiskLevel}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Stress Phase</span>
              <Activity className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="font-bold text-slate-900 text-xs">
              {currentSignature.stressPhase}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Timeline: {currentSignature.hoursPostInoculation} hpi
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Canopy Thermal Delta</span>
              <Thermometer className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="font-bold text-slate-900 text-sm font-mono">
              {currentSignature.canopyTempDepressionDeltaT > 0 ? '+' : ''}
              {currentSignature.canopyTempDepressionDeltaT.toFixed(1)} &deg;C
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Normal baseline: -2.0 &deg;C (transpirational cooling)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Stomatal Conductance (g<sub>s</sub>)</span>
              <Zap className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="font-bold text-slate-900 text-sm font-mono">
              {currentSignature.stomatalConductanceGs} mmol m<sup>-2</sup> s<sup>-1</sup>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Deficit: {Math.max(0, 400 - currentSignature.stomatalConductanceGs)} mmol deficit
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Parameters & Multi-Omic Divergence Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders & Controls */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600" />
            Multi-Omic Infection Dynamics Controls
          </h3>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Infection Timecourse (Hours Post Inoculation)</span>
              <span className="font-mono font-bold text-emerald-700">{hpi} hpi</span>
            </div>
            <input
              type="range"
              min="0"
              max="72"
              step="2"
              value={hpi}
              onChange={(e) => setHpi(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0h (Inoculation)</span>
              <span className="font-bold text-amber-600">12-24h (Golden Window)</span>
              <span>72h (Necrosis)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Defense lncRNA Induction (Log2 Fold Change)</span>
              <span className="font-mono font-bold text-blue-700">+{log2fc.toFixed(1)} Log2FC</span>
            </div>
            <input
              type="range"
              min="-1"
              max="6"
              step="0.1"
              value={log2fc}
              onChange={(e) => setLog2fc(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>Basal (0)</span>
              <span>Moderate (+2.5)</span>
              <span>Hyper-induced (+5.0)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Canopy Temp Depression (&Delta;T = T<sub>leaf</sub> - T<sub>air</sub>)</span>
              <span className="font-mono font-bold text-red-600">
                {deltaT > 0 ? '+' : ''}
                {deltaT.toFixed(1)} &deg;C
              </span>
            </div>
            <input
              type="range"
              min="-2.5"
              max="3.0"
              step="0.1"
              value={deltaT}
              onChange={(e) => setDeltaT(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>Cooler (-2.5&deg;C Healthy)</span>
              <span>Ambient (0&deg;C)</span>
              <span>Warmer (+3&deg;C Stomata Closed)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Stomatal Conductance (g<sub>s</sub>)</span>
              <span className="font-mono font-bold text-amber-700">{gs} mmol m<sup>-2</sup> s<sup>-1</sup></span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={gs}
              onChange={(e) => setGs(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>50 (Pores Tight)</span>
              <span>250 (Restricted)</span>
              <span>450 (Fully Open)</span>
            </div>
          </div>

          {/* Golden Window Callout */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>The Pre-Symptomatic "Golden Window"</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Pathogen recognition (PAMPs such as flg22, chitin) triggers rapid closure of stomata within 2-6 hours. This shuts down evaporative transpirational cooling, causing a leaf canopy temperature spike (+1 to +2 &deg;C) detectable by thermal drones, concurrent with defense lncRNA activation, before lesions form!
            </p>
          </div>
        </div>

        {/* Dynamic Multi-Omic Divergence Graph */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Multi-Omic Signature Divergence Profile
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-blue-700 font-semibold">
                <span className="w-2.5 h-0.5 bg-blue-600 inline-block" /> lncRNA (Log2FC)
              </span>
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <span className="w-2.5 h-0.5 bg-red-600 inline-block" /> Thermal &Delta;T (&deg;C)
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2.5 h-0.5 bg-amber-600 inline-block" /> Stomatal Conductance
              </span>
            </div>
          </div>

          {/* SVG Multi-trace chart */}
          <div className="bg-slate-900 rounded-xl p-4 text-white overflow-hidden">
            <svg viewBox="0 0 500 220" className="w-full h-48">
              {/* Golden Window background highlight: x 60 to 250 (6 to 24 hpi) */}
              <rect x="70" y="20" width="170" height="170" fill="#f59e0b" fillOpacity="0.12" rx="4" />
              <text x="155" y="35" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">
                Golden Pre-Symptomatic Window (6-24 hpi)
              </text>

              {/* Grid lines */}
              <line x1="40" y1="190" x2="480" y2="190" stroke="#334155" strokeWidth="1" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="#334155" strokeDasharray="3 3" />
              <line x1="40" y1="30" x2="480" y2="30" stroke="#334155" strokeDasharray="3 3" />

              {/* Time X-axis labels */}
              <text x="40" y="205" fill="#94a3b8" fontSize="9">0h</text>
              <text x="110" y="205" fill="#94a3b8" fontSize="9">6h</text>
              <text x="180" y="205" fill="#94a3b8" fontSize="9">12h</text>
              <text x="240" y="205" fill="#94a3b8" fontSize="9">24h</text>
              <text x="350" y="205" fill="#94a3b8" fontSize="9">36h</text>
              <text x="460" y="205" fill="#94a3b8" fontSize="9">48h</text>

              {/* Trace 1: lncRNA Log2FC (Blue curve) */}
              <path
                d="M 40 185 C 90 140, 160 60, 240 50 C 320 60, 400 90, 460 120"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
              />

              {/* Trace 2: Thermal DeltaT (Red curve) */}
              <path
                d="M 40 180 C 80 150, 150 70, 240 65 C 330 75, 400 95, 460 115"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />

              {/* Trace 3: Stomatal Conductance gs (Amber curve - dropping sharply) */}
              <path
                d="M 40 40 C 90 70, 150 160, 240 175 C 320 180, 400 170, 460 165"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />

              {/* Current inspection cursor */}
              {(() => {
                const curX = 40 + (hpi / 48) * 420;
                return (
                  <g>
                    <line x1={curX} y1="20" x2={curX} y2="190" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx={curX} cy={110} r="4" fill="#10b981" />
                    <text x={curX} y="15" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">
                      {hpi} hpi
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Interpretation narrative */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Current Phase Synthesis: </span>
            At <strong>{hpi} hpi</strong>, defense lncRNA is induced at <strong>+{log2fc} Log2FC</strong>. Stomatal conductance has declined to <strong>{gs} mmol m<sup>-2</sup> s<sup>-1</sup></strong>, inducing a canopy thermal depression of <strong>+{deltaT}&deg;C</strong>. EBSDI stands at <strong>{currentSignature.ebsdiScore}/100</strong> ({currentSignature.pathogenRiskLevel}). This corroborates with the plant immune response hypothesis formulated by Prof. Lalit Kharbikar at ICAR-NIBSM.
          </div>
        </div>
      </div>

      {/* Multimodal Photo, Thermogram & Micrograph Analysis Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-600" />
              Multimodal Plant Disease & Thermal Image Analyzer
            </h3>
            <p className="text-xs text-slate-500">
              Upload leaf lesion photos, FLIR thermal infrared false-color images, or stomatal aperture micrographs for analysis using Gemini 4 Argon.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Sample images:</span>
            <button
              onClick={() => loadSampleImage('thermal')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                imageType === 'thermal' ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'bg-slate-50 text-slate-600'
              }`}
            >
              Thermal IR Thermogram
            </button>
            <button
              onClick={() => loadSampleImage('micrograph')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                imageType === 'micrograph' ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'bg-slate-50 text-slate-600'
              }`}
            >
              Stomatal Micrograph
            </button>
            <button
              onClick={() => loadSampleImage('leaf')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                imageType === 'leaf' ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'bg-slate-50 text-slate-600'
              }`}
            >
              Foliar Blast Lesion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Image View / Upload Box */}
          <div className="md:col-span-5 space-y-3">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
              {imageFile ? (
                <div className="space-y-2">
                  <img
                    src={imageFile}
                    alt="Analyzed plant sample"
                    className="max-h-56 mx-auto rounded-lg shadow-xs border border-slate-200 object-contain bg-slate-900"
                  />
                  <label className="inline-block text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                    <span>Replace image</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block py-8">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Upload plant photo or thermogram
                  </span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, SVG or click a sample above</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Custom Research Prompt (Optional)
              </label>
              <input
                type="text"
                value={imageCustomPrompt}
                onChange={(e) => setImageCustomPrompt(e.target.value)}
                placeholder="e.g. Estimate stomatal closure percentage and recommend lncRNA biomarkers..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={handleAnalyzeImageWithGemini}
              disabled={!imageFile || isAnalyzingImage}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzingImage ? 'Analyzing with Gemini 4 Argon...' : 'Analyze Image with Gemini 4 Argon'}</span>
            </button>
          </div>

          {/* Results Box */}
          <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  Gemini 4 Argon Pathology & Thermographic Evaluation
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                  Model: gemini-4-argon
                </span>
              </div>

              {isAnalyzingImage ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Processing multimodal imagery and extracting biophysical metrics...</p>
                </div>
              ) : imageAnalysisResult ? (
                <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line max-h-72 overflow-y-auto pr-1">
                  {imageAnalysisResult}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Upload an image or pick a sample on the left, then click "Analyze Image with Gemini 4 Argon" to receive deep visual diagnostic findings.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
