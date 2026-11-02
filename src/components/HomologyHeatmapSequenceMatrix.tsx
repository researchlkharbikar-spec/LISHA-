/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA D3-Based Homology Heatmap Sequence Matrix Component
 * Illustrates identity percentages between target lncRNA and retrieved database homologs
 * across a segmented sequence matrix with column conservation profiling.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  calculateHomologySequenceMatrix,
  type SequenceMatrixCell,
  type HomologySequenceMatrixResult,
} from '../utils/homologyMatrixCalculator';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';
import {
  Grid,
  Filter,
  Download,
  Copy,
  Check,
  Palette,
  Sparkles,
  Layers,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Maximize2,
  X,
} from 'lucide-react';

interface HomologyHeatmapSequenceMatrixProps {
  querySequence: string;
  queryName?: string;
  onSelectHomologForDetailedScreening?: (homolog: CuratedLncRNA) => void;
}

type ColorPalette = 'ylgnbu' | 'viridis' | 'blues' | 'turbo' | 'magma' | 'spectral';

export const HomologyHeatmapSequenceMatrix: React.FC<HomologyHeatmapSequenceMatrixProps> = ({
  querySequence,
  queryName = 'Target lncRNA',
  onSelectHomologForDetailedScreening,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Configuration states
  const [blockSize, setBlockSize] = useState<number>(10);
  const [palette, setPalette] = useState<ColorPalette>('ylgnbu');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'globalIdentity' | 'peakIdentity' | 'name'>('globalIdentity');
  const [inspectedCell, setInspectedCell] = useState<SequenceMatrixCell | null>(null);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Filter homologs by species
  const activeHomologs = useMemo(() => {
    if (speciesFilter === 'All') return CURATED_LNCRNAS;
    return CURATED_LNCRNAS.filter((h) => h.species.toLowerCase().includes(speciesFilter.toLowerCase()));
  }, [speciesFilter]);

  // Compute homology matrix
  const matrixResult: HomologySequenceMatrixResult = useMemo(() => {
    return calculateHomologySequenceMatrix(querySequence, activeHomologs, blockSize);
  }, [querySequence, activeHomologs, blockSize]);

  // Sort rows
  const sortedHomologIndices = useMemo(() => {
    const indices = activeHomologs.map((_, i) => i);
    return indices.sort((a, b) => {
      const summaryA = matrixResult.rowSummaries[a];
      const summaryB = matrixResult.rowSummaries[b];
      if (!summaryA || !summaryB) return 0;

      if (sortBy === 'globalIdentity') {
        return summaryB.globalIdentityPercent - summaryA.globalIdentityPercent;
      }
      if (sortBy === 'peakIdentity') {
        return summaryB.peakIdentityPercent - summaryA.peakIdentityPercent;
      }
      return summaryA.homologName.localeCompare(summaryB.homologName);
    });
  }, [activeHomologs, matrixResult, sortBy]);

  // Color interpolators
  const getInterpolator = (pal: ColorPalette) => {
    switch (pal) {
      case 'blues':
        return d3.interpolateBlues;
      case 'viridis':
        return d3.interpolateViridis;
      case 'turbo':
        return d3.interpolateTurbo;
      case 'magma':
        return d3.interpolateMagma;
      case 'spectral':
        return (t: number) => d3.interpolateSpectral(1 - t);
      case 'ylgnbu':
      default:
        return d3.interpolateYlGnBu;
    }
  };

  // D3 Heatmap Rendering
  useEffect(() => {
    if (!svgRef.current || matrixResult.columnsCount === 0 || activeHomologs.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const tooltip = d3.select(tooltipRef.current);

    const numCols = matrixResult.columnsCount;
    const numRows = activeHomologs.length;

    const margin = { top: 90, right: 140, bottom: 65, left: 185 };
    const baseCellWidth = Math.max(34, Math.min(65, Math.floor(620 / numCols)));
    const cellHeight = 36;
    const innerWidth = numCols * baseCellWidth;
    const innerHeight = numRows * cellHeight;
    const totalWidth = innerWidth + margin.left + margin.right;
    const totalHeight = innerHeight + margin.top + margin.bottom;

    svg
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Color Scale
    const interpolator = getInterpolator(palette);
    const colorScale = d3.scaleSequential(interpolator).domain([0, 100]);

    // Top Column Conservation Bar Chart (Track above matrix)
    const topBarHeight = 38;
    const topBarScale = d3.scaleLinear().domain([0, 100]).range([topBarHeight, 0]);

    const topTrackG = g
      .append('g')
      .attr('class', 'conservation-track')
      .attr('transform', `translate(0, ${-topBarHeight - 20})`);

    // Top track label
    topTrackG
      .append('text')
      .attr('x', -8)
      .attr('y', topBarHeight / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text('Mean Conservation %:');

    // Conservation bars
    matrixResult.columnSummaries.forEach((col, cIdx) => {
      const x = cIdx * baseCellWidth;
      const barH = topBarHeight - topBarScale(col.meanIdentityPercent);
      const y = topBarScale(col.meanIdentityPercent);

      topTrackG
        .append('rect')
        .attr('x', x + 2)
        .attr('y', y)
        .attr('width', baseCellWidth - 4)
        .attr('height', barH)
        .attr('rx', 2)
        .attr('fill', colorScale(col.meanIdentityPercent))
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 0.5)
        .attr('cursor', 'pointer')
        .on('mouseenter', (event) => {
          tooltip.style('opacity', 1).html(`
            <div class="font-bold text-slate-800">Sequence Column ${col.startPos}–${col.endPos} nt</div>
            <div class="text-[11px] text-teal-700 font-semibold">Mean Identity: ${col.meanIdentityPercent}%</div>
            <div class="text-[10px] text-slate-500">Highest Match: ${col.topHomologName} (${col.maxIdentityPercent}%)</div>
            <div class="font-mono text-[10px] bg-slate-100 p-1 rounded mt-1 text-slate-800">${col.consensusPattern}</div>
          `);
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', `${event.clientX + 14}px`)
            .style('top', `${event.clientY + 14}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', 0));
    });

    // Column Header Coordinate Labels
    const colLabelsG = g.append('g').attr('class', 'col-labels');
    matrixResult.columnSummaries.forEach((col, cIdx) => {
      const x = cIdx * baseCellWidth + baseCellWidth / 2;

      colLabelsG
        .append('text')
        .attr('x', x)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#334155')
        .attr('font-size', '9.5px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '700')
        .text(`${col.startPos}–${col.endPos}`);
    });

    // Heatmap Matrix Cells
    sortedHomologIndices.forEach((rowIdx, visualRowIdx) => {
      const homolog = activeHomologs[rowIdx];
      const rowY = visualRowIdx * cellHeight;
      const rowSummary = matrixResult.rowSummaries[rowIdx];

      // Y-Axis Homolog Label (left)
      const labelG = g
        .append('g')
        .attr('transform', `translate(-10, ${rowY + cellHeight / 2})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (onSelectHomologForDetailedScreening) {
            onSelectHomologForDetailedScreening(homolog);
          }
        });

      labelG
        .append('text')
        .attr('text-anchor', 'end')
        .attr('y', -3)
        .attr('fill', '#0f172a')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(homolog.name);

      labelG
        .append('text')
        .attr('text-anchor', 'end')
        .attr('y', 10)
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .text(`${homolog.species} • ${homolog.diseaseName.slice(0, 18)}`);

      // Cells across columns
      for (let c = 0; c < numCols; c++) {
        const cell = matrixResult.cells[rowIdx][c];
        const cellX = c * baseCellWidth;
        const idPct = cell.identityPercent;
        const bgColor = colorScale(idPct);
        const textColor = idPct > 65 || (palette === 'viridis' && idPct > 40) ? '#ffffff' : '#0f172a';

        const cellG = g
          .append('g')
          .attr('transform', `translate(${cellX}, ${rowY})`)
          .attr('cursor', 'pointer')
          .on('click', () => setInspectedCell(cell));

        // Cell rect
        cellG
          .append('rect')
          .attr('x', 1)
          .attr('y', 1)
          .attr('width', baseCellWidth - 2)
          .attr('height', cellHeight - 2)
          .attr('rx', 3)
          .attr('fill', bgColor)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 0.5)
          .on('mouseenter', function (event) {
            d3.select(this)
              .attr('stroke', '#0284c7')
              .attr('stroke-width', 2)
              .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

            tooltip.style('opacity', 1).html(`
              <div class="space-y-1">
                <div class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between gap-2">
                  <span>${cell.homologName}</span>
                  <span class="text-[10px] text-slate-500 font-normal">(${cell.homologSpecies})</span>
                </div>
                <div class="flex items-center justify-between text-[11px] pt-0.5">
                  <span class="text-slate-500">Query Window:</span>
                  <span class="font-mono font-bold text-slate-800">${cell.startPos}–${cell.endPos} nt (${cell.length} nt)</span>
                </div>
                <div class="flex items-center justify-between text-xs font-bold pt-0.5">
                  <span class="text-slate-600">Identity Percentage:</span>
                  <span class="text-teal-700 text-sm font-mono">${cell.identityPercent}%</span>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Matches:</span>
                  <span class="font-mono font-semibold">${cell.matchesCount} / ${cell.length} bases</span>
                </div>
                <div class="pt-1 text-[10px] font-mono text-slate-700 bg-slate-100 p-1.5 rounded space-y-0.5 select-all">
                  <div>Q: ${cell.subQuerySeq}</div>
                  <div>H: ${cell.homologMatchSlice}</div>
                </div>
                <div class="text-[9px] text-indigo-600 font-sans italic pt-0.5">Click cell to inspect full alignment slice</div>
              </div>
            `);
          })
          .on('mousemove', function (event) {
            tooltip
              .style('left', `${event.clientX + 14}px`)
              .style('top', `${event.clientY + 14}px`);
          })
          .on('mouseleave', function () {
            d3.select(this)
              .attr('stroke', '#cbd5e1')
              .attr('stroke-width', 0.5)
              .attr('filter', null);
            tooltip.style('opacity', 0);
          });

        // Identity percentage text inside cell
        cellG
          .append('text')
          .attr('x', baseCellWidth / 2)
          .attr('y', cellHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', textColor)
          .attr('font-size', baseCellWidth < 40 ? '8.5px' : '10.5px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .attr('pointer-events', 'none')
          .text(`${Math.round(idPct)}%`);
      }

      // Right Column: Overall Identity Summary Track
      const summaryG = g
        .append('g')
        .attr('transform', `translate(${innerWidth + 12}, ${rowY + cellHeight / 2})`);

      // Progress bar background
      summaryG
        .append('rect')
        .attr('x', 0)
        .attr('y', -6)
        .attr('width', 65)
        .attr('height', 12)
        .attr('rx', 3)
        .attr('fill', '#e2e8f0');

      // Progress bar fill
      if (rowSummary) {
        summaryG
          .append('rect')
          .attr('x', 0)
          .attr('y', -6)
          .attr('width', Math.max(2, (rowSummary.globalIdentityPercent / 100) * 65))
          .attr('height', 12)
          .attr('rx', 3)
          .attr('fill', colorScale(rowSummary.globalIdentityPercent));

        // Percentage text
        summaryG
          .append('text')
          .attr('x', 72)
          .attr('y', 4)
          .attr('fill', '#1e293b')
          .attr('font-size', '10px')
          .attr('font-weight', '800')
          .attr('font-family', 'monospace')
          .text(`${rowSummary.globalIdentityPercent}%`);
      }
    });

    // Right track header
    g.append('text')
      .attr('x', innerWidth + 12)
      .attr('y', -10)
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text('Overall Identity');

    // Bottom Color Gradient Legend
    const legendY = innerHeight + 25;
    const legendWidth = 260;
    const legendHeight = 12;

    const legendGradId = `homology-matrix-legend-${palette}`;
    const linearGrad = defs
      .append('linearGradient')
      .attr('id', legendGradId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      linearGrad
        .append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', interpolator(t));
    }

    const legendG = g.append('g').attr('transform', `translate(0, ${legendY})`);

    legendG
      .append('text')
      .attr('x', 0)
      .attr('y', -6)
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(`Identity Percentage Ramp (0% Divergent → 100% Identical):`);

    legendG
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .attr('fill', `url(#${legendGradId})`)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 0.8);

    // Legend ticks
    const tickValues = [0, 25, 50, 75, 100];
    tickValues.forEach((tick) => {
      const tickX = (tick / 100) * legendWidth;
      legendG
        .append('text')
        .attr('x', tickX)
        .attr('y', legendHeight + 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(`${tick}%`);
    });
  }, [matrixResult, activeHomologs, palette, sortedHomologIndices, blockSize]);

  // Export handlers
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LISHA_Homology_Heatmap_${queryName.replace(/\s+/g, '_')}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (matrixResult.cells.length === 0) return;
    const headers = ['Homolog_Name', 'Species', 'Disease', ...matrixResult.columnSummaries.map((c) => `Pos_${c.startPos}_${c.endPos}_nt`), 'Global_Identity_Pct'];
    const rows = sortedHomologIndices.map((rowIdx) => {
      const homolog = activeHomologs[rowIdx];
      const summary = matrixResult.rowSummaries[rowIdx];
      const cellValues = matrixResult.cells[rowIdx].map((c) => c.identityPercent);
      return [
        `"${homolog.name}"`,
        `"${homolog.species}"`,
        `"${homolog.diseaseName}"`,
        ...cellValues,
        summary?.globalIdentityPercent || 0,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LISHA_Homology_Matrix_${queryName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = () => {
    if (matrixResult.cells.length === 0) return;
    const headers = ['Homolog_Name', 'Species', 'Disease', ...matrixResult.columnSummaries.map((c) => `Pos_${c.startPos}_${c.endPos}_nt`), 'Global_Identity_Pct'];
    const rows = sortedHomologIndices.map((rowIdx) => {
      const homolog = activeHomologs[rowIdx];
      const summary = matrixResult.rowSummaries[rowIdx];
      const cellValues = matrixResult.cells[rowIdx].map((c) => c.identityPercent);
      return [
        `"${homolog.name}"`,
        `"${homolog.species}"`,
        `"${homolog.diseaseName}"`,
        ...cellValues,
        summary?.globalIdentityPercent || 0,
      ].join(',');
    });

    navigator.clipboard.writeText([headers.join(','), ...rows].join('\n'));
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Floating Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none z-50 bg-white/98 backdrop-blur-md border border-slate-300 rounded-xl p-3 shadow-2xl text-xs transition-opacity duration-150 opacity-0 max-w-sm"
      />

      {/* Header and Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <Grid className="w-3 h-3 text-amber-700" />
              <span>D3.js Sequence Heatmap</span>
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Homology Heatmap Sequence Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Displays localized nucleotide identity percentages (%) across {queryName} segmented into sequence windows against
            curated plant biotic/abiotic stress lncRNA homologs.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Block Size Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Window:</span>
            <select
              value={blockSize}
              onChange={(e) => setBlockSize(Number(e.target.value))}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value={5}>5 nt (Fine-grained)</option>
              <option value={10}>10 nt (Standard block)</option>
              <option value={15}>15 nt</option>
              <option value={20}>20 nt (Macro-domain)</option>
            </select>
          </div>

          {/* Color Palette Selector */}
          <div className="flex items-center gap-1 text-xs">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value as any)}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ylgnbu">YlGnBu (Yellow-Green-Blue)</option>
              <option value="viridis">Viridis (Perceptual)</option>
              <option value="blues">Blues (Monochrome)</option>
              <option value="turbo">Turbo (High-contrast)</option>
              <option value="magma">Magma (Warm)</option>
              <option value="spectral">Spectral</option>
            </select>
          </div>

          {/* Species Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="All">All Organisms</option>
              <option value="Oryza">Rice (Oryza)</option>
              <option value="Solanum">Tomato (Solanum)</option>
              <option value="Arabidopsis">Arabidopsis</option>
              <option value="Gossypium">Cotton (Gossypium)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs py-1 px-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="globalIdentity">Sort: Overall Identity %</option>
              <option value="peakIdentity">Sort: Peak Local Identity %</option>
              <option value="name">Sort: Homolog Name</option>
            </select>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportSvg}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Download D3 SVG Figure"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportCsv}
              className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Export Heatmap Matrix CSV"
            >
              CSV
            </button>
            <button
              onClick={handleCopyCsv}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Copy CSV to clipboard"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Query Length</span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">{matrixResult.queryLength} nt</div>
          <div className="text-[10px] text-slate-500">{matrixResult.columnsCount} blocks of {matrixResult.blockSize} nt</div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Mean Global Identity</span>
          <div className="text-base font-extrabold text-amber-900 mt-0.5">{matrixResult.meanGlobalIdentity}%</div>
          <div className="text-[10px] text-amber-700">Across {activeHomologs.length} database homologs</div>
        </div>

        <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200">
          <span className="text-[10px] font-bold uppercase text-teal-700 block">Top Matching Homolog</span>
          <div className="text-xs font-bold text-teal-900 mt-1 truncate" title={matrixResult.highestIdentityHomolog}>
            {matrixResult.highestIdentityHomolog}
          </div>
          <div className="text-[10px] text-teal-700">Highest pairwise alignment</div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
          <span className="text-[10px] font-bold uppercase text-blue-700 block">Matrix Dimensions</span>
          <div className="text-base font-extrabold text-blue-900 mt-0.5">
            {activeHomologs.length} × {matrixResult.columnsCount}
          </div>
          <div className="text-[10px] text-blue-700">{activeHomologs.length * matrixResult.columnsCount} identity cells computed</div>
        </div>
      </div>

      {/* D3 Heatmap SVG Canvas */}
      <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/30 p-2">
        <svg ref={svgRef} className="w-full h-auto min-w-[700px] select-none" />
      </div>

      {/* Selected Cell Alignment Slice Drawer / Modal */}
      {inspectedCell && (
        <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                Inspected Sequence Block
              </span>
              <h4 className="font-bold text-sm text-slate-900 mt-1">
                {inspectedCell.homologName} vs {queryName} (Pos {inspectedCell.startPos}–{inspectedCell.endPos})
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Organism: {inspectedCell.homologSpecies} | Disease: {inspectedCell.homologDisease}
              </p>
            </div>
            <button
              onClick={() => setInspectedCell(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Local Identity %</span>
              <div className="text-base font-extrabold text-teal-700 mt-0.5">{inspectedCell.identityPercent}%</div>
              <div className="text-[10px] text-slate-500">{inspectedCell.matchesCount} identical nucleotides</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Local Similarity %</span>
              <div className="text-base font-extrabold text-blue-700 mt-0.5">{inspectedCell.similarityPercent}%</div>
              <div className="text-[10px] text-slate-500">Physicochemical equivalence</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Block Span</span>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">{inspectedCell.length} nt</div>
              <div className="text-[10px] text-slate-500">Query slice</div>
            </div>
          </div>

          {/* Alignment Slice Text */}
          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs space-y-1 select-all">
            <div className="text-slate-400 text-[10px] font-sans">Query lncRNA ({inspectedCell.startPos}–{inspectedCell.endPos}):</div>
            <div className="text-emerald-400 tracking-widest font-bold">{inspectedCell.subQuerySeq}</div>
            <div className="text-slate-400 text-[10px] font-sans pt-1">Homolog Matched Target:</div>
            <div className="text-cyan-400 tracking-widest font-bold">{inspectedCell.homologMatchSlice}</div>
          </div>
        </div>
      )}
    </div>
  );
};
