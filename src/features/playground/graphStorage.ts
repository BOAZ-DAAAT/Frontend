import type { Edge, Node } from '@xyflow/react';

import { ERROR_NODE_DESCRIPTION, type PlaygroundNodeData } from './types';

const GRAPH_STORAGE_KEY = 'daaat.playgroundGraph.v1';

type StoredGraph = {
  nodes: Node<PlaygroundNodeData>[];
  edges: Edge[];
};

function sanitizeNodes(nodes: Node<PlaygroundNodeData>[]): Node<PlaygroundNodeData>[] {
  return nodes.filter(
    (node) => !node.id.startsWith('datasource') && !node.id.startsWith('selecting:'),
  ).map((node) => ({
    ...node,
    data: {
      ...node.data,
      description: node.data.status === 'error'
        ? ERROR_NODE_DESCRIPTION
        : node.data.description,
      animateOnCreate: undefined,
      onDeleteRun: undefined,
    },
  }));
}

export function getStoredPlaygroundGraph(
  fallbackNodes: Node<PlaygroundNodeData>[],
  fallbackEdges: Edge[],
): StoredGraph {
  try {
    const raw = localStorage.getItem(GRAPH_STORAGE_KEY);
    if (!raw) return { nodes: fallbackNodes, edges: fallbackEdges };
    const parsed = JSON.parse(raw) as Partial<StoredGraph>;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return { nodes: fallbackNodes, edges: fallbackEdges };
    }
    return {
      nodes: (parsed.nodes as Node<PlaygroundNodeData>[])
        .filter(
          (node) => !node.id.startsWith('datasource') && !node.id.startsWith('selecting:'),
        )
        .map((node) => ({
          ...node,
          data: {
            ...node.data,
            description: node.data.status === 'error'
              ? ERROR_NODE_DESCRIPTION
              : node.data.description,
            animateOnCreate: false,
          },
        })),
      edges: (parsed.edges as Edge[]).filter(
        (edge) => !edge.source.startsWith('datasource') && !edge.target.startsWith('datasource'),
      ),
    };
  } catch {
    return { nodes: fallbackNodes, edges: fallbackEdges };
  }
}

export function setStoredPlaygroundGraph(
  nodes: Node<PlaygroundNodeData>[],
  edges: Edge[],
): void {
  try {
    const payload: StoredGraph = {
      nodes: sanitizeNodes(nodes),
      edges: edges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          animateOnCreate: undefined,
        },
      })),
    };
    localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep the in-memory graph usable.
  }
}

export function clearStoredPlaygroundGraph(): void {
  try {
    localStorage.removeItem(GRAPH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
