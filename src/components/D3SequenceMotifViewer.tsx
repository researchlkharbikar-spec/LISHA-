/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA D3-Based Graphical Nucleotide Sequence & Motif Viewer
 * Comprehensive multi-track genomic architecture viewer rendering nucleotide bases,
 * staggered regulatory motif lanes, plant stress conservation profiles, and GC density.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Sparkles,
  Info,
  Download,
  Filter,
  Eye,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import {
  type DiscoveredMotifHit,
  type ConservedRegionBlock,
  type SequenceConservationProfile,
  type MotifCategory,
} from '../utils/motifDiscovery';

interface D3SequenceMotifViewerProps {
  sequence: string;
  name?: string;
  motifs: DiscoveredMotifHit[];
  conservationProfile?: SequenceConservationProfile;
  selectedMotifId?: string | null;
  onSelectMotif?: (hit: DiscoveredMotifHit | null) => void;
}

interface StaggeredMotifHit extends DiscoveredMotifHit {
  lane: number;
}

// Nucleotide base color palette
const BASE_COLORS: Record<string, { bg: string; text: string; stroke: string }> = {
  A: { bg: '#10b981', text: '#ffffff', stroke: '#059669' }, // Emerald
  C: { bg: '#3b82f6', text: '#ffffff', stroke: '#2563eb' }, // Blue
  G: { bg: '#f59e0b', text: '#ffffff', stroke: '#d97706' }, // Amber
  U: { bg: '#8b5cf6', text: '#ffffff', stroke: '#7c3aed' }, // Purple
  T: { bg: '#8b5cf6', text: '#ffffff', stroke: '#7c3aed' },
};

// Category fill colors for D3 canvas
const CATEGORY_HEX_MAP: Record<string, { fill: string; stroke: string; text: string }> = {
  'Abiotic Stress': { fill: '#3b82f6', stroke: '#1d4ed8', text: '#ffffff' },
  'Biotic Defense': { fill: '#10b981', stroke: '#047857', text: '#ffffff' },
  'RNA Processing & Stability': { fill: '#ef4444', stroke: '#b91c1c', text: '#ffffff' },
  'RBP & Structural Hub': { fill: '#8b5cf6', stroke: '#6d28d9', text: '#ffffff' },
  'miRNA Target Seed': { fill: '#0ea5e9', stroke: '#0369a1', text: '#ffffff' },
  'Custom User Motif': { fill: '#f59e0b', stroke: '#b45309', text: '#ffffff' },
};

