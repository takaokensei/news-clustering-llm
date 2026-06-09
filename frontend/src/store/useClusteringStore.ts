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

export interface ClassificationResult {
  accuracy: number;
  f1_macro: number;
  f1_weighted: number;
  f1_per_class: Record<string, number>;
  time_taken: number;
}

interface ClusteringState {
  dataset: Document[];
  metrics: { [config: string]: Metric };
  classification: {
    [rep: string]: {
      [clf: string]: ClassificationResult | null;
    };
  };
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
  searchQuery: string;
  
  // Actions
  fetchResults: () => Promise<void>;
  setSelectedRep: (rep: string) => void;
  setSelectedAlg: (alg: string) => void;
  setSelectedProj: (proj: string) => void;
  setSelectedCluster: (cluster: number | null) => void;
  setSelectedDocId: (docId: number | null) => void;
  setColorMode: (mode: 'cluster' | 'real') => void;
  setSearchQuery: (query: string) => void;
}

export const useClusteringStore = create<ClusteringState>((set) => ({
  dataset: [],
  metrics: {},
  classification: {},
  llmExplanations: {},
  activeRepresentations: [],
  loading: false,
  error: null,
  
  selectedRep: 'ollama',
  selectedAlg: 'kmeans',
  selectedProj: 'umap',
  selectedCluster: null,
  selectedDocId: null,
  colorMode: 'cluster',
  searchQuery: '',

  fetchResults: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch the precomputed JSON from the public directory
      const response = await fetch('/clustering_results.json');
      if (!response.ok) {
        throw new Error(`Erro ao carregar resultados (${response.status}). Certifique-se de que o pipeline Python foi executado.`);
      }
      const data = await response.json();
      
      // Dynamically find the configuration with the highest ARI (Adjusted Rand Index)
      const activeReps = data.active_representations || [];
      let defaultRep = activeReps[0] || 'tfidf';
      let defaultAlg = 'kmeans';
      let maxARI = -1.0;

      if (data.metrics) {
        Object.entries(data.metrics).forEach(([configKey, metricObj]: [string, any]) => {
          const parts = configKey.split('_');
          if (parts.length >= 2) {
            const alg = parts[parts.length - 1];
            const rep = parts.slice(0, parts.length - 1).join('_');
            
            if (activeReps.includes(rep)) {
              if (metricObj.ari > maxARI) {
                maxARI = metricObj.ari;
                defaultRep = rep;
                defaultAlg = alg;
              }
            }
          }
        });
      }

      set({
        dataset: data.dataset || [],
        metrics: data.metrics || {},
        classification: data.classification || {},
        llmExplanations: data.llm_explanations || {},
        activeRepresentations: activeReps,
        selectedRep: defaultRep,
        selectedAlg: defaultAlg,
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
  setColorMode: (mode) => set({ colorMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query })
}));
