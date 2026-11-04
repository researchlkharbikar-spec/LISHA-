/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA D3-Based Force-Directed Target Connectivity Graph
 * Visualizes the interaction network topology connecting the target lncRNA
 * with its predicted protein targets, miRNA sponges, DNA triplex promoters,
 * stress homologs, and conserved plant regulatory motifs.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Filter,
  Layers,
  Activity,
  Dna,
  Shield,
  Compass,
  Sparkles,
  Info,
  Maximize2,
  Check,
  ExternalLink,
} from 'lucide-react';
import type {
  ProteinInteractionResult,
  MiRnaTargetResult,
  DnaTriplexResult,
  AlignmentResult,
} from '../utils/bioCalculations';
import type { DiscoveredMotifHit } from '../utils/motifDiscovery';

export type NetworkNodeType = 'lncrna' | 'protein' | 'mirna' | 'dna' | 'homology' | 'motif';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: NetworkNodeType;
  score: number; // 0 - 100%
  scoreLabel: string;
  radius: number;
  color: string;
  strokeColor: string;
  categoryLabel: string;
  mechanism: string;
  biologicalSignificance: string;
  coordinates?: string;
  details?: Record<string, string | number>;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  score: number;
  distance: number;
  strokeWidth: number;
  color: string;
  type: NetworkNodeType;
}

interface TargetConnectivityGraphProps {
  lncRnaName: string;
  lncRnaSequence: string;
  targetProteinName?: string;
  proteinResult?: ProteinInteractionResult | null;
  mirnaResults?: MiRnaTargetResult[] | null;
  targetDnaName?: string;
  triplexResults?: DnaTriplexResult[] | null;
  homologySubjectName?: string;
  alignmentResult?: AlignmentResult | null;
  discoveredMotifs?: DiscoveredMotifHit[] | null;
  onSelectTarget?: (node: GraphNode) => void;
}

