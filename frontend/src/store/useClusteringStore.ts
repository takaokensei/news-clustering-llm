import { create } from 'zustand';

export interface Document {
  id: number;
  original_text: string;
  expanded_text: string;
  true_class: number;
  true_category: string;
  clustering: {
    [rep: string]: {
      [alg: string]: number;
    };
  };
  projections: {
    [rep: string]: {
      [proj: string]: {
        x: number;
        y: number;
      };
    };
  };
}

export interface Metric {
  silhouette: number;
  davies_bouldin: number;
  ari: number;
  nmi: number;
  purity: number;
  num_clusters: number;
  noise_points: number;
  time_taken: number;
}

export interface LLMExplanation {
  rotulo: string;
  resumo: string;
  analise_fronteira: string;
  coerencia: string;
  latency: number;
}

export interface LLMExplanationWrapper {
  explanations: {
    gemini: LLMExplanation;
    ollama: LLMExplanation;
  };
  central: Array<{
    id: number;
    title: string;
    text: string;
    class: number;
    category: string;
    dist_to_centroid: number;
  }>;
  frontier: Array<{
    id: number;
    title: string;
    text: string;
    class: number;
    category: string;
    silhouette: number;
  }>;
}

interface ClusteringState {
  dataset: Document[];
  metrics: { [config: string]: Metric };
  llmExplanations: {
    [config: string]: {
      [clusterId: string]: LLMExplanationWrapper;
    };
  };
  activeRepresentations: string[];
  loading: boolean;
  error: string | null;
  
  // Selection filters
  selectedRep: string;
  selectedAlg: string;
  selectedProj: string;
  selectedCluster: number | null;
  selectedDocId: number | null;
  colorMode: 'cluster' | 'real'; // Toggle node colors between predicted clusters and true categories
  
  // Actions
  fetchResults: () => Promise<void>;
  setSelectedRep: (rep: string) => void;
  setSelectedAlg: (alg: string) => void;
  setSelectedProj: (proj: string) => void;
  setSelectedCluster: (cluster: number | null) => void;
  setSelectedDocId: (docId: number | null) => void;
  setColorMode: (mode: 'cluster' | 'real') => void;
}

export const useClusteringStore = create<ClusteringState>((set) => ({
  dataset: [],
  metrics: {},
  llmExplanations: {},
  activeRepresentations: [],
  loading: false,
  error: null,
  
  selectedRep: 'sentence_transformers',
  selectedAlg: 'kmeans',
  selectedProj: 'umap',
  selectedCluster: null,
  selectedDocId: null,
  colorMode: 'cluster',

  fetchResults: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch the precomputed JSON from the public directory
      const response = await fetch('/clustering_results.json');
      if (!response.ok) {
        throw new Error(`Erro ao carregar resultados (${response.status}). Certifique-se de que o pipeline Python foi executado.`);
      }
      const data = await response.json();
      
      // Select the first active representation if sentence_transformers is not available
      const activeReps = data.active_representations || [];
      const defaultRep = activeReps.includes('sentence_transformers') 
        ? 'sentence_transformers' 
        : activeReps[0] || 'tfidf';

      set({
        dataset: data.dataset || [],
        metrics: data.metrics || {},
        llmExplanations: data.llm_explanations || {},
        activeRepresentations: activeReps,
        selectedRep: defaultRep,
        loading: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Falha desconhecida', loading: false });
    }
  },

  setSelectedRep: (rep) => set({ selectedRep: rep, selectedCluster: null, selectedDocId: null }),
  setSelectedAlg: (alg) => set({ selectedAlg: alg, selectedCluster: null, selectedDocId: null }),
  setSelectedProj: (proj) => set({ selectedProj: proj }),
  setSelectedCluster: (cluster) => set({ selectedCluster: cluster, selectedDocId: null }),
  setSelectedDocId: (docId) => set({ selectedDocId: docId }),
  setColorMode: (mode) => set({ colorMode: mode })
}));
