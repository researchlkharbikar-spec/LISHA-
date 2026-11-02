/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Secondary Structure Energy Stability Plot Component
 * Built with Recharts: Visualizes folding free energy (ΔG°37) profiles,
 * structural stability valleys, and flexible loop accessibility across the lncRNA.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
} from 'recharts';
import {
  Activity,
  Sliders,
  Download,
  Copy,
  Check,
  TrendingDown,
  Sparkles,
  Shield,
  Layers,
  Info,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  calculateEnergyProfile,
  type EnergyDataPoint,
  type EnergyProfileResult,
} from '../utils/energyProfileCalculator';

interface SecondaryStructureEnergyPlotProps {
  sequence: string;
  name?: string;
  onSelectPosition?: (pos: number) => void;
}

export const SecondaryStructureEnergyPlot: React.FC<SecondaryStructureEnergyPlotProps> = ({
  sequence,
  name = 'Query lncRNA',
  onSelectPosition,
}) => {
  // Configurable options
  const [windowSize, setWindowSize] = useState<number>(25);
  const [showGcOverlay, setShowGcOverlay] = useState<boolean>(true);
  const [showThresholdLines, setShowThresholdLines] = useState<boolean>(true);
  const [showDomainList, setShowDomainList] = useState<boolean>(true);
  const [copiedData, setCopiedData] = useState<boolean>(false);

  // Calculate sliding-window profile
  const profile: EnergyProfileResult = useMemo(() => {
    return calculateEnergyProfile(sequence, windowSize);
  }, [sequence, windowSize]);

  const { dataPoints, summary } = profile;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: EnergyDataPoint = payload[0].payload;
      const isDuplex = data.structureState === 'Stable Duplex';
      const isLoop = data.structureState === 'Flexible Loop / Accessible';

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 font-sans min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1">
            <span className="font-bold text-slate-300">
              Position {data.position}{' '}
              <span className="font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold ml-1">
                {data.base}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Window {data.windowStart}–{data.windowEnd}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Folding Free Energy:</span>
            <span className="font-mono font-bold text-teal-300 text-sm">
              {data.deltaG} kcal/mol
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Local GC Content:</span>
            <span className="font-mono font-semibold text-cyan-300">
              {data.gcPercent}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Base-Pairs in Window:</span>
            <span className="font-mono font-semibold text-indigo-300">
              {data.basePairsCount} bp
            </span>
          </div>

          <div className="pt-1 border-t border-slate-700 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Conformation:</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isDuplex
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : isLoop
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {data.structureState}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Export handlers
  const handleExportCsv = () => {
    if (dataPoints.length === 0) return;
    const header = 'Position,Base,Window_Start,Window_End,DeltaG_kcal_mol,GC_Percent,Base_Pairs_Count,Accessibility_Score,Structure_State\n';
    const rows = dataPoints.map((d) =>
      [
        d.position,
        `"${d.base}"`,
        d.windowStart,
        d.windowEnd,
        d.deltaG,
        d.gcPercent,
        d.basePairsCount,
        d.accessibilityScore,
        `"${d.structureState}"`,
      ].join(',')
    );
    const csvContent = header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${name}_energy_stability_profile.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsv = () => {
    if (dataPoints.length === 0) return;
    const header = 'Position,Base,Window_Start,Window_End,DeltaG_kcal_mol,GC_Percent,Base_Pairs_Count,Accessibility_Score,Structure_State\n';
    const rows = dataPoints.map((d) =>
      [
        d.position,
        `"${d.base}"`,
        d.windowStart,
        d.windowEnd,
        d.deltaG,
        d.gcPercent,
        d.basePairsCount,
        d.accessibilityScore,
        `"${d.structureState}"`,
      ].join(',')
    );
    navigator.clipboard.writeText(header + rows.join('\n'));
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  if (dataPoints.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-slate-700">Sequence Too Short for Energy Profiling</h4>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
          Please submit an lncRNA sequence with at least 8 nucleotides to calculate sliding-window folding energy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-4 p-5">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-800 border border-teal-200">
              Recharts Biophysical Engine
            </span>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Secondary Structure Energy Stability Profile Plot
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sliding-window folding free energy ($\Delta G^\circ_{37}$) across length of {name}. Valleys indicate stable double-stranded stems; peaks indicate flexible open loops.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Window size buttons */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Window:</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[15, 25, 40].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setWindowSize(sz)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    windowSize === sz ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sz} nt
                </button>
              ))}
            </div>
          </div>

          {/* Toggle GC Overlay */}
          <button
            onClick={() => setShowGcOverlay((v) => !v)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              showGcOverlay
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            GC% Overlay
          </button>

          {/* Toggle Threshold Lines */}
          <button
            onClick={() => setShowThresholdLines((v) => !v)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              showThresholdLines
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Thresholds
          </button>

          {/* Export Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCsv}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Download Energy Profile CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyCsv}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Copy Profile Data to Clipboard"
            >
              {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Key Energy Features */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Mean Folding ΔG°</span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">
            {summary.meanDeltaG} <span className="text-[10px] font-normal text-slate-500">kcal/mol</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Global sequence average</div>
        </div>

        <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
          <span className="text-[10px] font-bold uppercase text-teal-700 block flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-teal-600" />
            <span>Deepest Core Stability</span>
          </span>
          <div className="text-base font-extrabold text-teal-900 mt-0.5">
            {summary.minDeltaG} <span className="text-[10px] font-normal text-teal-700">kcal/mol</span>
          </div>
          <div className="text-[10px] text-teal-700 font-mono mt-0.5">Position {summary.minDeltaGPos} (Stem Core)</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
          <span className="text-[10px] font-bold uppercase text-amber-700 block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Peak Loop Flexibility</span>
          </span>
          <div className="text-base font-extrabold text-amber-900 mt-0.5">
            {summary.maxDeltaG} <span className="text-[10px] font-normal text-amber-700">kcal/mol</span>
          </div>
          <div className="text-[10px] text-amber-700 font-mono mt-0.5">Position {summary.maxDeltaGPos} (Accessible Pocket)</div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
          <span className="text-[10px] font-bold uppercase text-indigo-700 block">Structural Domains</span>
          <div className="text-base font-extrabold text-indigo-900 mt-0.5">
            {summary.stableDomainsCount} Stems / {summary.flexiblePocketsCount} Loops
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Continuous structural clusters</div>
        </div>
      </div>

      {/* Main Recharts Visualization Plot */}
      <div className="w-full bg-slate-50/40 rounded-xl border border-slate-200 p-3 pt-5">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dataPoints}
              margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0] && onSelectPosition) {
                  onSelectPosition(e.activePayload[0].payload.position);
                }
              }}
            >
              <defs>
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

              <XAxis
                dataKey="position"
                stroke="#64748b"
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val} nt`}
                interval="preserveStartEnd"
              />

              {/* Primary Y-Axis: Folding Free Energy (kcal/mol) */}
              <YAxis
                yAxisId="energy"
                stroke="#0f766e"
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val}k`}
                domain={['dataMin - 1', 'dataMax + 1']}
                label={{
                  value: 'ΔG° (kcal/mol)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#0f766e',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              {/* Secondary Y-Axis: Local GC% */}
              {showGcOverlay && (
                <YAxis
                  yAxisId="gc"
                  orientation="right"
                  stroke="#0284c7"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                  label={{
                    value: 'GC Content (%)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#0284c7',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={30}
                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              />

              {/* Optional Reference Lines */}
              {showThresholdLines && (
                <>
                  <ReferenceLine
                    yAxisId="energy"
                    y={summary.meanDeltaG}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mean ΔG: ${summary.meanDeltaG}k`,
                      fill: '#64748b',
                      fontSize: 9,
                      position: 'insideBottomRight',
                    }}
                  />
                  <ReferenceLine
                    yAxisId="energy"
                    y={-5.0}
                    stroke="#059669"
                    strokeDasharray="2 2"
                    label={{
                      value: 'Rigid Core Threshold (-5.0 kcal/mol)',
                      fill: '#059669',
                      fontSize: 9,
                      position: 'insideTopLeft',
                    }}
                  />
                </>
              )}

              {/* Area for Free Energy Profile */}
              <Area
                yAxisId="energy"
                type="monotone"
                dataKey="deltaG"
                name="Folding Free Energy (ΔG°37)"
                stroke="#0d9488"
                strokeWidth={2.5}
                fill="url(#energyGradient)"
                activeDot={{ r: 5, stroke: '#0f766e', strokeWidth: 2, fill: '#ffffff' }}
              />

              {/* GC Content Overlay Line */}
              {showGcOverlay && (
                <Line
                  yAxisId="gc"
                  type="monotone"
                  dataKey="gcPercent"
                  name="Local GC Content (%)"
                  stroke="#0284c7"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}

              {/* Sequence Scrubbing Brush */}
              <Brush
                dataKey="position"
                height={22}
                stroke="#0d9488"
                fill="#f1f5f9"
                tickFormatter={(pos) => `${pos}nt`}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-2 pt-1">
          <span>5' Terminal</span>
          <span>Interactive Zoom & Pan (Drag the bottom brush bar to zoom into specific regions)</span>
          <span>3' Terminal</span>
        </div>
      </div>

      {/* Identified Structural Domains Accordion */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setShowDomainList((s) => !s)}
          className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">
              Identified Structural Domains & Accessible Loop Pockets ({summary.stableDomains.length + summary.flexiblePockets.length})
            </span>
          </div>
          {showDomainList ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showDomainList && (
          <div className="p-4 space-y-4 divide-y divide-slate-100">
            {/* Stable Domains */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                Stable Structural Stems (Energy Valleys)
              </span>
              {summary.stableDomains.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No continuous stable stem domains detected at current window size.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {summary.stableDomains.map((dom, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-teal-200 bg-teal-50/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-teal-900 font-mono">
                          Pos {dom.start}–{dom.end} ({dom.length} nt)
                        </span>
                        <span className="text-teal-700 font-extrabold font-mono">
                          {dom.minDeltaG} kcal/mol
                        </span>
                      </div>
                      <div className="text-[10px] text-teal-800/80 font-mono break-all truncate">
                        {dom.sequence}
                      </div>
                      <div className="text-[10px] text-slate-500">{dom.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flexible Loops */}
            <div className="space-y-2 pt-3">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Flexible Open Loops & Interaction Pockets (Energy Peaks)
              </span>
              {summary.flexiblePockets.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No distinct open loop pockets detected at current window size.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {summary.flexiblePockets.map((pkt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-amber-900 font-mono">
                          Pos {pkt.start}–{pkt.end} ({pkt.length} nt)
                        </span>
                        <span className="text-amber-700 font-extrabold font-mono">
                          {pkt.maxDeltaG} kcal/mol
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-800/80 font-mono break-all truncate">
                        {pkt.sequence}
                      </div>
                      <div className="text-[10px] text-slate-500">{pkt.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
