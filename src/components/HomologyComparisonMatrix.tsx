/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA D3-Based Homology Comparison Matrix Component
 * Provides an interactive comparison matrix & dot-plot visualizer
 * for the selected lncRNA against known stress-related templates.
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
  Layers,
  BarChart2,
  Maximize2,
  Grid,
  Filter,
  ArrowUpDown,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface HomologyComparisonMatrixProps {
  querySequence: string;
  queryName: string;
  onSelectTemplateForAlignment?: (template: CuratedLncRNA) => void;
}

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CURATED_LNCRNAS[0].id);
  const [viewMode, setViewMode] = useState<'heatmap' | 'dotplot'>('heatmap');
  const [dotPlotWindow, setDotPlotWindow] = useState<number>(7);
  const [dotPlotStringency, setDotPlotStringency] = useState<number>(5);

  // 1. Calculate comparisons against templates
  const comparisons: TemplateHomologyComparison[] = useMemo(() => {
    return compareQueryAgainstTemplates(querySequence, CURATED_LNCRNAS);
  }, [querySequence]);

  // Filter & sort
  const filteredAndSortedComparisons = useMemo(() => {
    return comparisons
      .filter((c) => speciesFilter === 'All' || c.species === speciesFilter)
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
  }, [comparisons, speciesFilter, selectedMetric, sortOrder]);

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

  // 2. D3 Heatmap Matrix Rendering
  useEffect(() => {
    if (!svgRef.current || viewMode !== 'heatmap') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const data = filteredAndSortedComparisons;
    if (data.length === 0) return;

    const margin = { top: 60, right: 120, bottom: 20, left: 160 };
    const width = 760;
    const height = Math.max(340, data.length * 44 + margin.top + margin.bottom);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const columns = [
      { key: 'compositeHomologyScore', label: 'Composite Score' },
      { key: 'identityPercent', label: 'Identity (%)' },
      { key: 'score', label: 'Bit Score' },
      { key: 'structureSimilarityPercent', label: '2D Fold Match' },
      { key: 'gcDifference', label: '|ΔGC%|' },
    ];

    const innerWidth = width - margin.left - margin.right;
    const cellWidth = innerWidth / columns.length;
    const cellHeight = 36;

    // Y Scale (Templates)
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.templateName))
      .range([0, data.length * cellHeight])
      .padding(0.12);

    // X Scale (Metrics)
    const xScale = d3
      .scaleBand()
      .domain(columns.map((c) => c.key))
      .range([0, innerWidth])
      .padding(0.08);

    // Color Scales
    const colorScaleComposite = d3.scaleSequential(d3.interpolateBlues).domain([10, 100]);
    const colorScaleIdentity = d3.scaleSequential(d3.interpolateViridis).domain([20, 100]);
    const colorScaleScore = d3.scaleSequential(d3.interpolateCividis).domain([0, 120]);
    const colorScaleStructure = d3.scaleSequential(d3.interpolateGnBu).domain([20, 100]);

    // Tooltip helper
    const tooltip = d3.select(tooltipRef.current);

    // Column Headers
    const colHeaders = g.append('g').attr('class', 'column-headers');
    columns.forEach((col) => {
      const colX = (xScale(col.key) || 0) + cellWidth / 2;
      colHeaders
        .append('text')
        .attr('x', colX)
        .attr('y', -16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#334155')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(col.label);
    });

    // Row Labels (Template Names)
    const rowLabels = g.append('g').attr('class', 'row-labels');
    data.forEach((d) => {
      const rowY = (yScale(d.templateName) || 0) + cellHeight / 2;
      const isSelected = d.templateId === selectedTemplateId;

      const rowLabel = rowLabels
        .append('g')
        .attr('cursor', 'pointer')
        .on('click', () => setSelectedTemplateId(d.templateId));

      // Background selection highlight
      if (isSelected) {
        rowLabel
          .append('rect')
          .attr('x', -margin.left + 8)
          .attr('y', yScale(d.templateName) || 0)
          .attr('width', width - 24)
          .attr('height', cellHeight)
          .attr('fill', '#eff6ff')
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1.5)
          .attr('rx', 6);
      }

      rowLabel
        .append('text')
        .attr('x', -14)
        .attr('y', rowY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', isSelected ? '#1d4ed8' : '#0f172a')
        .attr('font-size', '12px')
        .attr('font-weight', isSelected ? '800' : '600')
        .text(d.templateName);

      rowLabel
        .append('text')
        .attr('x', -14)
        .attr('y', rowY + 10)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748b')
        .attr('font-size', '9.5px')
        .attr('font-style', 'italic')
        .text(`${d.speciesCommon} • ${d.pathogen}`);
    });

    // Cells
    data.forEach((row) => {
      columns.forEach((col) => {
        let rawVal = 0;
        let displayVal = '';
        let cellColor = '#e2e8f0';
        let textColor = '#0f172a';

        if (col.key === 'compositeHomologyScore') {
          rawVal = row.compositeHomologyScore;
          displayVal = `${rawVal}%`;
          cellColor = colorScaleComposite(rawVal);
          textColor = rawVal > 60 ? '#ffffff' : '#0f172a';
        } else if (col.key === 'identityPercent') {
          rawVal = row.alignment.identityPercent;
          displayVal = `${rawVal}%`;
          cellColor = colorScaleIdentity(rawVal);
          textColor = rawVal > 65 ? '#ffffff' : '#0f172a';
        } else if (col.key === 'score') {
          rawVal = row.alignment.score;
          displayVal = `${rawVal}`;
          cellColor = colorScaleScore(rawVal);
          textColor = rawVal > 60 ? '#ffffff' : '#0f172a';
        } else if (col.key === 'structureSimilarityPercent') {
          rawVal = row.structureSimilarityPercent;
          displayVal = `${rawVal}%`;
          cellColor = colorScaleStructure(rawVal);
          textColor = rawVal > 60 ? '#ffffff' : '#0f172a';
        } else if (col.key === 'gcDifference') {
          rawVal = row.gcDifference;
          displayVal = `±${rawVal}%`;
          cellColor = rawVal < 5 ? '#dcfce7' : rawVal < 12 ? '#fef9c3' : '#fee2e2';
          textColor = '#0f172a';
        }

        const cellGroup = g.append('g').attr('cursor', 'pointer');

        cellGroup
          .append('rect')
          .attr('x', xScale(col.key) || 0)
          .attr('y', yScale(row.templateName) || 0)
          .attr('width', cellWidth)
          .attr('height', cellHeight - 3)
          .attr('rx', 4)
          .attr('fill', cellColor)
          .attr('stroke', row.templateId === selectedTemplateId ? '#2563eb' : '#cbd5e1')
          .attr('stroke-width', row.templateId === selectedTemplateId ? 1.5 : 0.8)
          .on('mouseover', (event) => {
            tooltip
              .style('opacity', '1')
              .style('left', `${event.pageX + 14}px`)
              .style('top', `${event.pageY - 28}px`).html(`
                <div class="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                  ${row.templateName} &harr; ${queryName}
                </div>
                <div class="text-[11px] text-slate-600 space-y-0.5">
                  <div><strong>Species:</strong> ${row.species} (${row.speciesCommon})</div>
                  <div><strong>Pathosystem:</strong> ${row.pathogen} (${row.pathogenType})</div>
                  <div><strong>Primary Target:</strong> ${row.primaryTarget}</div>
                  <div><strong>${col.label}:</strong> <span class="font-mono font-bold text-blue-700">${displayVal}</span></div>
                  <div><strong>Confidence:</strong> <span class="px-1 rounded bg-blue-100 text-blue-800">${row.confidenceTier}</span></div>
                </div>
              `);
          })
          .on('mousemove', (event) => {
            tooltip
              .style('left', `${event.pageX + 14}px`)
              .style('top', `${event.pageY - 28}px`);
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
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .attr('pointer-events', 'none')
          .text(displayVal);
      });

      // Confidence badge on right
      const badgeX = innerWidth + 12;
      const badgeY = (yScale(row.templateName) || 0) + cellHeight / 2 + 4;
      const isHigh = row.confidenceTier === 'High Homology';
      const isMod = row.confidenceTier === 'Moderate Homology';

      g.append('text')
        .attr('x', badgeX)
        .attr('y', badgeY - 3)
        .attr('fill', isHigh ? '#059669' : isMod ? '#d97706' : '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text(row.confidenceTier.replace(' Homology', ''));
    });
  }, [filteredAndSortedComparisons, selectedTemplateId, selectedMetric, viewMode, queryName]);

  // 3. D3 Dot-Plot Rendering
  useEffect(() => {
    if (!dotPlotSvgRef.current || viewMode !== 'dotplot') return;

    const svg = d3.select(dotPlotSvgRef.current);
    svg.selectAll('*').remove();

    const data = dotPlotData;
    const size = 520;
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };

    svg.attr('viewBox', `0 0 ${size} ${size}`);

    const innerW = size - margin.left - margin.right;
    const innerH = size - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Query sequence
    const xScale = d3.scaleLinear().domain([0, data.seq1.length]).range([0, innerW]);
    // Y Scale: Template sequence
    const yScale = d3.scaleLinear().domain([0, data.seq2.length]).range([0, innerH]);

    // Canvas background
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

    // Render matching diagonal segments / points
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

      // Connect contiguous diagonal tracts
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
      c.compositeHomologyScore,
      c.alignment.identityPercent,
      c.alignment.score,
      c.structureSimilarityPercent,
      c.gcDifference,
      `"${c.confidenceTier}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_Homology_Matrix_${queryName.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Tooltip floating DOM */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none z-50 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg p-2.5 shadow-xl text-xs transition-opacity duration-150 opacity-0 max-w-xs"
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
            Cross-template alignment matrix comparing <span className="font-semibold text-slate-800">{queryName}</span> against all validated plant biotic stress templates.
          </p>
        </div>

        {/* View mode toggle and Export */}
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            onClick={handleExportMatrixCSV}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1"
            title="Export matrix metrics as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Matrix</span>
          </button>
        </div>
      </div>

      {/* Filter and Metric Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Sort by Metric:
          </label>
          <div className="flex items-center gap-1">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
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
            Filter Host Species:
          </label>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
          >
            <option value="All">All Species (Rice, Arabidopsis, Tomato, Wheat, Maize)</option>
            <option value="Oryza sativa">Oryza sativa (Rice)</option>
            <option value="Arabidopsis thaliana">Arabidopsis thaliana</option>
            <option value="Solanum lycopersicum">Solanum lycopersicum (Tomato)</option>
            <option value="Triticum aestivum">Triticum aestivum (Wheat)</option>
            <option value="Zea mays">Zea mays (Maize)</option>
          </select>
        </div>

        {viewMode === 'dotplot' && (
          <div className="flex items-center gap-3">
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
                className="w-full accent-amber-600"
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
                className="w-full accent-amber-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Dual Visualization & Inspector Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: D3 SVG Surface */}
        <div className="lg:col-span-8 border border-slate-200 rounded-xl p-4 bg-slate-50/40 overflow-x-auto">
          {viewMode === 'heatmap' ? (
            <div className="min-w-[620px]">
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
            <div className="bg-blue-50/70 border border-blue-200 rounded p-2">
              <div className="text-lg font-bold text-blue-700 font-mono">
                {selectedComparison.compositeHomologyScore}%
              </div>
              <div className="text-[10px] text-blue-900 font-semibold">Composite Score</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2">
              <div className="text-lg font-bold text-emerald-700 font-mono">
                {selectedComparison.alignment.identityPercent}%
              </div>
              <div className="text-[10px] text-emerald-900 font-semibold">Identity Match</div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded p-2">
              <div className="text-lg font-bold text-amber-700 font-mono">
                {selectedComparison.alignment.score}
              </div>
              <div className="text-[10px] text-amber-900 font-semibold">Bit Score</div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded p-2">
              <div className="text-lg font-bold text-purple-700 font-mono">
                {selectedComparison.structureSimilarityPercent}%
              </div>
              <div className="text-[10px] text-purple-900 font-semibold">2D Fold Match</div>
            </div>
          </div>

          {/* Biological context */}
          <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="font-semibold text-slate-800">Primary Target: </span>
              <span className="font-mono text-slate-700">{selectedTemplate.primaryTarget}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Pathogen: </span>
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
            <div className="text-[11px] font-bold text-slate-700 mb-1">
              Smith-Waterman Traceback Snippet:
            </div>
            <div className="bg-slate-900 rounded p-2.5 font-mono text-[10.5px] text-slate-200 overflow-x-auto leading-tight">
              <div className="text-slate-400">Query:   {selectedComparison.alignment.alignedSeq1.slice(0, 48)}</div>
              <div className="text-emerald-400">Match:   {selectedComparison.alignment.matchLine.slice(0, 48)}</div>
              <div className="text-amber-400">Template: {selectedComparison.alignment.alignedSeq2.slice(0, 48)}</div>
            </div>
          </div>

          {/* Action button: Select this template for full pairwise inspection in Module 4 */}
          <button
            onClick={() => onSelectTemplateForAlignment?.(selectedTemplate)}
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Load Into Module 4 Pairwise Alignment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
