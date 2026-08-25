'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CorrelatedAsset, AttackGraphData, GraphNode, GraphEdge, Severity } from '@/types/recon';
import { ReconCorrelator } from '@/lib/parsers/correlator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Filter, 
  ShieldAlert, 
  Globe, 
  Server, 
  Radio, 
  Zap, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal,
  Layers,
  Move,
  Maximize2,
  Minimize2,
  Sparkles,
  LayoutGrid,
  Download
} from 'lucide-react';

interface AttackGraphProps {
  assets: CorrelatedAsset[];
  rootDomain: string;
  onSelectAsset?: (asset: CorrelatedAsset) => void;
}

export function AttackGraph({ assets, rootDomain, onSelectAsset }: AttackGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [canvasPanStart, setCanvasPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Free Dragging of individual nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [layoutMode, setLayoutMode] = useState<'radial' | 'tree' | 'clustered'>('radial');

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Filters
  const [showIps, setShowIps] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [showVulns, setShowVulns] = useState(true);
  const [showOnlyAlive, setShowOnlyAlive] = useState(false);

  // Generate Graph Data
  const rawGraphData = useMemo(() => {
    return ReconCorrelator.buildAttackGraph(assets, rootDomain);
  }, [assets, rootDomain]);

  // Filtered Graph Data
  const graphData = useMemo(() => {
    const filteredNodes = rawGraphData.nodes.filter(node => {
      if (node.type === 'ip' && !showIps) return false;
      if (node.type === 'port' && !showPorts) return false;
      if (node.type === 'vulnerability' && !showVulns) return false;
      if (showOnlyAlive && node.type === 'subdomain' && !node.alive) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = rawGraphData.edges.filter(edge => {
      return nodeIds.has(edge.source) && nodeIds.has(edge.target);
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [rawGraphData, showIps, showPorts, showVulns, showOnlyAlive]);

  // Compute base layout positions
  const baseLayoutPositions = useMemo(() => {
    const width = 1200;
    const height = 800;
    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);
    const pos: Record<string, { x: number; y: number }> = {};

    if (layoutMode === 'radial') {
      // 1. Root at center
      const rootNode = graphData.nodes.find(n => n.type === 'root');
      if (rootNode) {
        pos[rootNode.id] = { x: centerX, y: centerY };
      }

      // 2. Subdomains in ring 1
      const subNodes = graphData.nodes.filter(n => n.type === 'subdomain');
      const subRadius = Math.max(220, Math.min(380, 160 + subNodes.length * 12));
      subNodes.forEach((node, i) => {
        const angle = (i / Math.max(1, subNodes.length)) * 2 * Math.PI - Math.PI / 2;
        pos[node.id] = {
          x: Math.round(centerX + subRadius * Math.cos(angle)),
          y: Math.round(centerY + subRadius * Math.sin(angle)),
        };
      });

      // 3. Child nodes orbiting parent
      const childNodes = graphData.nodes.filter(n => n.type !== 'root' && n.type !== 'subdomain');
      childNodes.forEach((node, idx) => {
        const incomingEdge = graphData.edges.find(e => e.target === node.id);
        const parentId = incomingEdge ? incomingEdge.source : null;
        const parentPos = parentId && pos[parentId] ? pos[parentId] : { x: centerX, y: centerY };

        let offsetDist = 85;
        if (node.type === 'vulnerability') offsetDist = 115;
        else if (node.type === 'ip') offsetDist = 70;
        else if (node.type === 'port') offsetDist = 60;

        const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), idx * 17);
        const angle = (hash % 360) * (Math.PI / 180);

        pos[node.id] = {
          x: Math.round(parentPos.x + offsetDist * Math.cos(angle)),
          y: Math.round(parentPos.y + offsetDist * Math.sin(angle)),
        };
      });
    } else if (layoutMode === 'tree') {
      // Hierarchical Tree Layout (Top to Bottom)
      const rootNode = graphData.nodes.find(n => n.type === 'root');
      if (rootNode) {
        pos[rootNode.id] = { x: centerX, y: 80 };
      }

      const subNodes = graphData.nodes.filter(n => n.type === 'subdomain');
      const subStep = width / (subNodes.length + 1);
      subNodes.forEach((node, i) => {
        pos[node.id] = {
          x: Math.round((i + 1) * subStep),
          y: 280,
        };
      });

      const childNodes = graphData.nodes.filter(n => n.type !== 'root' && n.type !== 'subdomain');
      childNodes.forEach((node, idx) => {
        const incomingEdge = graphData.edges.find(e => e.target === node.id);
        const parentId = incomingEdge ? incomingEdge.source : null;
        const parentPos = parentId && pos[parentId] ? pos[parentId] : { x: centerX, y: 280 };

        const hash = (idx % 5) - 2;
        pos[node.id] = {
          x: Math.round(parentPos.x + hash * 45),
          y: node.type === 'vulnerability' ? 520 : (node.type === 'ip' ? 440 : 380),
        };
      });
    } else {
      // Clustered / Organic Layout
      const rootNode = graphData.nodes.find(n => n.type === 'root');
      if (rootNode) pos[rootNode.id] = { x: centerX, y: centerY };

      const subNodes = graphData.nodes.filter(n => n.type === 'subdomain');
      const cols = Math.ceil(Math.sqrt(subNodes.length));
      const spacing = 260;

      subNodes.forEach((node, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const startX = centerX - ((cols - 1) * spacing) / 2;
        const startY = centerY - ((Math.ceil(subNodes.length / cols) - 1) * spacing) / 2;

        pos[node.id] = {
          x: Math.round(startX + col * spacing),
          y: Math.round(startY + row * spacing),
        };
      });

      const childNodes = graphData.nodes.filter(n => n.type !== 'root' && n.type !== 'subdomain');
      childNodes.forEach((node, idx) => {
        const incomingEdge = graphData.edges.find(e => e.target === node.id);
        const parentId = incomingEdge ? incomingEdge.source : null;
        const parentPos = parentId && pos[parentId] ? pos[parentId] : { x: centerX, y: centerY };

        const angle = ((idx * 60) % 360) * (Math.PI / 180);
        const dist = node.type === 'vulnerability' ? 95 : 65;

        pos[node.id] = {
          x: Math.round(parentPos.x + dist * Math.cos(angle)),
          y: Math.round(parentPos.y + dist * Math.sin(angle)),
        };
      });
    }

    return pos;
  }, [graphData, layoutMode]);

  // Merge base layout with custom dragged positions
  const finalPositions = useMemo(() => {
    const combined: Record<string, { x: number; y: number; node: GraphNode }> = {};
    graphData.nodes.forEach(node => {
      const custom = customPositions[node.id];
      const base = baseLayoutPositions[node.id] || { x: 600, y: 400 };
      combined[node.id] = {
        x: custom ? custom.x : base.x,
        y: custom ? custom.y : base.y,
        node,
      };
    });
    return combined;
  }, [graphData, customPositions, baseLayoutPositions]);

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(3.5, Math.max(0.25, zoom * zoomFactor));

    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
      y: mouseY - (mouseY - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  };

  // Canvas pan / Node drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggedNodeId) return; // Node drag takes priority
    setIsCanvasPanning(true);
    setCanvasPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Node Drag Handler Start
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate world coordinates of click
    const worldX = (e.clientX - rect.left - pan.x) / zoom;
    const worldY = (e.clientY - rect.top - pan.y) / zoom;

    const currentPos = finalPositions[nodeId] || { x: worldX, y: worldY };
    setDragOffset({
      x: worldX - currentPos.x,
      y: worldY - currentPos.y,
    });
    setDraggedNodeId(nodeId);
  };

  // Mouse Move: Updates canvas pan or dragged node in real time
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (draggedNodeId) {
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;

      setCustomPositions(prev => ({
        ...prev,
        [draggedNodeId]: {
          x: Math.round(worldX - dragOffset.x),
          y: Math.round(worldY - dragOffset.y),
        },
      }));
    } else if (isCanvasPanning) {
      setPan({
        x: e.clientX - canvasPanStart.x,
        y: e.clientY - canvasPanStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsCanvasPanning(false);
    setDraggedNodeId(null);
  };

  const handleResetLayout = () => {
    setCustomPositions({});
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Export SVG Snapshot
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attack-surface-graph-${rootDomain}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Find associated asset when a node is selected
  const selectedAsset = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === 'subdomain') {
      return assets.find(a => a.subdomain === selectedNode.label) || null;
    }
    if (selectedNode.type === 'vulnerability') {
      return assets.find(a => a.vulnerabilities.some(v => v.id === selectedNode.details?.id)) || null;
    }
    return null;
  }, [selectedNode, assets]);

  return (
    <div 
      className={`relative w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col font-mono select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[750px]'
      }`}
    >
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-xl">
        <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Grafo Interativo</span>
        </div>

        <div className="h-4 w-px bg-zinc-700 mx-1" />

        {/* Layout Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setLayoutMode('radial'); setCustomPositions({}); }}
            className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
              layoutMode === 'radial' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Distribuição Radial em Órbita"
          >
            Órbita
          </button>
          <button
            onClick={() => { setLayoutMode('tree'); setCustomPositions({}); }}
            className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
              layoutMode === 'tree' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Distribuição em Árvore Hierárquica"
          >
            Hierarquia
          </button>
          <button
            onClick={() => { setLayoutMode('clustered'); setCustomPositions({}); }}
            className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
              layoutMode === 'clustered' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Distribuição em Grade Orgânica"
          >
            Grade
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-700 mx-1" />

        {/* Filter Toggles */}
        <button
          onClick={() => setShowIps(!showIps)}
          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
            showIps ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800/60 text-zinc-500'
          }`}
        >
          IPs ({graphData.nodes.filter(n => n.type === 'ip').length})
        </button>

        <button
          onClick={() => setShowPorts(!showPorts)}
          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
            showPorts ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-zinc-800/60 text-zinc-500'
          }`}
        >
          Portas ({graphData.nodes.filter(n => n.type === 'port').length})
        </button>

        <button
          onClick={() => setShowVulns(!showVulns)}
          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
            showVulns ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-zinc-800/60 text-zinc-500'
          }`}
        >
          Vulns ({graphData.nodes.filter(n => n.type === 'vulnerability').length})
        </button>

        <button
          onClick={() => setShowOnlyAlive(!showOnlyAlive)}
          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
            showOnlyAlive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800/60 text-zinc-500'
          }`}
        >
          Apenas Vivos
        </button>

        <div className="h-4 w-px bg-zinc-700 mx-1" />

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar nó..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-zinc-200 text-xs w-28 focus:w-44 transition-all focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Top Right Zoom, Drag & Fullscreen Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md p-1.5 rounded-xl shadow-xl">
        <div className="px-2 text-[11px] text-zinc-400 border-r border-zinc-800 font-mono">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={() => setZoom(z => Math.min(3.5, z + 0.2))}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Zoom In (ou use Scroll do mouse)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZoom(z => Math.max(0.25, z - 0.2))}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Zoom Out (ou use Scroll do mouse)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleCenterView}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Centralizar Visualização"
        >
          <Move className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={handleResetLayout}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Resetar Posições dos Nós"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleExportSvg}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title="Exportar Grafo em SVG"
        >
          <Download className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Interactive Guide Hint */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-zinc-400 shadow-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>🖱️ Arraste qualquer nó livremente • Scroll para Zoom • Arraste o fundo para mover</span>
      </div>

      {/* Interactive SVG Canvas */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
        className={`w-full h-full overflow-hidden bg-radial from-zinc-900/40 via-zinc-950 to-zinc-950 select-none ${
          draggedNodeId ? 'cursor-grabbing' : isCanvasPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="rootGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vulnGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nodeDragGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${Math.round(pan.x)}, ${Math.round(pan.y)}) scale(${Number(zoom.toFixed(2))})`}>
            {/* Background Subtle Grid */}
            <pattern id="graphGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#27272a" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            <rect x="-3000" y="-3000" width="8000" height="8000" fill="url(#graphGrid)" />

            {/* Edges */}
            {graphData.edges.map((edge) => {
              const sourcePos = finalPositions[edge.source];
              const targetPos = finalPositions[edge.target];
              if (!sourcePos || !targetPos) return null;

              const isVulnEdge = edge.type === 'vulnerable_to';
              const isHighlight = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

              const sx = Math.round(sourcePos.x);
              const sy = Math.round(sourcePos.y);
              const tx = Math.round(targetPos.x);
              const ty = Math.round(targetPos.y);

              return (
                <g key={edge.id}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={isHighlight ? '#38bdf8' : isVulnEdge ? '#ef4444' : '#27272a'}
                    strokeWidth={isHighlight ? 2.5 : isVulnEdge ? 1.5 : 1}
                    strokeDasharray={isVulnEdge ? '4,4' : undefined}
                    strokeOpacity={isHighlight ? 1 : 0.7}
                  />
                  {edge.label && (
                    <text
                      x={Math.round((sx + tx) / 2)}
                      y={Math.round((sy + ty) / 2 - 5)}
                      fill={isVulnEdge ? '#ef4444' : '#71717a'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {Object.values(finalPositions).map(({ x, y, node }) => {
              const isSelected = selectedNode?.id === node.id;
              const isDragged = draggedNodeId === node.id;
              const matchesSearch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
              const nodeX = Math.round(x);
              const nodeY = Math.round(y);

              // Node styling
              let fill = '#18181b';
              let stroke = '#3f3f46';
              let radius = 18;
              let textColor = '#d4d4d8';

              if (node.type === 'root') {
                fill = '#064e3b';
                stroke = '#10b981';
                radius = 28;
                textColor = '#34d399';
              } else if (node.type === 'subdomain') {
                radius = 20;
                if (node.severity === 'critical' || node.severity === 'high') {
                  fill = '#450a0a';
                  stroke = '#ef4444';
                  textColor = '#fca5a5';
                } else if (node.alive) {
                  fill = '#022c22';
                  stroke = '#10b981';
                  textColor = '#6ee7b7';
                } else {
                  fill = '#18181b';
                  stroke = '#52525b';
                  textColor = '#a1a1aa';
                }
              } else if (node.type === 'ip') {
                fill = '#083344';
                stroke = '#06b6d4';
                radius = 14;
                textColor = '#67e8f9';
              } else if (node.type === 'port') {
                fill = '#451a03';
                stroke = '#f59e0b';
                radius = 12;
                textColor = '#fcd34d';
              } else if (node.type === 'vulnerability') {
                fill = '#7f1d1d';
                stroke = '#dc2626';
                radius = 15;
                textColor = '#fca5a5';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${nodeX}, ${nodeY})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    if (onSelectAsset && selectedAsset) onSelectAsset(selectedAsset);
                  }}
                  className="cursor-move group"
                >
                  {/* Drag Glow Ring */}
                  {isDragged && (
                    <circle
                      r={radius + 14}
                      fill="url(#nodeDragGlow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Glow for Vulns or Selected */}
                  {(node.type === 'vulnerability' || matchesSearch || isSelected) && !isDragged && (
                    <circle
                      r={radius + 8}
                      fill={node.type === 'vulnerability' ? 'url(#vulnGlow)' : '#06b6d4'}
                      opacity={matchesSearch || isSelected ? 0.4 : 0.8}
                      className={node.type === 'vulnerability' ? 'animate-pulse' : ''}
                    />
                  )}

                  {/* Base Circle */}
                  <circle
                    r={radius}
                    fill={fill}
                    stroke={isDragged ? '#38bdf8' : isSelected ? '#38bdf8' : stroke}
                    strokeWidth={isDragged ? 3.5 : isSelected ? 3 : 1.5}
                    className="transition-all group-hover:stroke-cyan-400 group-hover:scale-105"
                  />

                  {/* Status Indicator Dot */}
                  {node.type === 'subdomain' && node.alive && (
                    <circle cx={radius - 4} cy={-radius + 4} r="4" fill="#10b981" />
                  )}

                  {/* Label Text */}
                  <text
                    y={radius + 14}
                    fill={matchesSearch ? '#38bdf8' : textColor}
                    fontSize={node.type === 'root' ? '12' : '10'}
                    fontWeight={node.type === 'root' || isSelected || isDragged ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="select-none pointer-events-none drop-shadow"
                  >
                    {node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Node Details Slide-over Drawer */}
      {selectedNode && (
        <div className="absolute right-3 bottom-3 top-16 w-80 lg:w-96 bg-zinc-900/95 border border-zinc-800 rounded-xl backdrop-blur-md p-4 shadow-2xl z-30 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  selectedNode.type === 'vulnerability' ? 'bg-red-950 text-red-400 border border-red-800' :
                  selectedNode.type === 'subdomain' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  selectedNode.type === 'ip' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                  'bg-zinc-800 text-zinc-300'
                }`}>
                  {selectedNode.type}
                </span>
                <h4 className="text-zinc-100 font-bold text-sm truncate max-w-[200px]" title={selectedNode.label}>
                  {selectedNode.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subdomain Asset Details */}
            {selectedAsset && (
              <div className="mt-3 space-y-3 text-xs">
                {selectedAsset.httpTitle && (
                  <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">HTTP TITLE</span>
                    <span className="text-zinc-200 font-medium">{selectedAsset.httpTitle}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">STATUS</span>
                    <span className={`font-bold ${selectedAsset.httpStatus === 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedAsset.httpStatus || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] block">SERVER</span>
                    <span className="text-zinc-300 truncate block">{selectedAsset.webServer || 'Desconhecido'}</span>
                  </div>
                </div>

                {/* IPs */}
                {selectedAsset.ips.length > 0 && (
                  <div>
                    <span className="text-zinc-500 text-[10px] block mb-1">ENDEREÇOS IP</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.ips.map(ip => (
                        <span key={ip} className="bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded text-[11px]">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Ports */}
                {selectedAsset.ports.length > 0 && (
                  <div>
                    <span className="text-zinc-500 text-[10px] block mb-1">PORTAS ABERTAS</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.ports.map(p => (
                        <span key={p.port} className="bg-amber-950/60 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded text-[11px]">
                          :{p.port} ({p.service || 'tcp'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technologies */}
                {selectedAsset.technologies.length > 0 && (
                  <div>
                    <span className="text-zinc-500 text-[10px] block mb-1">STACK TECNOLÓGICA</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.technologies.map(t => (
                        <span key={t.name} className="bg-purple-950/60 border border-purple-800/80 text-purple-300 px-2 py-0.5 rounded text-[11px]">
                          {t.name} {t.version ? `v${t.version}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vulnerabilities list */}
                {selectedAsset.vulnerabilities.length > 0 && (
                  <div>
                    <span className="text-red-400 font-bold text-[11px] block mb-1">VULNERABILIDADES ({selectedAsset.vulnerabilities.length})</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedAsset.vulnerabilities.map(v => (
                        <div key={v.id} className="bg-red-950/40 border border-red-900/60 p-2 rounded text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-300">{v.name}</span>
                            <span className="uppercase text-[9px] px-1 py-0.5 rounded bg-red-900 text-red-200">{v.severity}</span>
                          </div>
                          {v.cve && <span className="text-[10px] text-zinc-400 block mt-0.5">{v.cve.join(', ')}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vulnerability Node Details */}
            {selectedNode.type === 'vulnerability' && selectedNode.details && (
              <div className="mt-3 space-y-3 text-xs">
                <div className="bg-red-950/40 border border-red-900/80 p-2.5 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-400 text-[10px]">TEMPLATE NUCLEI</span>
                    <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-200">
                      {selectedNode.details.severity}
                    </span>
                  </div>
                  <span className="font-bold text-red-200 block">{selectedNode.details.templateId}</span>
                  {selectedNode.details.description && (
                    <p className="text-zinc-300 mt-2 text-[11px] leading-relaxed">
                      {selectedNode.details.description}
                    </p>
                  )}
                </div>

                {selectedNode.details?.curlCommand && (
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
                      <span>COMANDO DE REPRODUÇÃO (CURL)</span>
                      <button
                        onClick={() => {
                          if (selectedNode.details?.curlCommand) {
                            navigator.clipboard.writeText(selectedNode.details.curlCommand);
                            setCopiedCurl(true);
                            setTimeout(() => setCopiedCurl(false), 2000);
                          }
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCurl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCurl ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="bg-black border border-zinc-800 p-2 rounded text-[10px] text-emerald-400 overflow-x-auto font-mono whitespace-pre-wrap">
                      {selectedNode.details.curlCommand}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Links */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            {selectedAsset && selectedAsset.responseUrl ? (
              <a
                href={selectedAsset.responseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Abrir no Navegador</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-zinc-500 text-[10px]">Nó da Superfície</span>
            )}

            {onSelectAsset && selectedAsset && (
              <button
                onClick={() => onSelectAsset(selectedAsset)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 hover:bg-purple-900 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>AI Threat Review</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
