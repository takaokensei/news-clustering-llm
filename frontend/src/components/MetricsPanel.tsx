import React from 'react';
import { useClusteringStore } from '../store/useClusteringStore';
import { Activity, BarChart3, TrendingUp, Shuffle, Settings, ShieldCheck } from 'lucide-react';

export const MetricsPanel: React.FC = () => {
  const {
    metrics,
    selectedRep,
    selectedAlg
  } = useClusteringStore();

  const currentKey = `${selectedRep}_${selectedAlg}`;
  const currentMetric = metrics[currentKey];

  // List of all algorithms to show comparison list
  const algorithms = [
    { id: 'kmeans', name: 'K-Means' },
    { id: 'agglomerative', name: 'Hierárquico (Agglomerative)' },
    { id: 'dbscan', name: 'DBSCAN' },
    { id: 'hdbscan', name: 'HDBSCAN' }
  ];

  if (!currentMetric) {
    return (
      <div className="glass-panel rounded-xl p-4 text-center text-tokyo-muted">
        Carregando métricas científicas do pipeline...
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col space-y-4 text-xs h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tokyo-border pb-2.5">
        <div className="flex items-center space-x-2">
          <BarChart3 size={16} className="text-tokyo-cyan" />
          <h3 className="font-bold text-tokyo-text">Métricas Científicas</h3>
        </div>
        <span className="text-[10px] text-tokyo-muted font-mono uppercase">{selectedRep}</span>
      </div>

      {/* Grid of Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Silhouette Card */}
        <div className="p-2.5 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40 flex flex-col justify-between">
          <span className="text-[10px] text-tokyo-muted font-semibold uppercase flex items-center">
            <TrendingUp size={11} className="mr-1 text-tokyo-blue" />
            Silhueta
          </span>
          <div className="my-1.5">
            <span className="text-lg font-bold text-tokyo-text font-mono">
              {currentMetric.silhouette > -1 ? currentMetric.silhouette.toFixed(3) : 'N/A'}
            </span>
          </div>
          <span className="text-[9px] text-tokyo-muted leading-tight">
            Não sup: [-1, +1]. Maior indica melhor separação.
          </span>
        </div>

        {/* ARI Card */}
        <div className="p-2.5 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40 flex flex-col justify-between">
          <span className="text-[10px] text-tokyo-muted font-semibold uppercase flex items-center">
            <Shuffle size={11} className="mr-1 text-tokyo-magenta" />
            Índice Rand (ARI)
          </span>
          <div className="my-1.5">
            <span className="text-lg font-bold text-tokyo-text font-mono">
              {currentMetric.ari.toFixed(3)}
            </span>
          </div>
          <span className="text-[9px] text-tokyo-muted leading-tight">
            Sup: Acordo com classes reais. Ideal é 1.0.
          </span>
        </div>

        {/* NMI Card */}
        <div className="p-2.5 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40 flex flex-col justify-between">
          <span className="text-[10px] text-tokyo-muted font-semibold uppercase flex items-center">
            <Activity size={11} className="mr-1 text-tokyo-cyan" />
            Info Mútua (NMI)
          </span>
          <div className="my-1.5">
            <span className="text-lg font-bold text-tokyo-text font-mono">
              {currentMetric.nmi.toFixed(3)}
            </span>
          </div>
          <span className="text-[9px] text-tokyo-muted leading-tight">
            Sup: Alinhamento de informação compartilhada.
          </span>
        </div>

        {/* Purity Card */}
        <div className="p-2.5 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40 flex flex-col justify-between">
          <span className="text-[10px] text-tokyo-muted font-semibold uppercase flex items-center">
            <ShieldCheck size={11} className="mr-1 text-tokyo-green" />
            Pureza do Cluster
          </span>
          <div className="my-1.5">
            <span className="text-lg font-bold text-tokyo-text font-mono">
              {currentMetric.purity.toFixed(3)}
            </span>
          </div>
          <span className="text-[9px] text-tokyo-muted leading-tight">
            Sup: Fração do tema majoritário no grupo.
          </span>
        </div>
      </div>

      {/* Comparison Table across Algorithms for this representation */}
      <div className="flex-1 flex flex-col min-h-0">
        <h4 className="font-semibold text-tokyo-muted mb-2 flex items-center">
          <Settings size={12} className="mr-1.5 text-tokyo-blue" />
          Comparativo de Algoritmos (para {selectedRep})
        </h4>

        <div className="flex-1 overflow-y-auto border border-tokyo-border rounded-lg bg-tokyo-panel bg-opacity-35">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-tokyo-dark bg-opacity-70 border-b border-tokyo-border text-[10px] font-mono text-tokyo-muted">
                <th className="p-2 font-bold">Algoritmo</th>
                <th className="p-2 text-right">Grupos (K)</th>
                <th className="p-2 text-right">Silhueta</th>
                <th className="p-2 text-right">ARI</th>
                <th className="p-2 text-right">Pureza</th>
                <th className="p-2 text-right">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tokyo-border divide-opacity-30">
              {algorithms.map((alg) => {
                const key = `${selectedRep}_${alg.id}`;
                const m = metrics[key];
                if (!m) return null;

                const isCurrent = alg.id === selectedAlg;

                return (
                  <tr 
                    key={alg.id} 
                    className={`hover:bg-tokyo-panel hover:bg-opacity-50 transition text-[11px] ${isCurrent ? 'bg-tokyo-blue bg-opacity-5 font-semibold text-tokyo-blue' : 'text-tokyo-text'}`}
                  >
                    <td className="p-2 flex items-center space-x-1">
                      <span>{alg.name}</span>
                      {isCurrent && <span className="text-[9px] px-1 bg-tokyo-blue bg-opacity-10 rounded uppercase">Ativo</span>}
                    </td>
                    <td className="p-2 text-right font-mono">{m.num_clusters} {m.noise_points > 0 && `(+${m.noise_points}R)`}</td>
                    <td className="p-2 text-right font-mono">{m.silhouette > -1 ? m.silhouette.toFixed(3) : 'N/A'}</td>
                    <td className="p-2 text-right font-mono">{m.ari.toFixed(3)}</td>
                    <td className="p-2 text-right font-mono">{m.purity.toFixed(3)}</td>
                    <td className="p-2 text-right font-mono">{m.time_taken < 0.01 ? '<0.01s' : `${m.time_taken.toFixed(2)}s`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
