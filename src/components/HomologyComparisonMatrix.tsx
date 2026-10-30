/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA D3-Based Homology Comparison Matrix Component
 * Provides an interactive comparative heatmap & dot-plot synteny visualizer
 * for the selected lncRNA sequence against curated plant biotic stress templates.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  type TemplateHomologyComparison,
  compareQueryAgainstTemplates,
  generateDotPlotMatrix,
  type DotPlotMatrixData,
} from '../utils/bioCalculations';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';
import {
  BarChart2,
  Grid,
  Filter,
  ArrowUpDown,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  Palette,
  FileCode,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react';

interface HomologyComparisonMatrixProps {
  querySequence: string;
  queryName: string;
  onSelectTemplateForAlignment?: (template: CuratedLncRNA) => void;
}

type PaletteType = 'blues' | 'viridis' | 'magma' | 'gnbu' | 'spectral';

export const HomologyComparisonMatrix: React.FC<HomologyComparisonMatrixProps> = ({
  querySequence,
  queryName,
  onSelectTemplateForAlignment,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dotPlotSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // States
  const [selectedMetric, setSelectedMetric] = useState<
    'compositeHomologyScore' | 'identityPercent' | 'score' | 'structureSimilarityPercent'
  >('compositeHomologyScore');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [pathogenFilter, setPathogenFilter] = useState<string>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CURATED_LNCRNAS[0].id);
  const [viewMode, setViewMode] = useState<'heatmap' | 'dotplot'>('heatmap');
  const [palette, setPalette] = useState<PaletteType>('viridis');
  const [dotPlotWindow, setDotPlotWindow] = useState<number>(7);
  const [dotPlotStringency, setDotPlotStringency] = useState<number>(5);

  // 1. Calculate comparisons against templates
  const comparisons: TemplateHomologyComparison[] = useMemo(() => {
    return compareQueryAgainstTemplates(querySequence, CURATED_LNCRNAS);
  }, [querySequence]);

  // Filter & sort
  const filteredAndSortedComparisons = useMemo(() => {
    return comparisons
      .filter((c) => {
        const matchesSpecies = speciesFilter === 'All' || c.species === speciesFilter;
        const matchesPathogen = pathogenFilter === 'All' || c.pathogenType === pathogenFilter;
        return matchesSpecies && matchesPathogen;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (selectedMetric === 'compositeHomologyScore') {
          valA = a.compositeHomologyScore;
          valB = b.compositeHomologyScore;
        } else if (selectedMetric === 'identityPercent') {
          valA = a.alignment.identityPercent;
          valB = b.alignment.identityPercent;
        } else if (selectedMetric === 'score') {
          valA = a.alignment.score;
          valB = b.alignment.score;
        } else {
          valA = a.structureSimilarityPercent;
          valB = b.structureSimilarityPercent;
        }
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [comparisons, speciesFilter, pathogenFilter, selectedMetric, sortOrder]);

  const selectedTemplate = useMemo(() => {
    return (
      CURATED_LNCRNAS.find((t) => t.id === selectedTemplateId) ||
      CURATED_LNCRNAS[0]
    );
  }, [selectedTemplateId]);

  const selectedComparison = useMemo(() => {
    return (
      comparisons.find((c) => c.templateId === selectedTemplateId) ||
      comparisons[0]
    );
  }, [comparisons, selectedTemplateId]);

  // Dot plot data
  const dotPlotData: DotPlotMatrixData = useMemo(() => {
    return generateDotPlotMatrix(
      querySequence,
      selectedTemplate.sequence,
      dotPlotWindow,
      dotPlotStringency
    );
  }, [querySequence, selectedTemplate, dotPlotWindow, dotPlotStringency]);

  // Interpolator selection
  const getInterpolator = (p: PaletteType) => {
    switch (p) {
      case 'blues':
        return d3.interpolateBlues;
      case 'magma':
        return d3.interpolateMagma;
      case 'gnbu':
        return d3.interpolateGnBu;
      case 'spectral':
        return d3.interpolateSpectral;
      case 'viridis':
      default:
        return d3.interpolateViridis;
    }
  };

  // 2. D3 Heatmap Matrix Rendering
  useEffect(() => {
    if (!svgRef.current || viewMode !== 'heatmap') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const data = filteredAndSortedComparisons;
    if (data.length === 0) return;

    const margin = { top: 65, right: 120, bottom: 65, left: 195 };
    const width = 840;
    const height = Math.max(380, data.length * 46 + margin.top + margin.bottom);

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    // Defs for gradients
    const defs = svg.append('defs');

    // Main drawing group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const columns = [
      { key: 'compositeHomologyScore', label: 'Composite Score', unit: '%' },
      { key: 'identityPercent', label: 'Sequence Identity', unit: '%' },
      { key: 'score', label: 'Bit Score', unit: '' },
      { key: 'structureSimilarityPercent', label: '2D Fold Match', unit: '%' },
      { key: 'gcDifference', label: '|ΔGC%| Shift', unit: '%' },
    ];

    const innerWidth = width - margin.left - margin.right;
    const cellWidth = innerWidth / columns.length;
    const cellHeight = 38;

    // Scales
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.templateName))
      .range([0, data.length * cellHeight])
      .padding(0.12);

    const xScale = d3
      .scaleBand()
      .domain(columns.map((c) => c.key))
      .range([0, innerWidth])
      .padding(0.08);

    const interpolator = getInterpolator(palette);

    // Dynamic color scales based on metric
    const colorScalePrimary = d3.scaleSequential(interpolator).domain([0, 100]);
    const colorScaleScore = d3.scaleSequential(interpolator).domain([0, 120]);

    // Tooltip helper
    const tooltip = d3.select(tooltipRef.current);

    // Column Headers
    const colHeaders = g.append('g').attr('class', 'column-headers');
    columns.forEach((col) => {
      const colX = (xScale(col.key) || 0) + cellWidth / 2;

      // Header background pill
      colHeaders
        .append('rect')
        .attr('x', (xScale(col.key) || 0) + 4)
        .attr('y', -34)
        .attr('width', cellWidth - 8)
        .attr('height', 24)
        .attr('rx', 4)
        .attr('fill', '#f1f5f9')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1);

      colHeaders
        .append('text')
        .attr('x', colX)
        .attr('y', -18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1e293b')
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .text(col.label);
    });

    // Row Labels (Templates with species and disease tag)
    const rowLabels = g.append('g').attr('class', 'row-labels');
    data.forEach((d) => {
      const rowY = (yScale(d.templateName) || 0) + cellHeight / 2;
      const isSelected = d.templateId === selectedTemplateId;

      const rowLabel = rowLabels
        .append('g')
        .attr('cursor', 'pointer')
        .on('click', () => setSelectedTemplateId(d.templateId));

      // Row background highlight
      if (isSelected) {
        rowLabel
          .append('rect')
          .attr('x', -margin.left + 8)
          .attr('y', yScale(d.templateName) || 0)
          .attr('width', width - 20)
          .attr('height', cellHeight)
          .attr('fill', '#f8fafc')
          .attr('stroke', '#d97706')
          .attr('stroke-width', 1.5)
          .attr('rx', 6);
      }

      // Template primary name
      rowLabel
        .append('text')
        .attr('x', -14)
        .attr('y', rowY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', isSelected ? '#b45309' : '#0f172a')
        .attr('font-size', '12px')
        .attr('font-weight', isSelected ? '800' : '600')
        .text(d.templateName);

      // Species & Pathosystem subtitle formatted concisely
      const shortHost = d.speciesCommon || d.species.split(' ')[0];
      const shortDisease = d.category || d.pathogen.split(' ').slice(0, 2).join(' ');
      rowLabel
        .append('text')
        .attr('x', -14)
        .attr('y', rowY + 10)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748b')
        .attr('font-size', '9.5px')
        .attr('font-style', 'italic')
        .text(`${shortHost} • ${shortDisease}`);
    });

    // Heatmap Matrix Cells
    data.forEach((row) => {
      columns.forEach((col) => {
        let rawVal = 0;
        let displayVal = '';
        let cellColor = '#e2e8f0';
        let textColor = '#0f172a';

        if (col.key === 'compositeHomologyScore') {
          rawVal = row.compositeHomologyScore;
          displayVal = `${rawVal}%`;
          cellColor = colorScalePrimary(rawVal);
          textColor = palette === 'blues' || palette === 'magma' || palette === 'viridis'
            ? rawVal > 55 ? '#ffffff' : '#0f172a'
            : '#0f172a';
        } else if (col.key === 'identityPercent') {
          rawVal = row.alignment.identityPercent;
          displayVal = `${rawVal}%`;
          cellColor = colorScalePrimary(rawVal);
          textColor = palette === 'blues' || palette === 'magma' || palette === 'viridis'
            ? rawVal > 55 ? '#ffffff' : '#0f172a'
            : '#0f172a';
        } else if (col.key === 'score') {
          rawVal = row.alignment.score;
          displayVal = `${rawVal}`;
          cellColor = colorScaleScore(rawVal);
          textColor = palette === 'blues' || palette === 'magma' || palette === 'viridis'
            ? rawVal > 60 ? '#ffffff' : '#0f172a'
            : '#0f172a';
        } else if (col.key === 'structureSimilarityPercent') {
          rawVal = row.structureSimilarityPercent;
          displayVal = `${rawVal}%`;
          cellColor = colorScalePrimary(rawVal);
          textColor = palette === 'blues' || palette === 'magma' || palette === 'viridis'
            ? rawVal > 55 ? '#ffffff' : '#0f172a'
            : '#0f172a';
        } else if (col.key === 'gcDifference') {
          rawVal = row.gcDifference;
          displayVal = `±${rawVal}%`;
          cellColor = rawVal < 5 ? '#bbf7d0' : rawVal < 12 ? '#fef08a' : '#fecaca';
          textColor = '#0f172a';
        }

        const cellGroup = g.append('g').attr('cursor', 'pointer');

        cellGroup
          .append('rect')
          .attr('x', xScale(col.key) || 0)
          .attr('y', yScale(row.templateName) || 0)
          .attr('width', cellWidth)
          .attr('height', cellHeight - 3)
          .attr('rx', 5)
          .attr('fill', cellColor)
          .attr('stroke', row.templateId === selectedTemplateId ? '#d97706' : '#cbd5e1')
          .attr('stroke-width', row.templateId === selectedTemplateId ? 1.5 : 0.8)
          .on('mouseover', (event) => {
            tooltip
              .style('opacity', '1')
              .style('left', `${event.pageX + 16}px`)
              .style('top', `${event.pageY - 30}px`).html(`
                <div class="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between gap-2">
                  <span>${row.templateName} &harr; ${queryName}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    row.confidenceTier === 'High Homology'
                      ? 'bg-emerald-100 text-emerald-800'
                      : row.confidenceTier === 'Moderate Homology'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }">${row.confidenceTier}</span>
                </div>
                <div class="text-[11px] text-slate-600 space-y-1">
                  <div><strong>Host Plant:</strong> ${row.species} (${row.speciesCommon})</div>
                  <div><strong>Pathosystem:</strong> ${row.pathogen} (${row.pathogenType})</div>
                  <div><strong>Primary Target:</strong> ${row.primaryTarget}</div>
                  <div class="pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span><strong>${col.label}:</strong></span>
                    <span class="font-mono font-bold text-amber-700 text-xs">${displayVal}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 italic">Click row to inspect full traceback & synteny</div>
                </div>
              `);
          })
          .on('mousemove', (event) => {
            tooltip
              .style('left', `${event.pageX + 16}px`)
              .style('top', `${event.pageY - 30}px`);
          })
          .on('mouseout', () => {
            tooltip.style('opacity', '0');
          })
          .on('click', () => {
            setSelectedTemplateId(row.templateId);
          });

        cellGroup
          .append('text')
          .attr('x', (xScale(col.key) || 0) + cellWidth / 2)
          .attr('y', (yScale(row.templateName) || 0) + cellHeight / 2 + 1)
          .attr('text-anchor', 'middle')
          .attr('fill', textColor)
          .attr('font-size', '11.5px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .attr('pointer-events', 'none')
          .text(displayVal);
      });

      // Confidence badge on right column
      const badgeX = innerWidth + 14;
      const badgeY = (yScale(row.templateName) || 0) + cellHeight / 2 + 3;
      const isHigh = row.confidenceTier === 'High Homology';
      const isMod = row.confidenceTier === 'Moderate Homology';

      g.append('text')
        .attr('x', badgeX)
        .attr('y', badgeY - 2)
        .attr('fill', isHigh ? '#059669' : isMod ? '#d97706' : '#94a3b8')
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .text(row.confidenceTier.replace(' Homology', ''));
    });

    // Color Legend at the bottom
    const legendY = data.length * cellHeight + 25;
    const legendWidth = 240;
    const legendHeight = 12;

    const legendGradId = `legend-gradient-${palette}`;
    const linearGrad = defs
      .append('linearGradient')
      .attr('id', legendGradId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
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
      .attr('font-weight', '600')
      .text(`Color Scale Legend (${palette.toUpperCase()} ramp):`);

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

    const legendLabels = ['0%', '25%', '50%', '75%', '100%'];
    legendLabels.forEach((lbl, idx) => {
      const lblX = (legendWidth / 4) * idx;
      legendG
        .append('text')
        .attr('x', lblX)
        .attr('y', legendHeight + 12)
        .attr('text-anchor', idx === 0 ? 'start' : idx === 4 ? 'end' : 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .attr('font-mono', 'true')
        .text(lbl);
    });
  }, [filteredAndSortedComparisons, selectedTemplateId, selectedMetric, viewMode, palette, queryName]);

  // 3. D3 Dot-Plot Rendering
  useEffect(() => {
    if (!dotPlotSvgRef.current || viewMode !== 'dotplot') return;

    const svg = d3.select(dotPlotSvgRef.current);
    svg.selectAll('*').remove();

    const data = dotPlotData;
    const size = 520;
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };

    svg
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('xmlns', 'http://www.w3.org/2000/svg');

    const innerW = size - margin.left - margin.right;
    const innerH = size - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Query sequence
    const xScale = d3.scaleLinear().domain([0, data.seq1.length]).range([0, innerW]);
    // Y Scale: Template sequence
    const yScale = d3.scaleLinear().domain([0, data.seq2.length]).range([0, innerH]);

    // Background
    g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', '#0f172a')
      .attr('rx', 6);

    // Diagonal reference line (synteny)
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', innerW)
      .attr('y2', innerH)
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4');

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#64748b');

    g.append('g')
      .call(yAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#64748b');

    // Axis Labels
    svg
      .append('text')
      .attr('x', margin.left + innerW / 2)
      .attr('y', size - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(`Query: ${queryName} (${data.seq1.length} nt)`);

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerH / 2))
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(`Template: ${selectedTemplate.name} (${data.seq2.length} nt)`);

    // Matching diagonal segments
    const colorScale = d3
      .scaleSequential(d3.interpolateWarm)
      .domain([data.stringency, data.windowSize]);

    data.matches.forEach((m) => {
      g.append('circle')
        .attr('cx', xScale(m.x))
        .attr('cy', yScale(m.y))
        .attr('r', 2.5)
        .attr('fill', colorScale(m.matchScore))
        .attr('opacity', 0.85);

      g.append('line')
        .attr('x1', xScale(m.x))
        .attr('y1', yScale(m.y))
        .attr('x2', xScale(m.x + m.length))
        .attr('y2', yScale(m.y + m.length))
        .attr('stroke', colorScale(m.matchScore))
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');
    });
  }, [dotPlotData, viewMode, queryName, selectedTemplate]);

  // Export Matrix as CSV
  const handleExportMatrixCSV = () => {
    const headers = [
      'TemplateID',
      'TemplateName',
      'Species',
      'Pathogen',
      'PathogenType',
      'CompositeScore',
      'IdentityPercent',
      'AlignmentScore',
      'StructureSimilarityPercent',
      'GCDifference',
      'ConfidenceTier',
    ];

    const rows = filteredAndSortedComparisons.map((c) => [
      c.templateId,
      `"${c.templateName}"`,
      `"${c.species}"`,
      `"${c.pathogen}"`,
      `"${c.pathogenType}"`,
      c.compositeHomologyScore,
      c.alignment.identityPercent,
      c.alignment.score,
      c.structureSimilarityPercent,
      c.gcDifference,
      `"${c.confidenceTier}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_Homology_Matrix_${queryName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export SVG Figure
  const handleExportSVG = () => {
    const targetSvg = viewMode === 'heatmap' ? svgRef.current : dotPlotSvgRef.current;
    if (!targetSvg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(targetSvg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_Homology_${viewMode}_${queryName.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Tooltip floating DOM */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none z-50 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg p-3 shadow-xl text-xs transition-opacity duration-150 opacity-0 max-w-xs"
      />

      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-md flex items-center gap-1">
              <Grid className="w-3 h-3 text-amber-700" />
              <span>D3 Interactive Matrix</span>
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Template Homology Comparison Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-template comparative heatmap and synteny assessment comparing{' '}
            <span className="font-semibold text-slate-800">{queryName}</span> against known stress-related templates.
          </p>
        </div>

        {/* View mode toggle, Palette, and Exports */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Heatmap vs Dot-plot Mode */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs bg-slate-50">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Heatmap Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('dotplot')}
              className={`px-3 py-1.5 font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'dotplot'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dot-Plot Synteny</span>
            </button>
          </div>

          {/* Color Palette Selector */}
          {viewMode === 'heatmap' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={palette}
                onChange={(e) => setPalette(e.target.value as PaletteType)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer text-xs"
                title="Select D3 Color Scale"
              >
                <option value="viridis">Viridis Scale</option>
                <option value="blues">Blues Scale</option>
                <option value="magma">Magma Scale</option>
                <option value="gnbu">GnBu Emerald</option>
                <option value="spectral">Spectral Scale</option>
              </select>
            </div>
          )}

          {/* SVG Vector Figure Export */}
          <button
            onClick={handleExportSVG}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 shadow-2xs"
            title="Download vector graphic SVG figure for publication"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Export SVG</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportMatrixCSV}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 shadow-2xs"
            title="Export matrix metrics as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Metric Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Sort by Metric:
          </label>
          <div className="flex items-center gap-1">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-amber-500"
            >
              <option value="compositeHomologyScore">Composite Homology Index</option>
              <option value="identityPercent">Sequence Identity (%)</option>
              <option value="score">Smith-Waterman Bit Score</option>
              <option value="structureSimilarityPercent">2D Structure Match (%)</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-600"
              title={`Sorting ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Host Plant Filter:
          </label>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-amber-500"
          >
            <option value="All">All Species (Rice, Arabidopsis, Tomato, Wheat, Maize)</option>
            <option value="Oryza sativa">Oryza sativa (Rice)</option>
            <option value="Arabidopsis thaliana">Arabidopsis thaliana</option>
            <option value="Solanum lycopersicum">Solanum lycopersicum (Tomato)</option>
            <option value="Triticum aestivum">Triticum aestivum (Wheat)</option>
            <option value="Zea mays">Zea mays (Maize)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Pathosystem Class:
          </label>
          <select
            value={pathogenFilter}
            onChange={(e) => setPathogenFilter(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-amber-500"
          >
            <option value="All">All Pathogens (Bacterial, Fungal, Oomycete)</option>
            <option value="Bacterial">Bacterial Pathogens</option>
            <option value="Fungal">Fungal Pathogens</option>
            <option value="Oomycete">Oomycete Pathogens</option>
          </select>
        </div>

        {viewMode === 'dotplot' ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-slate-600 font-semibold mb-1">
                K-mer Window: {dotPlotWindow}
              </label>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={dotPlotWindow}
                onChange={(e) => setDotPlotWindow(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-slate-600 font-semibold mb-1">
                Stringency: {dotPlotStringency}
              </label>
              <input
                type="range"
                min="2"
                max={dotPlotWindow}
                step="1"
                value={dotPlotStringency}
                onChange={(e) => setDotPlotStringency(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 self-end pb-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Click any row or cell to inspect full alignment details.</span>
          </div>
        )}
      </div>

      {/* Main Dual Visualization & Inspector Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: D3 SVG Surface */}
        <div className="lg:col-span-8 border border-slate-200 rounded-xl p-4 bg-slate-50/40 overflow-x-auto">
          {filteredAndSortedComparisons.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              No templates match the selected host species and pathogen filters.
            </div>
          ) : viewMode === 'heatmap' ? (
            <div className="min-w-[660px]">
              <svg ref={svgRef} className="w-full h-auto" />
            </div>
          ) : (
            <div className="flex justify-center">
              <svg ref={dotPlotSvgRef} className="w-full max-w-[480px] h-auto" />
            </div>
          )}
        </div>

        {/* Right: Selected Template Inspector & Traceback */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              Selected Template Inspector
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <h4 className="font-extrabold text-slate-900 text-base">
                {selectedTemplate.name}
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedComparison.confidenceTier === 'High Homology'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedComparison.confidenceTier === 'Moderate Homology'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedComparison.confidenceTier}
              </span>
            </div>
            <p className="text-xs text-slate-500 italic">
              {selectedTemplate.species} &bull; {selectedTemplate.diseaseName}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-amber-50/70 border border-amber-200 rounded p-2">
              <div className="text-lg font-bold text-amber-800 font-mono">
                {selectedComparison.compositeHomologyScore}%
              </div>
              <div className="text-[10px] text-amber-950 font-semibold">Composite Score</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2">
              <div className="text-lg font-bold text-emerald-700 font-mono">
                {selectedComparison.alignment.identityPercent}%
              </div>
              <div className="text-[10px] text-emerald-950 font-semibold">Identity Match</div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded p-2">
              <div className="text-lg font-bold text-blue-700 font-mono">
                {selectedComparison.alignment.score}
              </div>
              <div className="text-[10px] text-blue-950 font-semibold">Bit Score</div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded p-2">
              <div className="text-lg font-bold text-purple-700 font-mono">
                {selectedComparison.structureSimilarityPercent}%
              </div>
              <div className="text-[10px] text-purple-950 font-semibold">2D Fold Match</div>
            </div>
          </div>

          {/* Biological context */}
          <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="font-semibold text-slate-800">Primary Target: </span>
              <span className="font-mono text-slate-700">{selectedTemplate.primaryTarget}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Pathosystem: </span>
              <span>{selectedTemplate.pathogen} ({selectedTemplate.pathogenType})</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Mechanism: </span>
              <p className="line-clamp-3 text-[11px] text-slate-600 mt-0.5">
                {selectedTemplate.functionalMechanism}
              </p>
            </div>
          </div>

          {/* Pairwise Alignment Traceback Snippet */}
          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Smith-Waterman Alignment Traceback:</span>
              <span className="text-[10px] font-mono text-slate-400">
                Len: {selectedComparison.alignment.length} bp | Id: {selectedComparison.alignment.identityPercent}%
              </span>
            </div>
            <div className="bg-slate-900 rounded p-2.5 font-mono text-[10.5px] text-slate-200 overflow-x-auto leading-tight">
              <div className="text-slate-400">Query:    {selectedComparison.alignment.alignedSeq1.slice(0, 48)}</div>
              <div className="text-emerald-400">Match:    {selectedComparison.alignment.matchLine.slice(0, 48)}</div>
              <div className="text-amber-400">Template: {selectedComparison.alignment.alignedSeq2.slice(0, 48)}</div>
            </div>
          </div>

          {/* Action button: Select this template for full pairwise inspection in Module 4 */}
          <button
            onClick={() => onSelectTemplateForAlignment?.(selectedTemplate)}
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>Load Into Module 4 Pairwise Alignment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
