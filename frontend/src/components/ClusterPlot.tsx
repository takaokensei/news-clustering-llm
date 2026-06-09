import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useClusteringStore } from '../store/useClusteringStore';
import type { Document } from '../store/useClusteringStore';
import { ZoomIn, ZoomOut, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const ClusterPlot: React.FC = () => {
  const {
    dataset,
    selectedRep,
    selectedAlg,
    selectedProj,
    selectedCluster,
    selectedDocId,
    colorMode,
    setSelectedCluster,
    setSelectedDocId,
    llmExplanations
  } = useClusteringStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Plot state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showAxes, setShowAxes] = useState(true);
  const [hiddenItems, setHiddenItems] = useState<Set<string | number>>(new Set());
  // Track container size for ResizeObserver-driven redraws
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Animation states and refs
  const [animationTick, setAnimationTick] = useState(0);
  const [pulseProgress, setPulseProgress] = useState(0);
  const currentCoordsRef = useRef<Record<number, { x: number; y: number }>>({});
  const animationFrameRef = useRef<number | null>(null);
  const pulseFrameRef = useRef<number | null>(null);

  // Clear hidden items when configurations change
  useEffect(() => {
    setHiddenItems(new Set());
  }, [colorMode, selectedRep, selectedAlg]);

  // ResizeObserver: rerender canvas when container size changes
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleResize]);

  // Initialize coords ref if it's empty and dataset is populated
  if (Object.keys(currentCoordsRef.current).length === 0 && dataset.length > 0) {
    const initialCoords: Record<number, { x: number; y: number }> = {};
    dataset.forEach(doc => {
      const proj = doc.projections[selectedRep]?.[selectedProj];
      if (proj) {
        initialCoords[doc.id] = { x: proj.x, y: proj.y };
      }
    });
    currentCoordsRef.current = initialCoords;
  }

  // Morphing animation effect
  useEffect(() => {
    if (dataset.length === 0) return;

    const targetCoords: Record<number, { x: number; y: number }> = {};
    dataset.forEach(doc => {
      const proj = doc.projections[selectedRep]?.[selectedProj];
      if (proj) {
        targetCoords[doc.id] = { x: proj.x, y: proj.y };
      }
    });

    // If currentCoordsRef is empty, populate it
    if (Object.keys(currentCoordsRef.current).length === 0) {
      currentCoordsRef.current = targetCoords;
      setAnimationTick(t => t + 1);
      return;
    }

    const startCoords = { ...currentCoordsRef.current };
    const startTime = performance.now();
    const duration = 400; // ms

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      const nextCoords: Record<number, { x: number; y: number }> = {};
      dataset.forEach(doc => {
        const start = startCoords[doc.id];
        const target = targetCoords[doc.id];
        if (start && target) {
          nextCoords[doc.id] = {
            x: start.x + (target.x - start.x) * easedProgress,
            y: start.y + (target.y - start.y) * easedProgress,
          };
        } else if (target) {
          nextCoords[doc.id] = target;
        }
      });

      currentCoordsRef.current = nextCoords;
      setAnimationTick(t => t + 1);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedRep, selectedProj, dataset]);

  // Pulse animation effect
  useEffect(() => {
    if (selectedDocId === null) {
      setPulseProgress(0);
      return;
    }

    const startTime = performance.now();
    const duration = 800; // ms

    if (pulseFrameRef.current) {
      cancelAnimationFrame(pulseFrameRef.current);
    }

    const animatePulse = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setPulseProgress(progress);

      if (progress < 1) {
        pulseFrameRef.current = requestAnimationFrame(animatePulse);
      } else {
        pulseFrameRef.current = null;
      }
    };

    pulseFrameRef.current = requestAnimationFrame(animatePulse);

    return () => {
      if (pulseFrameRef.current) {
        cancelAnimationFrame(pulseFrameRef.current);
      }
    };
  }, [selectedDocId]);

  // Native non-passive wheel event listener to allow preventDefault (fixing chrome scroll bug)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(prev * zoomFactor, 15.0));
      } else {
        setZoom(prev => Math.max(prev / zoomFactor, 0.5));
      }
    };

    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  const toggleLegendItem = (item: string | number) => {
    setHiddenItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  // Tokyo Night Colors mapping
  const clusterColors: { [key: number]: string } = {
    [-1]: '#565f89', // Outliers (Muted Gray)
    0: '#7aa2f7',    // Blue
    1: '#bb9af7',    // Purple
    2: '#ff9e64',    // Orange
    3: '#9ece6a',    // Green
    4: '#7dcfff',    // Cyan
    5: '#e0af68',    // Yellow
    6: '#f7768e',    // Red
    7: '#1abc9c',    // Teal
  };

  const getCategoryColor = (category: string): string => {
    const cleanCat = category.trim().toLowerCase();
    if (cleanCat === 'economia') return '#7aa2f7'; // Economia -> Blue
    if (cleanCat === 'esportes') return '#ff9e64'; // Esportes -> Orange
    if (cleanCat === 'polícia e direitos') return '#f7768e'; // Polícia e Direitos -> Red
    if (cleanCat === 'política') return '#bb9af7'; // Política -> Purple
    if (cleanCat === 'turismo') return '#7dcfff'; // Turismo -> Cyan
    if (cleanCat === 'variedades e sociedade') return '#e0af68'; // Variedades e Sociedade -> Yellow
    return '#1abc9c'; // Fallback -> Teal
  };

  const getDocColor = (doc: Document): string => {
    if (colorMode === 'real') {
      return getCategoryColor(doc.true_category);
    }
    const clusterId = doc.clustering[selectedRep]?.[selectedAlg];
    return clusterColors[clusterId !== undefined ? clusterId : -1];
  };

  // Extract coordinates for current representation and projection
  const getDocCoords = (doc: Document) => {
    const coords = currentCoordsRef.current[doc.id];
    return coords || null;
  };

  const getClusterLabel = (clusterId: number): string => {
    if (clusterId === -1) return 'Ruído / Outliers';
    const configKey = `${selectedRep}_${selectedAlg}`;
    const clusterData = llmExplanations[configKey]?.[clusterId];
    if (clusterData) {
      const explanation = clusterData?.explanations?.gemini?.rotulo !== 'Não Executado' && clusterData?.explanations?.gemini?.rotulo !== 'Erro ao Processar'
        ? clusterData?.explanations?.gemini 
        : clusterData?.explanations?.ollama;
      if (explanation && explanation.rotulo && explanation.rotulo !== 'Não Executado' && explanation.rotulo !== 'Erro ao Processar') {
        return `${explanation.rotulo}`;
      }
    }
    // Fallback: derive dominant category from dataset when LLM is not available
    const clusterDocs = dataset.filter(doc => doc.clustering[selectedRep]?.[selectedAlg] === clusterId);
    if (clusterDocs.length > 0) {
      const counts: Record<string, number> = {};
      clusterDocs.forEach(d => { counts[d.true_category] = (counts[d.true_category] || 0) + 1; });
      const dominant = Object.entries(counts).sort(([,a],[,b]) => b - a)[0]?.[0];
      if (dominant) return `${dominant} (${clusterDocs.length})`;  
    }
    return `Cluster ${clusterId}`;
  };

  // Reset zoom and pan to fit all points
  const resetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Trigger redraw on state change (also triggered by containerSize change via ResizeObserver)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container dimensions
    const width = containerRef.current?.clientWidth || 600;
    const height = containerRef.current?.clientHeight || 450;
    
    // Scale canvas for high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear background (Tokyo Night dark background)
    ctx.fillStyle = '#16161e';
    ctx.fillRect(0, 0, width, height);

    // Filter valid documents that have coordinates for selected configs and are not hidden
    const validDocs = dataset.filter(doc => {
      if (getDocCoords(doc) === null) return false;
      if (colorMode === 'real') {
        if (hiddenItems.has(doc.true_category)) return false;
      } else {
        const clusterId = doc.clustering[selectedRep]?.[selectedAlg];
        if (clusterId !== undefined && hiddenItems.has(clusterId)) return false;
      }
      return true;
    });

    const allValidDocs = dataset.filter(doc => getDocCoords(doc) !== null);
    if (allValidDocs.length === 0) {
      // Draw message if empty
      ctx.fillStyle = '#a9b1d6';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhum dado disponível. Execute o pipeline Python.', width / 2, height / 2);
      return;
    }

    if (validDocs.length === 0 && dataset.length > 0) {
      ctx.fillStyle = '#a9b1d6';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma classe visível. Ative as classes na legenda abaixo.', width / 2, height / 2);
      return;
    }

    // Find min/max ranges in the raw coordinates to fit to canvas using ALL points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    allValidDocs.forEach(doc => {
      const coords = getDocCoords(doc)!;
      if (coords.x < minX) minX = coords.x;
      if (coords.x > maxX) maxX = coords.x;
      if (coords.y < minY) minY = coords.y;
      if (coords.y > maxY) maxY = coords.y;
    });

    // Add padding to bounding box
    const dx = maxX - minX || 1.0;
    const dy = maxY - minY || 1.0;
    minX -= dx * 0.1;
    maxX += dx * 0.1;
    minY -= dy * 0.1;
    maxY += dy * 0.1;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    // Helper function to project raw data coords to canvas viewport
    const project = (x: number, y: number) => {
      // Scale coordinates from range to canvas dimensions
      const screenX = ((x - minX) / rangeX) * width;
      // Invert Y axis for screen space
      const screenY = height - ((y - minY) / rangeY) * height;

      // Apply zoom and pan transformations
      const transformedX = (screenX - width / 2) * zoom + width / 2 + pan.x;
      const transformedY = (screenY - height / 2) * zoom + height / 2 + pan.y;

      return { x: transformedX, y: transformedY };
    };

    // Unproject helper removed due to strict tsc unused local variable rules

    // Draw Grid and Axes
    if (showAxes) {
      ctx.strokeStyle = 'rgba(56, 66, 97, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = '#565f89';

      // Draw horizontal reference grid lines
      for (let i = 1; i < 5; i++) {
        const gridY = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, gridY);
        ctx.lineTo(width, gridY);
        ctx.stroke();
      }

      // Draw vertical grid lines
      for (let i = 1; i < 5; i++) {
        const gridX = (width / 5) * i;
        ctx.beginPath();
        ctx.moveTo(gridX, 0);
        ctx.lineTo(gridX, height);
        ctx.stroke();
      }
    }

    // 1. First Pass: Draw Unselected Nodes (slightly faded out if a cluster is focused)
    validDocs.forEach(doc => {
      const coords = getDocCoords(doc)!;
      const pos = project(coords.x, coords.y);

      const clusterId = doc.clustering[selectedRep]?.[selectedAlg];
      const isFocusedCluster = selectedCluster === null || clusterId === selectedCluster;

      if (!isFocusedCluster) {
        // Draw unselected nodes faded out
        ctx.fillStyle = getDocColor(doc);
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1.0;

    // 2. Second Pass: Draw Selected/Focused Nodes
    validDocs.forEach(doc => {
      const coords = getDocCoords(doc)!;
      const pos = project(coords.x, coords.y);

      const clusterId = doc.clustering[selectedRep]?.[selectedAlg];
      const isFocusedCluster = selectedCluster === null || clusterId === selectedCluster;

      if (isFocusedCluster) {
        const isSelectedDoc = doc.id === selectedDocId;
        const color = getDocColor(doc);

        // Draw soft glow under focused items
        if (isSelectedDoc) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelectedDoc ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw outer ring for the active selection
        if (isSelectedDoc) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
          ctx.stroke();
          // Reset shadow
          ctx.shadowBlur = 0;
        }
      }
    });

    // Draw Selection Pulse ring
    if (selectedDocId !== null && pulseProgress > 0 && pulseProgress < 1) {
      const selectedDoc = dataset.find(d => d.id === selectedDocId);
      if (selectedDoc) {
        const coords = getDocCoords(selectedDoc);
        if (coords) {
          const pos = project(coords.x, coords.y);
          const color = getDocColor(selectedDoc);
          const maxRadius = 24;
          const minRadius = 8;
          const radius = minRadius + (maxRadius - minRadius) * pulseProgress;
          const alpha = 1.0 - pulseProgress;

          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // 3. Third Pass: Draw Hover Ring
    if (hoveredDoc) {
      const coords = getDocCoords(hoveredDoc);
      if (coords) {
        const pos = project(coords.x, coords.y);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Attach unproject for mouse click mapping
    canvas.setAttribute('data-unproject', JSON.stringify({ minX, rangeX, minY, rangeY, width, height }));

  }, [dataset, selectedRep, selectedAlg, selectedProj, selectedCluster, selectedDocId, zoom, pan, hoveredDoc, colorMode, showAxes, hiddenItems, containerSize, animationTick, pulseProgress]);

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    // Hit testing: Find node closest to cursor
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Unproject bounds logic (replicated locally for precision)
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const validDocs = dataset.filter(doc => {
      if (getDocCoords(doc) === null) return false;
      if (colorMode === 'real') {
        if (hiddenItems.has(doc.true_category)) return false;
      } else {
        const clusterId = doc.clustering[selectedRep]?.[selectedAlg];
        if (clusterId !== undefined && hiddenItems.has(clusterId)) return false;
      }
      return true;
    });
    if (validDocs.length === 0) return;

    const allValidDocs = dataset.filter(doc => getDocCoords(doc) !== null);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    allValidDocs.forEach(doc => {
      const coords = getDocCoords(doc)!;
      if (coords.x < minX) minX = coords.x;
      if (coords.x > maxX) maxX = coords.x;
      if (coords.y < minY) minY = coords.y;
      if (coords.y > maxY) maxY = coords.y;
    });

    const dx = maxX - minX || 1.0;
    const dy = maxY - minY || 1.0;
    minX -= dx * 0.1;
    maxX += dx * 0.1;
    minY -= dy * 0.1;
    maxY += dy * 0.1;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    let closestDoc: Document | null = null;
    let minDistance = 15; // Hit radius in screen pixels

    validDocs.forEach(doc => {
      const coords = getDocCoords(doc)!;
      const screenX = ((coords.x - minX) / rangeX) * width;
      const screenY = height - ((coords.y - minY) / rangeY) * height;

      const tx = (screenX - width / 2) * zoom + width / 2 + pan.x;
      const ty = (screenY - height / 2) * zoom + height / 2 + pan.y;

      const dist = Math.sqrt((tx - mouseX) ** 2 + (ty - mouseY) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestDoc = doc;
      }
    });

    if (closestDoc) {
      setHoveredDoc(closestDoc);
      // Bounds-checked tooltip: keep it within container (288px wide tooltip)
      const TOOLTIP_W = 290;
      const TOOLTIP_H = 130;
      const safeX = mouseX + 15 + TOOLTIP_W > width ? mouseX - TOOLTIP_W - 10 : mouseX + 15;
      const safeY = mouseY - 45 < 0 ? mouseY + 15 : mouseY - TOOLTIP_H > height ? height - TOOLTIP_H - 10 : mouseY - 45;
      setHoverPos({ x: safeX, y: safeY });
    } else {
      setHoveredDoc(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseClick = () => {
    // Prevent selection if panning happened
    if (hoveredDoc) {
      setSelectedDocId(hoveredDoc.id);
      const clusterId = hoveredDoc.clustering[selectedRep]?.[selectedAlg];
      if (clusterId !== undefined) {
        setSelectedCluster(clusterId);
      }
    } else {
      // Clear selection if clicked on empty space
      setSelectedDocId(null);
      setSelectedCluster(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col glass-panel rounded-xl overflow-hidden">
      {/* Plot Toolbar */}
      <div className="flex justify-between items-center px-4 py-2 bg-tokyo-dark bg-opacity-70 border-b border-tokyo-border text-sm z-10">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-tokyo-blue">Visualização 2D</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-tokyo-panel text-tokyo-cyan border border-tokyo-border uppercase">
            {selectedProj}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Toggle Grid */}
          <button 
            onClick={() => setShowAxes(!showAxes)}
            className={`p-1.5 rounded transition ${showAxes ? 'text-tokyo-blue bg-tokyo-blue bg-opacity-10' : 'text-tokyo-muted hover:text-tokyo-text'}`}
            title="Grade de Referência"
          >
            {showAxes ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          {/* Zoom In */}
          <button 
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 15.0))}
            className="p-1.5 rounded text-tokyo-muted hover:text-tokyo-text hover:bg-tokyo-panel transition"
            title="Aumentar Zoom"
          >
            <ZoomIn size={16} />
          </button>
          
          {/* Zoom Out */}
          <button 
            onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.5))}
            className="p-1.5 rounded text-tokyo-muted hover:text-tokyo-text hover:bg-tokyo-panel transition"
            title="Diminuir Zoom"
          >
            <ZoomOut size={16} />
          </button>
          
          {/* Reset View */}
          <button 
            onClick={resetZoom}
            className="p-1.5 rounded text-tokyo-muted hover:text-tokyo-text hover:bg-tokyo-panel transition"
            title="Redefinir Visão"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Plot Canvas */}
      <div ref={containerRef} className="flex-1 w-full relative cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleMouseClick}
          className="absolute inset-0 block"
        />

        {/* Floating Custom Tooltip */}
        {hoveredDoc && (
          <div
            style={{ left: hoverPos.x, top: hoverPos.y }}
            className="absolute z-20 pointer-events-none w-72 p-3 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-95 shadow-xl text-xs backdrop-blur-md transition-all duration-75"
          >
            <div className="flex justify-between items-start mb-1.5">
              <span 
                className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                style={{ 
                  backgroundColor: `${getDocColor(hoveredDoc)}1A`, 
                  color: getDocColor(hoveredDoc),
                  border: `1px solid ${getDocColor(hoveredDoc)}33`
                }}
              >
                {hoveredDoc.true_category}
              </span>
              <span className="text-tokyo-muted font-mono text-[9px]">ID: {hoveredDoc.id}</span>
            </div>
            <h4 className="font-semibold text-tokyo-text line-clamp-2 mb-1">
              {hoveredDoc.original_text}
            </h4>
            <p className="text-[10px] text-tokyo-muted line-clamp-3 italic">
              {hoveredDoc.expanded_text}
            </p>
            <div className="mt-2 pt-1 border-t border-tokyo-border flex justify-between text-[9px] text-tokyo-muted font-mono">
              <span>Cluster Predito:</span>
              <span className="font-bold text-tokyo-magenta">
                #{hoveredDoc.clustering[selectedRep]?.[selectedAlg]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Helper Legend Panel */}
      <div className="px-4 py-2 bg-tokyo-dark bg-opacity-80 border-t border-tokyo-border text-[10px] text-tokyo-muted z-10 flex flex-wrap justify-between items-center space-x-2 gap-y-1">
        <span>Arraste para mover, roda do mouse para zoom, clique para detalhar. Clique na legenda para ocultar classes.</span>
        <div className="flex flex-wrap gap-3">
          {colorMode === 'real' ? (
            // Real categories legend
            ["Economia", "Esportes", "Polícia e Direitos", "Política", "Turismo", "Variedades e Sociedade"].map(cat => {
              const isHidden = hiddenItems.has(cat);
              const color = getCategoryColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleLegendItem(cat)}
                  className={`flex items-center space-x-1.5 hover:text-tokyo-text transition cursor-pointer select-none ${isHidden ? 'opacity-40' : 'opacity-100'}`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border transition" 
                    style={{ 
                      backgroundColor: isHidden ? 'transparent' : color, 
                      borderColor: color 
                    }}
                  />
                  <span className={isHidden ? 'line-through decoration-tokyo-muted' : ''}>{cat}</span>
                </button>
              );
            })
          ) : (
            // Cluster IDs legend
            Array.from(new Set(dataset.map(doc => doc.clustering[selectedRep]?.[selectedAlg]).filter(val => val !== undefined)))
              .sort((a, b) => a - b)
              .map(clusterId => {
                const isHidden = hiddenItems.has(clusterId);
                const color = clusterColors[clusterId] || '#565f89';
                const label = getClusterLabel(clusterId);
                return (
                  <button
                    key={clusterId}
                    onClick={() => toggleLegendItem(clusterId)}
                    className={`flex items-center space-x-1.5 hover:text-tokyo-text transition cursor-pointer select-none ${isHidden ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full border transition" 
                      style={{ 
                        backgroundColor: isHidden ? 'transparent' : color, 
                        borderColor: color 
                      }}
                    />
                    <span className={isHidden ? 'line-through decoration-tokyo-muted' : ''}>{label}</span>
                  </button>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