export const D3SequenceMotifViewer: React.FC<D3SequenceMotifViewerProps> = ({
  sequence,
  name = 'Query lncRNA',
  motifs,
  conservationProfile,
  selectedMotifId,
  onSelectMotif,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const brushSvgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Track toggles
  const [showBases, setShowBases] = useState<boolean>(true);
  const [showConservation, setShowConservation] = useState<boolean>(true);
  const [showGcProfile, setShowGcProfile] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Visible domain window [startPos, endPos] (1-indexed)
  const cleanSeq = useMemo(() => {
    return (sequence || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
  }, [sequence]);

  const seqLen = cleanSeq.length;

  const [currentDomain, setCurrentDomain] = useState<[number, number]>([1, Math.max(seqLen, 10)]);

  // Reset domain when sequence changes
  useEffect(() => {
    setCurrentDomain([1, Math.max(cleanSeq.length, 10)]);
  }, [cleanSeq.length]);

  // Filter motifs by category
  const filteredMotifs = useMemo(() => {
    return motifs.filter((m) => selectedCategory === 'all' || m.category === selectedCategory);
  }, [motifs, selectedCategory]);

  // Compute non-overlapping staggered lanes for motifs (greedy interval scheduling)
  const { staggeredMotifs, maxLanes } = useMemo(() => {
    const sorted = [...filteredMotifs].sort((a, b) => a.start - b.start || a.end - b.end);
    const lanes: { end: number }[] = [];
    const result: StaggeredMotifHit[] = [];

    // Min gap in nucleotide space before re-using the same lane
    const minPaddingNt = Math.max(1, Math.round(seqLen * 0.015));

    for (const m of sorted) {
      let placedLane = -1;
      for (let l = 0; l < lanes.length; l++) {
        if (m.start > lanes[l].end + minPaddingNt) {
          placedLane = l;
          lanes[l].end = m.end;
          break;
        }
      }
      if (placedLane === -1) {
        placedLane = lanes.length;
        lanes.push({ end: m.end });
      }
      result.push({ ...m, lane: placedLane });
    }

    return { staggeredMotifs: result, maxLanes: Math.max(1, lanes.length) };
  }, [filteredMotifs, seqLen]);

  // Compute GC sliding window (window size = 15 nt)
  const gcSlidingData = useMemo(() => {
    const data: { pos: number; gc: number }[] = [];
    const w = 15;
    const half = Math.floor(w / 2);
    for (let i = 0; i < cleanSeq.length; i++) {
      const start = Math.max(0, i - half);
      const end = Math.min(cleanSeq.length, i + half + 1);
      const sub = cleanSeq.slice(start, end);
      const gcCount = (sub.match(/[GC]/g) || []).length;
      const gcRatio = sub.length ? (gcCount / sub.length) * 100 : 0;
      data.push({ pos: i + 1, gc: gcRatio });
    }
    return data;
  }, [cleanSeq]);

  // Main D3 Rendering effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || seqLen === 0) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const margin = { top: 30, right: 30, bottom: 25, left: 45 };
    const width = containerWidth - margin.left - margin.right;

    // Track dynamic height layout
    const motifLaneHeight = 26;
    const motifsTrackHeight = Math.max(50, maxLanes * motifLaneHeight + 16);
    const basesTrackHeight = showBases ? 40 : 0;
    const conservationTrackHeight = showConservation ? 65 : 0;
    const gcTrackHeight = showGcProfile ? 55 : 0;
    const totalHeight =
      margin.top +
      motifsTrackHeight +
      basesTrackHeight +
      conservationTrackHeight +
      gcTrackHeight +
      margin.bottom +
      30;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', containerWidth).attr('height', totalHeight);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale mapped to current visible domain
    const [x0, x1] = currentDomain;
    const xScale = d3.scaleLinear().domain([x0, x1]).range([0, width]);

    // Clip path for zoomed content
    const clipId = `d3-seq-clip-${Math.random().toString(36).substring(2, 9)}`;
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', width)
      .attr('height', totalHeight - margin.top - margin.bottom);

    // Track Y Positions
    let currentY = 0;

    // 1. TOP AXIS / COORDINATE RULER
    const xAxis = d3
      .axisTop(xScale)
      .ticks(Math.min(12, Math.max(5, Math.floor(width / 70))))
      .tickFormat((d) => `${d} nt`);

    g.append('g')
      .attr('class', 'x-axis text-slate-500 font-mono text-[10px]')
      .call(xAxis)
      .selectAll('text')
      .attr('dy', '-4px');

    // 5' and 3' terminal flags
    g.append('text')
      .attr('x', -8)
      .attr('y', -6)
      .attr('text-anchor', 'end')
      .attr('class', 'text-[11px] font-bold fill-blue-600 font-mono')
      .text("5'");

    g.append('text')
      .attr('x', width + 8)
      .attr('y', -6)
      .attr('text-anchor', 'start')
      .attr('class', 'text-[11px] font-bold fill-blue-600 font-mono')
      .text("3'");

    // Content group with clipping
    const contentG = g.append('g').attr('clip-path', `url(#${clipId})`);

    // Grid vertical lines
    const gridG = contentG.append('g').attr('class', 'grid-lines opacity-15');
    const xTicks = xScale.ticks(Math.min(20, Math.max(6, Math.floor(width / 60))));
    xTicks.forEach((tickVal) => {
      gridG
        .append('line')
        .attr('x1', xScale(tickVal))
        .attr('x2', xScale(tickVal))
        .attr('y1', 0)
        .attr('y2', totalHeight - margin.top - margin.bottom)
        .attr('stroke', '#64748b')
        .attr('stroke-dasharray', '2,2');
    });

    // 2. MOTIFS TRACK
    const motifG = contentG.append('g').attr('transform', `translate(0,${currentY})`);

    // Track background
    motifG
      .append('rect')
      .attr('width', width)
      .attr('height', motifsTrackHeight)
      .attr('fill', '#f8fafc')
      .attr('rx', 6)
      .attr('stroke', '#e2e8f0');

    // Track Title / Tag
    g.append('text')
      .attr('x', -32)
      .attr('y', currentY + 16)
      .attr('text-anchor', 'start')
      .attr('class', 'text-[10px] font-bold fill-violet-700 font-sans tracking-tight')
      .text('Motifs');

    // Render Motifs
    staggeredMotifs.forEach((m) => {
      const startX = xScale(m.start);
      const endX = xScale(m.end + 1);
      const motifW = Math.max(4, endX - startX);
      const motifY = 8 + m.lane * motifLaneHeight;
      const isSelected = selectedMotifId === m.hitId;
      const colors = CATEGORY_HEX_MAP[m.category] || CATEGORY_HEX_MAP['Custom User Motif'];

      const motifPill = motifG
        .append('g')
        .attr('class', 'motif-item cursor-pointer group')
        .on('click', () => {
          onSelectMotif?.(m);
        })
        .on('mouseenter', (event) => {
          if (!tooltipRef.current) return;
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style('display', 'block')
            .style('left', `${event.pageX + 12}px`)
            .style('top', `${event.pageY - 24}px`).html(`
              <div class="p-2.5 max-w-xs text-xs space-y-1.5 font-sans">
                <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                  <span class="font-bold text-emerald-400">${m.motifName}</span>
                  <span class="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">${m.category}</span>
                </div>
                <div class="text-[11px] text-slate-300">
                  <div><span class="text-slate-400">Target Factor:</span> <span class="font-medium text-white">${m.targetFactorOrPathway}</span></div>
                  <div><span class="text-slate-400">Position:</span> <span class="font-mono text-cyan-300">${m.start} - ${m.end} nt</span> (${m.length} nt)</div>
                  <div><span class="text-slate-400">Matched Sequence:</span> <span class="font-mono font-bold text-amber-300 bg-slate-800 px-1 rounded">${m.matchedSequence}</span></div>
                </div>
                <p class="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800">${m.description}</p>
              </div>
            `);
        })
        .on('mouseleave', () => {
          if (tooltipRef.current) {
            d3.select(tooltipRef.current).style('display', 'none');
          }
        });

      // Background rounded pill
      motifPill
        .append('rect')
        .attr('x', startX)
        .attr('y', motifY)
        .attr('width', motifW)
        .attr('height', motifLaneHeight - 6)
        .attr('rx', 4)
        .attr('fill', colors.fill)
        .attr('stroke', isSelected ? '#ffffff' : colors.stroke)
        .attr('stroke-width', isSelected ? 2.5 : 1)
        .attr('opacity', 0.92);

      // Selected glow ring
      if (isSelected) {
        motifPill
          .append('rect')
          .attr('x', startX - 2)
          .attr('y', motifY - 2)
          .attr('width', motifW + 4)
          .attr('height', motifLaneHeight - 2)
          .attr('rx', 6)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,2');
      }

      // Label inside pill if wide enough
      if (motifW >= 32) {
        motifPill
          .append('text')
          .attr('x', startX + motifW / 2)
          .attr('y', motifY + (motifLaneHeight - 6) / 2 + 3.5)
          .attr('text-anchor', 'middle')
          .attr('class', 'font-sans font-bold text-[9px] fill-white pointer-events-none select-none')
          .text(motifW >= 60 ? `${m.motifName}` : m.matchedSequence.slice(0, 4));
      }
    });

    currentY += motifsTrackHeight + 10;

    // 3. NUCLEOTIDE BASES TRACK (Visible or adaptive)
    if (showBases) {
      const basesG = contentG.append('g').attr('transform', `translate(0,${currentY})`);

      // Label
      g.append('text')
        .attr('x', -32)
        .attr('y', currentY + 16)
        .attr('text-anchor', 'start')
        .attr('class', 'text-[10px] font-bold fill-blue-700 font-sans tracking-tight')
        .text('Bases');

      // Track box
      basesG
        .append('rect')
        .attr('width', width)
        .attr('height', basesTrackHeight)
        .attr('fill', '#0f172a')
        .attr('rx', 6);

      // Calculate base width in current scale
      const baseW = xScale(2) - xScale(1);

      // Only draw individual letters if width is at least 9px
      if (baseW >= 9) {
        const visibleStart = Math.max(1, Math.floor(x0));
        const visibleEnd = Math.min(seqLen, Math.ceil(x1));

        for (let i = visibleStart; i <= visibleEnd; i++) {
          const baseChar = cleanSeq[i - 1];
          const bX = xScale(i);
          const colors = BASE_COLORS[baseChar] || BASE_COLORS['A'];

          const baseNode = basesG.append('g').attr('class', 'base-node cursor-pointer');

          baseNode
            .append('rect')
            .attr('x', bX)
            .attr('y', 6)
            .attr('width', Math.max(1, baseW - 1))
            .attr('height', basesTrackHeight - 12)
            .attr('rx', 2)
            .attr('fill', colors.bg)
            .attr('stroke', colors.stroke)
            .attr('stroke-width', 0.5);

          if (baseW >= 12) {
            baseNode
              .append('text')
              .attr('x', bX + baseW / 2)
              .attr('y', basesTrackHeight / 2 + 3)
              .attr('text-anchor', 'middle')
              .attr('class', 'text-[10px] font-mono font-bold fill-white select-none pointer-events-none')
              .text(baseChar);
          }
        }
      } else {
        // Density summary mode
        basesG
          .append('text')
          .attr('x', width / 2)
          .attr('y', basesTrackHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('class', 'text-[11px] font-mono text-slate-400 select-none')
          .text(`Zoom in to inspect individual nucleotide bases (showing ${Math.round(x1 - x0 + 1)} nt span)`);
      }

      currentY += basesTrackHeight + 10;
    }

    // 4. CONSERVATION SYNTEY TRACK (Plant Stress Templates)
    if (showConservation && conservationProfile && conservationProfile.scores.length > 0) {
      const consG = contentG.append('g').attr('transform', `translate(0,${currentY})`);

      // Label
      g.append('text')
        .attr('x', -32)
        .attr('y', currentY + 16)
        .attr('text-anchor', 'start')
        .attr('class', 'text-[10px] font-bold fill-emerald-700 font-sans tracking-tight')
        .text('Conserv.');

      // Background
      consG
        .append('rect')
        .attr('width', width)
        .attr('height', conservationTrackHeight)
        .attr('fill', '#f0fdf4')
        .attr('rx', 6)
        .attr('stroke', '#bbf7d0');

      // Y Scale for conservation (0.0 to 1.0)
      const consYScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([conservationTrackHeight - 6, 6]);

      // Highlight blocks
      conservationProfile.blocks.forEach((blk) => {
        const blkStartX = xScale(blk.start);
        const blkEndX = xScale(blk.end + 1);
        const blkW = Math.max(2, blkEndX - blkStartX);

        consG
          .append('rect')
          .attr('x', blkStartX)
          .attr('y', 4)
          .attr('width', blkW)
          .attr('height', conservationTrackHeight - 8)
          .attr('fill', blk.level.startsWith('High') ? '#86efac' : '#bbf7d0')
          .attr('opacity', 0.55);
      });

      // Area generator
      const consData = conservationProfile.scores.map((sc, idx) => ({
        pos: idx + 1,
        score: sc,
      }));

      const consArea = d3
        .area<{ pos: number; score: number }>()
        .x((d) => xScale(d.pos))
        .y0(conservationTrackHeight - 6)
        .y1((d) => consYScale(d.score))
        .curve(d3.curveMonotoneX);

      const consLine = d3
        .line<{ pos: number; score: number }>()
        .x((d) => xScale(d.pos))
        .y((d) => consYScale(d.score))
        .curve(d3.curveMonotoneX);

      // Area fill
      consG
        .append('path')
        .datum(consData)
        .attr('fill', 'url(#cons-grad)')
        .attr('d', consArea);

      // Gradient definition
      const defs = svg.select('defs');
      const grad = defs
        .append('linearGradient')
        .attr('id', 'cons-grad')
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.6);
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.05);

      // Line stroke
      consG
        .append('path')
        .datum(consData)
        .attr('fill', 'none')
        .attr('stroke', '#059669')
        .attr('stroke-width', 1.8)
        .attr('d', consLine);

      // Mean score dashed threshold
      const meanY = consYScale(conservationProfile.meanConservationPercent / 100);
      consG
        .append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', meanY)
        .attr('y2', meanY)
        .attr('stroke', '#047857')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1);

      consG
        .append('text')
        .attr('x', width - 6)
        .attr('y', meanY - 3)
        .attr('text-anchor', 'end')
        .attr('class', 'text-[9px] font-mono font-bold fill-emerald-800')
        .text(`Mean: ${conservationProfile.meanConservationPercent}%`);

      currentY += conservationTrackHeight + 10;
    }

    // 5. GC CONTENT DENSITY TRACK
    if (showGcProfile) {
      const gcG = contentG.append('g').attr('transform', `translate(0,${currentY})`);

      // Label
      g.append('text')
        .attr('x', -32)
        .attr('y', currentY + 16)
        .attr('text-anchor', 'start')
        .attr('class', 'text-[10px] font-bold fill-amber-700 font-sans tracking-tight')
        .text('GC%');

      // Background
      gcG
        .append('rect')
        .attr('width', width)
        .attr('height', gcTrackHeight)
        .attr('fill', '#fffbeb')
        .attr('rx', 6)
        .attr('stroke', '#fef3c7');

      // Y Scale for GC (0 - 100%)
      const gcYScale = d3.scaleLinear().domain([0, 100]).range([gcTrackHeight - 6, 6]);

      // 50% baseline line
      const gc50Y = gcYScale(50);
      gcG
        .append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', gc50Y)
        .attr('y2', gc50Y)
        .attr('stroke', '#d97706')
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-width', 1);

      // Area generator
      const gcArea = d3
        .area<{ pos: number; gc: number }>()
        .x((d) => xScale(d.pos))
        .y0(gcTrackHeight - 6)
        .y1((d) => gcYScale(d.gc))
        .curve(d3.curveMonotoneX);

      const gcLine = d3
        .line<{ pos: number; gc: number }>()
        .x((d) => xScale(d.pos))
        .y((d) => gcYScale(d.gc))
        .curve(d3.curveMonotoneX);

      // Gradient definition
      const defs = svg.select('defs');
      const gcGrad = defs
        .append('linearGradient')
        .attr('id', 'gc-density-grad')
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');
      gcGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.55);
      gcGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.05);

      gcG
        .append('path')
        .datum(gcSlidingData)
        .attr('fill', 'url(#gc-density-grad)')
        .attr('d', gcArea);

      gcG
        .append('path')
        .datum(gcSlidingData)
        .attr('fill', 'none')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1.6)
        .attr('d', gcLine);

      gcG
        .append('text')
        .attr('x', width - 6)
        .attr('y', gc50Y - 3)
        .attr('text-anchor', 'end')
        .attr('class', 'text-[9px] font-mono font-bold fill-amber-800')
        .text('50% GC');
    }
  }, [
    cleanSeq,
    currentDomain,
    staggeredMotifs,
    maxLanes,
    showBases,
    showConservation,
    showGcProfile,
    conservationProfile,
    gcSlidingData,
    selectedMotifId,
    seqLen,
    onSelectMotif,
  ]);

  // Mini Overview Brush Navigator
  useEffect(() => {
    if (!brushSvgRef.current || !containerRef.current || seqLen === 0) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const margin = { left: 45, right: 30 };
    const width = containerWidth - margin.left - margin.right;
    const height = 40;

    const svg = d3.select(brushSvgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', containerWidth).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, 0)`);

    const overviewXScale = d3.scaleLinear().domain([1, seqLen]).range([0, width]);

    // Track Background
    g.append('rect')
      .attr('width', width)
      .attr('height', height - 12)
      .attr('fill', '#1e293b')
      .attr('rx', 4);

    // Mini motif markers on brush
    motifs.forEach((m) => {
      const startX = overviewXScale(m.start);
      const w = Math.max(3, overviewXScale(m.end) - startX);
      const colors = CATEGORY_HEX_MAP[m.category] || CATEGORY_HEX_MAP['Custom User Motif'];

      g.append('rect')
        .attr('x', startX)
        .attr('y', 3)
        .attr('width', w)
        .attr('height', height - 18)
        .attr('fill', colors.fill)
        .attr('opacity', 0.85)
        .attr('rx', 1.5);
    });

    // Brush component
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [width, height - 12],
      ])
      .on('brush end', (event) => {
        if (!event.selection) return;
        const [sel0, sel1] = event.selection as [number, number];
        const newStart = Math.max(1, Math.round(overviewXScale.invert(sel0)));
        const newEnd = Math.min(seqLen, Math.round(overviewXScale.invert(sel1)));
        if (newEnd > newStart + 3) {
          setCurrentDomain([newStart, newEnd]);
        }
      });

    const brushG = g.append('g').attr('class', 'brush').call(brush);

    // Set initial brush position matching current domain
    const initialBrush0 = overviewXScale(currentDomain[0]);
    const initialBrush1 = overviewXScale(currentDomain[1]);
    brushG.call(brush.move, [initialBrush0, initialBrush1]);
  }, [cleanSeq, seqLen, motifs]);

  // Zoom controls
  const handleZoomIn = () => {
    const [d0, d1] = currentDomain;
    const span = d1 - d0;
    if (span <= 12) return;
    const center = (d0 + d1) / 2;
    const newSpan = span * 0.6;
    const newStart = Math.max(1, Math.round(center - newSpan / 2));
    const newEnd = Math.min(seqLen, Math.round(center + newSpan / 2));
    setCurrentDomain([newStart, newEnd]);
  };

  const handleZoomOut = () => {
    const [d0, d1] = currentDomain;
    const span = d1 - d0;
    const center = (d0 + d1) / 2;
    const newSpan = Math.min(seqLen, span * 1.5);
    const newStart = Math.max(1, Math.round(center - newSpan / 2));
    const newEnd = Math.min(seqLen, Math.round(center + newSpan / 2));
    setCurrentDomain([newStart, newEnd]);
  };

  const handleResetZoom = () => {
    setCurrentDomain([1, Math.max(seqLen, 10)]);
  };

  const handleZoomToMotif = (motif: DiscoveredMotifHit) => {
    const padding = Math.max(10, Math.round(motif.length * 1.5));
    const start = Math.max(1, motif.start - padding);
    const end = Math.min(seqLen, motif.end + padding);
    setCurrentDomain([start, end]);
    onSelectMotif?.(motif);
  };

  // Export SVG graphic
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'lncRNA').replace(/\s+/g, '_')}_d3_sequence_motifs.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all ${
        isExpanded ? 'fixed inset-4 z-50 overflow-y-auto' : ''
      }`}
    >
      {/* Top Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">
                D3 Sequence Architecture & Motif Map
              </h4>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-bold">
                {currentDomain[0]} &ndash; {currentDomain[1]} of {seqLen} nt
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Interactive multi-track viewer: nucleotide bases, staggered motif lanes, and plant stress conservation.
            </p>
          </div>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Track Visibility Toggles */}
          <div className="bg-white border border-slate-300 rounded-lg p-0.5 flex items-center text-xs shadow-2xs">
            <button
              onClick={() => setShowBases(!showBases)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] font-semibold ${
                showBases ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toggle Nucleotide Bases Track"
            >
              Bases
            </button>
            <button
              onClick={() => setShowConservation(!showConservation)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] font-semibold ${
                showConservation ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toggle Conservation synteny Track"
            >
              Conservation
            </button>
            <button
              onClick={() => setShowGcProfile(!showGcProfile)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] font-semibold ${
                showGcProfile ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Toggle GC% Content Density Track"
            >
              GC%
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
              title="Reset to Full Sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export SVG */}
          <button
            onClick={handleExportSvg}
            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Export D3 SVG Graphic"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Expand Fullscreen */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Expand full width'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="px-5 py-2 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter Track:
          </span>
          {['all', 'Abiotic Stress', 'Biotic Defense', 'RNA Processing & Stability', 'miRNA Target Seed'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === 'all' ? 'All Motifs' : cat.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Quick jump to selected motif */}
        {selectedMotifId && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 font-medium">Selected Motif:</span>
            {motifs.find((m) => m.hitId === selectedMotifId) && (
              <button
                onClick={() => {
                  const target = motifs.find((m) => m.hitId === selectedMotifId);
                  if (target) handleZoomToMotif(target);
                }}
                className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 rounded font-bold font-mono hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{motifs.find((m) => m.hitId === selectedMotifId)?.motifName}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main D3 Graphic SVG Viewport */}
      <div className="p-4 overflow-x-auto select-none bg-slate-50/30">
        <svg ref={svgRef} className="mx-auto block font-sans" />
      </div>

      {/* Mini-Map Brush Overview Track */}
      <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
          <span>Overview Mini-Map Navigator (Drag or resize grey window to pan & zoom)</span>
          <span>Full Length: 1 - {seqLen} nt</span>
        </div>
        <svg ref={brushSvgRef} className="w-full block" />
      </div>

      {/* Interactive Tooltip Container */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none hidden bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 backdrop-blur-xs transition-opacity duration-150"
      />
    </div>
  );
};