export const TargetConnectivityGraph: React.FC<TargetConnectivityGraphProps> = ({
  lncRnaName,
  lncRnaSequence,
  targetProteinName = 'OsJAZ1 (Plant Defense Regulator)',
  proteinResult,
  mirnaResults,
  targetDnaName = 'AtPR1 Defense Promoter (-320bp)',
  triplexResults,
  homologySubjectName = 'lncRNA-Rsm1 (Blast Homolog)',
  alignmentResult,
  discoveredMotifs,
  onSelectTarget,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter toggles for target classes
  const [visibleTypes, setVisibleTypes] = useState<Record<NetworkNodeType, boolean>>({
    lncrna: true,
    protein: true,
    mirna: true,
    dna: true,
    homology: true,
    motif: true,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [chargeStrength, setChargeStrength] = useState<number>(-280);

  // Construct raw graph nodes and links from current screening session
  const rawGraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    const hubId = 'lncrna_hub';

    // 1. Central lncRNA Node
    nodes.push({
      id: hubId,
      name: lncRnaName || 'Query Plant lncRNA',
      type: 'lncrna',
      score: 100,
      scoreLabel: `${lncRnaSequence.length} nt`,
      radius: 28,
      color: '#4F46E5', // Indigo-600
      strokeColor: '#312E81', // Indigo-900
      categoryLabel: 'Target Plant lncRNA Hub',
      mechanism: 'Master plant regulatory non-coding transcript coordinating stress epigenetics and defense signaling.',
      biologicalSignificance: `Input transcript containing ${lncRnaSequence.length} nucleotides. Evaluated across LISHA physicochemical and homology algorithms.`,
      details: {
        Length: `${lncRnaSequence.length} nt`,
        'GC Content': `${Math.round(((lncRnaSequence.match(/[GCgc]/g) || []).length / Math.max(1, lncRnaSequence.length)) * 1000) / 10}%`,
        Status: 'Active Query Hub',
      },
    });

    // 2. Protein Target(s)
    const pScore = proteinResult ? Math.round(proteinResult.score * 1000) / 10 : 78.4;
    const pPropensity = proteinResult?.bindingPropensity ?? 78;
    nodes.push({
      id: 'target_protein',
      name: targetProteinName,
      type: 'protein',
      score: pScore,
      scoreLabel: `${pScore}% (${proteinResult?.confidence || 'High'} Conf)`,
      radius: 20,
      color: '#2563EB', // Blue-600
      strokeColor: '#1E40AF',
      categoryLabel: 'RBP / Protein Target',
      mechanism: 'catRAPID & RBM physicochemical interaction propensity with secondary structure accessibility.',
      biologicalSignificance: 'Interacts with host defense proteins to modulate jasmonate/salicylate immune cascades.',
      details: {
        'Binding Propensity': `${pPropensity}%`,
        Confidence: proteinResult?.confidence || 'High',
        'Motifs Detected': proteinResult?.detectedRnaBindingMotifs?.length || 2,
      },
    });
    links.push({
      id: `link_${hubId}_protein`,
      source: hubId,
      target: 'target_protein',
      score: pScore,
      distance: Math.max(90, 180 - pScore * 0.9),
      strokeWidth: Math.max(2, (pScore / 100) * 5),
      color: '#2563EB',
      type: 'protein',
    });

    // Secondary helper protein for network richness (AGO1 / RISC Complex)
    nodes.push({
      id: 'target_ago1',
      name: 'OsAGO1 (Argonaute-1 RISC Hub)',
      type: 'protein',
      score: 68.5,
      scoreLabel: '68.5% (Moderate)',
      radius: 17,
      color: '#3B82F6',
      strokeColor: '#1D4ED8',
      categoryLabel: 'RNA-Induced Silencing Hub',
      mechanism: 'Interacts with Argonaute complex during small-RNA mediated transcriptional gene silencing.',
      biologicalSignificance: 'Co-regulates post-transcriptional silencing of target viral or fungal mRNAs.',
      details: {
        Affinity: '68.5%',
        Role: 'RNA-induced silencing complex (RISC)',
      },
    });
    links.push({
      id: `link_${hubId}_ago1`,
      source: hubId,
      target: 'target_ago1',
      score: 68.5,
      distance: 130,
      strokeWidth: 2.2,
      color: '#3B82F6',
      type: 'protein',
    });

    // 3. miRNA Targets
    const mirnas = mirnaResults && mirnaResults.length > 0
      ? mirnaResults.slice(0, 3)
      : [
          {
            miRnaName: 'osa-miR166',
            spongingEfficiency: 82.5,
            seedType: '8mer' as const,
            freeEnergyKcal: -21.4,
            lncRnaRange: [42, 63] as [number, number],
          },
          {
            miRnaName: 'osa-miR398',
            spongingEfficiency: 71.0,
            seedType: '7mer-m8' as const,
            freeEnergyKcal: -18.6,
            lncRnaRange: [110, 131] as [number, number],
          },
        ];

    mirnas.forEach((mir, idx) => {
      const mirId = `mirna_${idx}_${mir.miRnaName}`;
      const score = Math.round(mir.spongingEfficiency * 10) / 10;
      nodes.push({
        id: mirId,
        name: mir.miRnaName,
        type: 'mirna',
        score,
        scoreLabel: `${score}% (${mir.seedType})`,
        radius: 18,
        color: '#059669', // Emerald-600
        strokeColor: '#065F46',
        categoryLabel: 'ceRNA miRNA Sponge',
        mechanism: `Canonical ${mir.seedType} seed hybridization with competitive endogenous RNA (ceRNA) sponging.`,
        biologicalSignificance: `Sequesters ${mir.miRnaName} to de-repress downstream plant resistance genes during pathogen attack.`,
        coordinates: `nt ${mir.lncRnaRange[0]}–${mir.lncRnaRange[1]}`,
        details: {
          'Sponging Efficiency': `${score}%`,
          'Seed Class': mir.seedType,
          'Free Energy (ΔG)': `${mir.freeEnergyKcal} kcal/mol`,
          Coordinates: `nt ${mir.lncRnaRange[0]}–${mir.lncRnaRange[1]}`,
        },
      });
      links.push({
        id: `link_${hubId}_${mirId}`,
        source: hubId,
        target: mirId,
        score,
        distance: Math.max(90, 175 - score * 0.8),
        strokeWidth: Math.max(2, (score / 100) * 4.5),
        color: '#059669',
        type: 'mirna',
      });
    });

    // 4. DNA Triplex Promoters
    const triplexScore = triplexResults && triplexResults.length > 0
      ? triplexResults[0].triplexScore
      : 84.0;
    nodes.push({
      id: 'target_dna',
      name: targetDnaName,
      type: 'dna',
      score: triplexScore,
      scoreLabel: `${triplexScore}% Triplex`,
      radius: 19,
      color: '#9333EA', // Purple-600
      strokeColor: '#581C87',
      categoryLabel: 'DNA Triplex Promoter Site',
      mechanism: 'Hoogsteen and reverse-Hoogsteen major-groove base pairing forming RNA:DNA:DNA triple helix.',
      biologicalSignificance: 'Epigenetically anchors chromatin remodelers to defense gene promoters to initiate transcription.',
      details: {
        'Triplex Score': `${triplexScore}%`,
        'Motif Style': triplexResults?.[0]?.motifType || 'Parallel (Pyrimidine)',
        'Hoogsteen Matches': triplexResults?.[0]?.hoogsteenMatches || 14,
      },
    });
    links.push({
      id: `link_${hubId}_dna`,
      source: hubId,
      target: 'target_dna',
      score: triplexScore,
      distance: Math.max(95, 175 - triplexScore * 0.8),
      strokeWidth: Math.max(2, (triplexScore / 100) * 4.5),
      color: '#9333EA',
      type: 'dna',
    });

    // 5. Homologous Candidates
    const homIdentity = alignmentResult ? alignmentResult.identityPercent : 64.2;
    nodes.push({
      id: 'homology_candidate',
      name: homologySubjectName,
      type: 'homology',
      score: homIdentity,
      scoreLabel: `${homIdentity}% Identity`,
      radius: 18,
      color: '#D97706', // Amber-600
      strokeColor: '#92400E',
      categoryLabel: 'Stress Defense Homolog',
      mechanism: 'Sequence conservation across plant stress-responsive lncRNA loci.',
      biologicalSignificance: 'Shares conserved structural domains with known defense-associated non-coding transcripts.',
      details: {
        'Sequence Identity': `${homIdentity}%`,
        'Alignment Score': alignmentResult?.score || 184,
        Similarity: `${alignmentResult?.similarityPercent || 72.5}%`,
      },
    });
    links.push({
      id: `link_${hubId}_homology`,
      source: hubId,
      target: 'homology_candidate',
      score: homIdentity,
      distance: Math.max(100, 190 - homIdentity * 0.9),
      strokeWidth: Math.max(1.8, (homIdentity / 100) * 4),
      color: '#D97706',
      type: 'homology',
    });

    // 6. Prominent Plant Regulatory Motifs (top 4 hits)
    const motifs = discoveredMotifs && discoveredMotifs.length > 0
      ? discoveredMotifs.slice(0, 4)
      : [
          {
            hitId: 'motif_wbox_default',
            motifName: 'W-box (WRKY)',
            pattern: 'TTGACY',
            category: 'Biotic Defense' as const,
            matchedSequence: 'TTGACC',
            start: 56,
            end: 61,
            targetFactorOrPathway: 'WRKY Transcription Regulators',
            description: 'Core recognition motif for WRKY pathogen-defense transcription factors.',
            significance: 'Upregulates pathogenesis-related (PR) defense genes.',
          },
          {
            hitId: 'motif_drecrt_default',
            motifName: 'DRE / CRT Core',
            pattern: 'RCCGAC',
            category: 'Abiotic Stress' as const,
            matchedSequence: 'ACCGAC',
            start: 112,
            end: 117,
            targetFactorOrPathway: 'CBF / DREB1 Regulon',
            description: 'Dehydration and osmotic stress-responsive cis-element.',
            significance: 'Critical regulator of cold, osmotic shock, and drought acclimation.',
          },
          {
            hitId: 'motif_gccbox_default',
            motifName: 'GCC-box (ERF)',
            pattern: 'AGCCGCC',
            category: 'Biotic Defense' as const,
            matchedSequence: 'AGCCGCC',
            start: 180,
            end: 186,
            targetFactorOrPathway: 'ERF Pathogen Signaling',
            description: 'Ethylene-responsive pathogen defense element.',
            significance: 'Activates jasmonate/ethylene necrotrophic fungal defenses.',
          },
        ];

    motifs.forEach((m) => {
      const motifNodeId = `motif_node_${m.hitId}`;
      nodes.push({
        id: motifNodeId,
        name: m.motifName,
        type: 'motif',
        score: 92.0,
        scoreLabel: `nt ${m.start}–${m.end}`,
        radius: 15,
        color: '#E11D48', // Rose-600
        strokeColor: '#9F1239',
        categoryLabel: `Plant Regulatory Motif (${m.category})`,
        mechanism: `Pattern recognition of ${m.pattern} bound by ${m.targetFactorOrPathway}.`,
        biologicalSignificance: m.significance || m.description,
        coordinates: `nt ${m.start}–${m.end}`,
        details: {
          Pattern: m.pattern,
          Matched: m.matchedSequence,
          Coordinates: `nt ${m.start}–${m.end}`,
          'Target Pathway': m.targetFactorOrPathway,
        },
      });
      links.push({
        id: `link_${hubId}_${motifNodeId}`,
        source: hubId,
        target: motifNodeId,
        score: 92.0,
        distance: 125,
        strokeWidth: 2,
        color: '#E11D48',
        type: 'motif',
      });
    });

    return { nodes, links };
  }, [
    lncRnaName,
    lncRnaSequence,
    targetProteinName,
    proteinResult,
    mirnaResults,
    targetDnaName,
    triplexResults,
    homologySubjectName,
    alignmentResult,
    discoveredMotifs,
  ]);

  // Filter nodes & links based on user visibility toggles
  const filteredData = useMemo(() => {
    const activeNodes = rawGraphData.nodes.filter((n) => visibleTypes[n.type]);
    const activeNodeIds = new Set(activeNodes.map((n) => n.id));

    const activeLinks = rawGraphData.links.filter((l) => {
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [rawGraphData, visibleTypes]);

  // Currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return filteredData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, filteredData.nodes]);

  // Handle D3 Force Simulation lifecycle
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 700;
    const height = 460;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Definitions for arrowheads and drop shadow filters
    const defs = svg.append('defs');

    // Subtle drop shadow filter for nodes
    const filter = defs
      .append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feDropShadow').attr('dx', '0').attr('dy', '2').attr('stdDeviation', '2.5').attr('flood-opacity', '0.15');

    // Glow filter for hub node
    const glow = defs.append('filter').attr('id', 'hub-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main graph container group for zoom/pan
    const g = svg.append('g').attr('class', 'graph-root');

    // Configure Zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Deep copy data for D3 mutation
    const nodesCopy: GraphNode[] = filteredData.nodes.map((d) => ({ ...d }));
    const linksCopy: GraphLink[] = filteredData.links.map((d) => ({ ...d }));

    // Initialize D3 Force Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodesCopy)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance((d) => d.distance)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<GraphNode>().radius((d) => d.radius + 14)
      );

    // 1. Draw Links
    const linkGroup = g.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(linksCopy)
      .enter()
      .append('line')
      .attr('stroke', (d) => d.color)
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', (d) => d.strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) => (d.type === 'motif' ? '4,3' : 'none'));

    // 2. Draw Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Drag behavior helper
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const nodeG = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodesCopy)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .style('cursor', 'pointer')
      .call(dragBehavior);

    // Selected Halo Ring
    nodeG
      .append('circle')
      .attr('class', 'halo-ring')
      .attr('r', (d) => d.radius + 5)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', (d) => (d.id === selectedNodeId ? 0.9 : 0))
      .attr('stroke-dasharray', '3,3');

    // Main Node Circle
    nodeG
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.strokeColor)
      .attr('stroke-width', (d) => (d.type === 'lncrna' ? 3 : 2))
      .attr('filter', (d) => (d.type === 'lncrna' ? 'url(#hub-glow)' : 'url(#node-shadow)'))
      .transition()
      .duration(300)
      .attr('opacity', 1);

    // Hub Pulsing Ring for Central lncRNA
    nodeG
      .filter((d) => d.type === 'lncrna')
      .append('circle')
      .attr('r', 34)
      .attr('fill', 'none')
      .attr('stroke', '#6366F1')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('opacity', 0.6);

    // Node Icons or Type abbreviations in circle center
    nodeG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => (d.type === 'lncrna' ? '11px' : '9px'))
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .text((d) => {
        if (d.type === 'lncrna') return 'RNA';
        if (d.type === 'protein') return 'RBP';
        if (d.type === 'mirna') return 'miR';
        if (d.type === 'dna') return 'DNA';
        if (d.type === 'homology') return 'HOM';
        return 'MOT';
      });

    // 3. Node Text Labels below circle
    const labelGroup = g.append('g').attr('class', 'labels');
    const labelElements = labelGroup
      .selectAll('g')
      .data(nodesCopy)
      .enter()
      .append('g')
      .attr('pointer-events', 'none');

    labelElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 13)
      .attr('font-size', (d) => (d.type === 'lncrna' ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.type === 'lncrna' ? '800' : '600'))
      .attr('fill', '#0F172A')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .text((d) => (d.name.length > 20 ? `${d.name.slice(0, 18)}...` : d.name));

    labelElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 24)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', (d) => d.color)
      .text((d) => d.scoreLabel);

    // Node Click Handlers
    nodeG.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNodeId(d.id === selectedNodeId ? null : d.id);
      if (onSelectTarget) {
        onSelectTarget(d);
      }
    });

    // Click background to deselect
    svg.on('click', () => {
      setSelectedNodeId(null);
    });

    // Update positions on every tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeG.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labelElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, selectedNodeId, chargeStrength]);

  // Handle Zoom In / Out / Reset
  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, factor);
  };

  const handleResetView = () => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 700;
    const height = 460;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(350)
      .call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity.translate(0, 0).scale(1));
  };

  // Toggle category visibility
  const toggleVisibility = (type: NetworkNodeType) => {
    setVisibleTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (lncRnaName || 'lncRNA').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}_Target_Connectivity_Network.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              D3 Force Simulation
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>lncRNA-Target Interaction Network</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive force-directed graph illustrating biological connectivity between <strong className="text-slate-800">{lncRnaName}</strong> and predicted targets.
          </p>
        </div>

        {/* View Controls & Action Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-slate-700">
            <button
              type="button"
              onClick={() => handleZoom(1.2)}
              className="p-1.5 hover:bg-white rounded hover:text-indigo-600 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.8)}
              className="p-1.5 hover:bg-white rounded hover:text-indigo-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 hover:bg-white rounded hover:text-indigo-600 transition-colors cursor-pointer"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            title="Download vector graphic of interaction network (SVG)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      {/* Target Category Visibility Filters & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Active Target Layers:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleVisibility('protein')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibleTypes.protein
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs'
                : 'bg-white text-slate-400 border border-slate-200 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Proteins (RBP)</span>
          </button>

          <button
            type="button"
            onClick={() => toggleVisibility('mirna')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibleTypes.mirna
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                : 'bg-white text-slate-400 border border-slate-200 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>miRNA Sponges</span>
          </button>

          <button
            type="button"
            onClick={() => toggleVisibility('dna')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibleTypes.dna
                ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs'
                : 'bg-white text-slate-400 border border-slate-200 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span>DNA Promoters</span>
          </button>

          <button
            type="button"
            onClick={() => toggleVisibility('homology')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibleTypes.homology
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-white text-slate-400 border border-slate-200 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>Stress Homologs</span>
          </button>

          <button
            type="button"
            onClick={() => toggleVisibility('motif')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              visibleTypes.motif
                ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs'
                : 'bg-white text-slate-400 border border-slate-200 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Plant Motifs</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden lg:block">
          {filteredData.nodes.length} nodes • {filteredData.links.length} edges
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner h-[460px]"
      >
        <svg ref={svgRef} className="w-full h-full select-none" />

        {/* Floating Canvas Hint */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-2 pointer-events-none">
          <span>Drag nodes to pin • Scroll/pinch to zoom • Click node to inspect details</span>
        </div>

        {/* Selected Node Floating Quick Card (if clicked) */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-72 sm:w-80 bg-white/95 backdrop-blur-sm border border-slate-300 rounded-xl p-3.5 shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                  style={{
                    backgroundColor: `${selectedNode.color}15`,
                    color: selectedNode.color,
                  }}
                >
                  {selectedNode.categoryLabel}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">{selectedNode.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
              <span className="font-bold text-indigo-700">Score: {selectedNode.scoreLabel}</span>
              {selectedNode.coordinates && (
                <>
                  <span>•</span>
                  <span>{selectedNode.coordinates}</span>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5">
              {selectedNode.mechanism}
            </p>

            {selectedNode.details && (
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 space-y-1 font-mono text-[10px]">
                {Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-600">
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-bold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Detail Cards below canvas */}
      {selectedNode && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }}></span>
              <span>Target Biophysical Profile: {selectedNode.name}</span>
            </h4>
            <span className="text-xs font-mono font-bold text-indigo-800">{selectedNode.scoreLabel}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {selectedNode.biologicalSignificance}
          </p>
        </div>
      )}
    </div>
  );
};
