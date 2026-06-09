import { useEffect } from 'react';
import { useClusteringStore } from './store/useClusteringStore';
import { ClusterPlot } from './components/ClusterPlot';
import { ClusterDetails } from './components/ClusterDetails';
import { LLMComparison } from './components/LLMComparison';
import { MetricsPanel } from './components/MetricsPanel';
import { Brain, RefreshCw } from 'lucide-react';

function App() {
  const {
    loading,
    error,
    activeRepresentations,
    selectedRep,
    selectedAlg,
    selectedProj,
    colorMode,
    fetchResults,
    setSelectedRep,
    setSelectedAlg,
    setSelectedProj,
    setColorMode
  } = useClusteringStore();

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const algs = [
    { id: 'kmeans', name: 'K-Means' },
    { id: 'agglomerative', name: 'Agglomerative' },
    { id: 'dbscan', name: 'DBSCAN' },
    { id: 'hdbscan', name: 'HDBSCAN' }
  ];

  const projs = [
    { id: 'umap', name: 'UMAP' },
    { id: 'tsne', name: 't-SNE' },
    { id: 'pca', name: 'PCA' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex flex-col justify-center items-center relative overflow-hidden">
        {/* Background glow animations */}
        <div className="glow-spot-blue top-1/4 left-1/4 animate-float" />
        <div className="glow-spot-purple bottom-1/4 right-1/4" />
        
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center space-y-4 max-w-xs text-center z-10">
          <Brain size={48} className="text-tokyo-blue animate-pulse" />
          <h2 className="font-bold text-tokyo-text text-lg">Processando Dados</h2>
          <p className="text-xs text-tokyo-muted leading-relaxed">
            Carregando o dataset de notícias e as precomputações do pipeline de ML...
          </p>
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-tokyo-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-tokyo-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-tokyo-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <div className="glow-spot-blue top-1/3 left-1/3" />
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center space-y-4 max-w-md text-center z-10 border border-tokyo-red border-opacity-30">
          <div className="w-12 h-12 rounded-full bg-tokyo-red bg-opacity-10 border border-tokyo-red flex justify-center items-center text-tokyo-red">
            <RefreshCw size={24} className="animate-spin" />
          </div>
          <h2 className="font-bold text-tokyo-text text-lg">Banco de Dados não Encontrado</h2>
          <p className="text-xs text-tokyo-muted leading-relaxed">
            {error}.
          </p>
          <div className="text-xs bg-tokyo-dark bg-opacity-50 p-3 rounded border border-tokyo-border font-mono text-left w-full text-tokyo-text overflow-x-auto">
            $ python backend/pipeline.py
          </div>
          <p className="text-[10px] text-tokyo-muted">
            Execute o pipeline Python acima no diretório do projeto para gerar as embeddings, rodar os clusterings e consultar as LLMs.
          </p>
          <button
            onClick={fetchResults}
            className="w-full py-2 bg-tokyo-blue hover:bg-opacity-80 text-tokyo-bg font-bold rounded-lg transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] text-[#a9b1d6] flex flex-col relative overflow-hidden">
      {/* Dynamic glow decoration */}
      <div className="glow-spot-blue -top-20 -left-20" />
      <div className="glow-spot-purple bottom-10 right-10" />

      {/* Header Bar */}
      <header className="px-6 py-4 border-b border-tokyo-border bg-tokyo-dark bg-opacity-65 backdrop-blur-md z-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-tokyo-blue bg-opacity-10 rounded-lg border border-tokyo-blue border-opacity-20 text-tokyo-blue">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-tokyo-text flex items-center gap-1.5">
              Clusterização & Análise Semântica de Notícias
            </h1>
            <p className="text-[10px] text-tokyo-muted font-mono">
              Projeto de NLP / UFRN — Orientador: Prof. José Alfredo F. Costa
            </p>
          </div>
        </div>

        {/* Filters and options panel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Representation Selector */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] text-tokyo-muted uppercase font-mono">Representação</label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="bg-tokyo-panel border border-tokyo-border rounded px-2.5 py-1 text-xs text-tokyo-text focus:outline-none focus:border-tokyo-blue"
            >
              {activeRepresentations.map(rep => (
                <option key={rep} value={rep}>
                  {rep === 'tfidf' ? 'TF-IDF (Frequencial)' : 
                   rep === 'sentence_transformers' ? 'SentenceTransformers (ST)' : 
                   rep === 'ollama' ? 'Ollama (Nomic)' : rep}
                </option>
              ))}
            </select>
          </div>

          {/* Algorithm Selector */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] text-tokyo-muted uppercase font-mono">Algoritmo</label>
            <select
              value={selectedAlg}
              onChange={(e) => setSelectedAlg(e.target.value)}
              className="bg-tokyo-panel border border-tokyo-border rounded px-2.5 py-1 text-xs text-tokyo-text focus:outline-none focus:border-tokyo-blue"
            >
              {algs.map(alg => (
                <option key={alg.id} value={alg.id}>{alg.name}</option>
              ))}
            </select>
          </div>

          {/* Dimension Reduction Selector */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] text-tokyo-muted uppercase font-mono">Projeção 2D</label>
            <select
              value={selectedProj}
              onChange={(e) => setSelectedProj(e.target.value)}
              className="bg-tokyo-panel border border-tokyo-border rounded px-2.5 py-1 text-xs text-tokyo-text focus:outline-none focus:border-tokyo-blue"
            >
              {projs.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          {/* Toggle Color Mode */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] text-tokyo-muted uppercase font-mono">Colorir Por</label>
            <div className="flex rounded border border-tokyo-border overflow-hidden">
              <button
                onClick={() => setColorMode('cluster')}
                className={`px-3 py-1 text-xs transition ${colorMode === 'cluster' ? 'bg-tokyo-blue text-tokyo-bg font-semibold' : 'bg-tokyo-panel text-tokyo-text hover:bg-opacity-80'}`}
              >
                Grupos
              </button>
              <button
                onClick={() => setColorMode('real')}
                className={`px-3 py-1 text-xs transition ${colorMode === 'real' ? 'bg-tokyo-blue text-tokyo-bg font-semibold' : 'bg-tokyo-panel text-tokyo-text hover:bg-opacity-80'}`}
              >
                Classes Reais
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 relative z-10">
        
        {/* Left Side (Scatter Plot & Multi-views) */}
        <section className="lg:col-span-8 flex flex-col space-y-6 min-h-0">
          
          {/* Scatter Plot 2D */}
          <div className="flex-1 min-h-[400px]">
            <ClusterPlot />
          </div>

          {/* Bottom Grid: Metrics and LLM Comparer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
            <MetricsPanel />
            <LLMComparison />
          </div>

        </section>

        {/* Right Side: Cluster details sidebar */}
        <aside className="lg:col-span-4 h-full">
          <ClusterDetails />
        </aside>

      </main>

      {/* Bottom Footer metadata */}
      <footer className="px-6 py-2.5 bg-tokyo-dark bg-opacity-90 border-t border-tokyo-border text-[9px] text-tokyo-muted flex justify-between items-center z-10">
        <span>Dataset: Base de notícias expandidas (315 registros válidos)</span>
        <div className="flex space-x-4">
          <span>Ollama: qwen2.5:7b</span>
          <span>Gemini: gemini-2.5-flash</span>
          <span>Tokyo Night Design</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
