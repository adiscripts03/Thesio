import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type IdeaGraphNodeType =
  | 'user_idea'
  | 'hypothesis'
  | 'problem'
  | 'gap'
  | 'component'
  | 'methodology'
  | 'dataset'
  | 'metric'
  | 'baseline'
  | 'existing_work'
  | 'application';

export type IdeaGraphNodeData = {
  label: string;
  type?: IdeaGraphNodeType | string;
  description?: string;
};

export function getNodeTheme(type?: string): { border: string; badge: string; hex: string } {
  switch (type) {
    case 'user_idea':
    case 'hypothesis':
      return {
        border: 'border-foreground/30 shadow-xs',
        badge: 'bg-secondary text-foreground border border-border font-medium',
        hex: '#334155',
      };
    case 'problem':
    case 'gap':
      return {
        border: 'border-amber-600/40',
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-600/25',
        hex: '#d97706',
      };
    case 'component':
    case 'methodology':
      return {
        border: 'border-blue-600/40',
        badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-600/25',
        hex: '#2563eb',
      };
    case 'dataset':
      return {
        border: 'border-indigo-600/40',
        badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-600/25',
        hex: '#4f46e5',
      };
    case 'metric':
      return {
        border: 'border-border',
        badge: 'bg-secondary text-foreground border border-border',
        hex: '#475569',
      };
    case 'baseline':
      return {
        border: 'border-border/80',
        badge: 'bg-secondary/60 text-muted-foreground border border-border/60',
        hex: '#64748b',
      };
    case 'application':
      return {
        border: 'border-teal-600/40',
        badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-600/25',
        hex: '#0d9488',
      };
    default:
      return {
        border: 'border-border',
        badge: 'bg-secondary text-muted-foreground border border-border',
        hex: '#64748b',
      };
  }
}

function CustomNode({ data }: { data: IdeaGraphNodeData }) {
  const nodeType = data?.type || 'existing_work';
  const theme = getNodeTheme(nodeType);

  return (
    <div
      className={`px-4 py-3 rounded-[6px] border bg-card text-card-foreground w-[250px] shadow-sm ${theme.border} transition-all hover:shadow-md`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left-in" className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`text-[9px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded-[2px] font-semibold uppercase tracking-wider ${theme.badge}`}
        >
          {String(nodeType).replace('_', ' ')}
        </span>
      </div>
      <div className="font-medium text-xs text-[var(--ink)] leading-snug line-clamp-2">
        {data.label}
      </div>
      {data.description && (
        <div className="mt-1 text-[11px] text-[var(--muted-foreground)] leading-tight line-clamp-2">
          {data.description}
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right-out" className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--muted-foreground)] !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export function IdeaGraphCanvas({ nodesData, edgesData }: { nodesData: any[]; edgesData: any[] }) {
  const { nodes, edges } = useMemo(() => {
    if (!Array.isArray(nodesData) || nodesData.length === 0) {
      return { nodes: [], edges: [] };
    }

    const centerNode =
      nodesData.find((n) => n.type === 'hypothesis' || n.type === 'user_idea') || nodesData[0];
    const outerNodes = nodesData.filter((n) => n.id !== centerNode?.id);

    // Spaced elliptical layout so 250px cards don't collide
    const count = Math.max(outerNodes.length, 1);
    const radiusX = Math.max(340, count * 45);
    const radiusY = Math.max(220, count * 32);
    const centerX = radiusX + 60;
    const centerY = radiusY + 60;

    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 120;

    const rfNodes: Node[] = [];

    if (centerNode) {
      rfNodes.push({
        id: String(centerNode.id),
        type: 'custom',
        position: { x: centerX, y: centerY },
        data: {
          label: centerNode.label,
          type: centerNode.type,
          description: centerNode.description,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        initialWidth: NODE_WIDTH,
        initialHeight: NODE_HEIGHT,
      });
    }

    outerNodes.forEach((node, idx) => {
      const angle = (idx / outerNodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = Math.round(centerX + radiusX * Math.cos(angle));
      const y = Math.round(centerY + radiusY * Math.sin(angle));

      rfNodes.push({
        id: String(node.id),
        type: 'custom',
        position: { x, y },
        data: {
          label: node.label,
          type: node.type,
          description: node.description,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        initialWidth: NODE_WIDTH,
        initialHeight: NODE_HEIGHT,
      });
    });

    const safeEdges = Array.isArray(edgesData) ? edgesData : [];
    const rfEdges: Edge[] = safeEdges.map((e, idx) => ({
      id: `e-${idx}`,
      source: String(e.source),
      target: String(e.target),
      label: e.label || e.relationship,
      labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' },
      labelBgStyle: { fill: 'var(--parchment)', fillOpacity: 0.95 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      animated: e.relationship === 'extends' || e.relationship === 'fills_gap',
      style: {
        stroke: e.relationship === 'contradicts' ? 'oklch(0.5 0.17 27)' : 'var(--sienna)',
        strokeWidth: 1.8,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.relationship === 'contradicts' ? 'oklch(0.5 0.17 27)' : 'var(--sienna)',
      },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [nodesData, edgesData]);

  return (
    <div className="w-full h-[520px] rounded-sm border border-[var(--rule)] bg-[var(--background)] overflow-hidden relative paper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        className="bg-[var(--background)]"
      >
        <Background color="var(--rule)" gap={20} size={1} />
        <Controls className="!bg-[var(--parchment)] !border-[var(--rule)] !text-[var(--ink)]" />
      </ReactFlow>
    </div>
  );
}
