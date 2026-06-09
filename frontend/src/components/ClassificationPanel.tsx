import React, { useState } from 'react';
import { useClusteringStore } from '../store/useClusteringStore';
import { GraduationCap, TrendingUp, ArrowRight, Info } from 'lucide-react';

// Friendly names for representations and classifiers
const REP_NAMES: Record<string, string> = {
  tfidf: 'TF-IDF',
  sentence_transformers: 'Sent. Transformers (PT-BR)',
  ollama: 'Ollama (Nomic)',
};
const CLF_NAMES: Record<string, string> = {
  logistic_regression: 'Regressão Logística',
  svm: 'SVM (LinearSVC)',
};

// Colour scale: green ≥ 0.85, yellow 0.70–0.85, orange 0.55–0.70, red < 0.55
const scoreColor = (v: number): string => {
  if (v >= 0.85) return 'text-tokyo-green';
  if (v >= 0.70) return 'text-tokyo-yellow';
  if (v >= 0.55) return 'text-tokyo-orange';
  return 'text-tokyo-red';
};

const scoreBarColor = (v: number): string => {
  if (v >= 0.85) return '#9ece6a';
  if (v >= 0.70) return '#e0af68';
  if (v >= 0.55) return '#ff9e64';
  return '#f7768e';
};

export const ClassificationPanel: React.FC = () => {
  const { classification, metrics, selectedRep, selectedAlg } = useClusteringStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'perclass'>('overview');

  // Best clustering config for this representation (highest ARI)
  const clusterKey = `${selectedRep}_${selectedAlg}`;
  const clusterMetric = metrics[clusterKey];

  if (!classification || Object.keys(classification).length === 0) {
    return (
      <div className="glass-panel rounded-xl p-4 text-center text-tokyo-muted text-xs h-full flex items-center justify-center">
        <div className="space-y-2">
          <GraduationCap size={28} className="mx-auto text-tokyo-muted opacity-50" />
          <p>Classificação supervisionada não encontrada.</p>
          <p className="text-[10px]">Execute o pipeline Python para gerar os resultados.</p>
        </div>
      </div>
    );
  }

  // Flatten all results into rows for the overview table
  type Row = {
    rep: string; clf: string;
    acc: number; f1_macro: number; f1_weighted: number; time: number;
    f1_per_class: Record<string, number>;
  };
  const rows: Row[] = [];
  Object.entries(classification).forEach(([rep, clfMap]) => {
    if (!clfMap) return;
    Object.entries(clfMap).forEach(([clf, result]) => {
      if (!result) return;
      rows.push({
        rep, clf,
        acc: result.accuracy,
        f1_macro: result.f1_macro,
        f1_weighted: result.f1_weighted,
        time: result.time_taken,
        f1_per_class: result.f1_per_class ?? {},
      });
    });
  });

  // Best supervised row (by f1_macro)
  const bestSupervised = [...rows].sort((a, b) => b.f1_macro - a.f1_macro)[0];

  // Best unsupervised (by ARI across all reps)
  let bestClusterARI = -1;
  let bestClusterKey = '';
  Object.entries(metrics).forEach(([key, m]) => {
    if (m.ari > bestClusterARI) { bestClusterARI = m.ari; bestClusterKey = key; }
  });
  const bestClusterMetric = metrics[bestClusterKey];

  // Per-class table — use selected representation's best classifier
  const repClassification = classification[selectedRep];
  const perClassData = repClassification
    ? Object.values(repClassification).find(r => r !== null)
    : null;

  return (
    <div className="glass-panel rounded-xl flex flex-col text-xs h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-tokyo-dark bg-opacity-70 border-b border-tokyo-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap size={15} className="text-tokyo-yellow" />
          <h3 className="font-bold text-tokyo-text">Supervisionado vs. Não-Supervisionado</h3>
        </div>
        <div className="flex rounded border border-tokyo-border overflow-hidden text-[10px]">
          {(['overview', 'perclass'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 transition ${activeTab === tab ? 'bg-tokyo-blue text-tokyo-bg font-semibold' : 'text-tokyo-muted hover:text-tokyo-text bg-transparent'}`}
            >
              {tab === 'overview' ? 'Visão Geral' : 'Por Classe'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Hero comparison strip */}
        {bestSupervised && bestClusterMetric && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40">
            {/* Supervised best */}
            <div className="text-center space-y-0.5">
              <p className="text-[9px] text-tokyo-yellow uppercase font-bold tracking-wide">Melhor Supervisionado</p>
              <p className="text-[10px] text-tokyo-muted font-mono">{REP_NAMES[bestSupervised.rep] ?? bestSupervised.rep}</p>
              <p className="text-[10px] text-tokyo-muted">{CLF_NAMES[bestSupervised.clf] ?? bestSupervised.clf}</p>
              <p className={`text-xl font-bold font-mono ${scoreColor(bestSupervised.f1_macro)}`}>
                {(bestSupervised.f1_macro * 100).toFixed(1)}%
              </p>
              <p className="text-[9px] text-tokyo-muted">F1-macro</p>
            </div>

            {/* Arrow + label */}
            <div className="flex flex-col items-center justify-center space-y-1 text-[9px] text-tokyo-muted">
              <ArrowRight size={18} className="text-tokyo-border" />
              <span className="text-center leading-tight">
                Quanto custou<br/>não ter rótulos?
              </span>
              {bestClusterMetric && (
                <span className={`font-bold text-base font-mono ${scoreColor(bestClusterMetric.purity)}`}>
                  {((bestSupervised.f1_macro - bestClusterMetric.ari) * 100).toFixed(1)}%<br/>
                  <span className="text-[9px] font-normal text-tokyo-muted">gap ARI vs F1</span>
                </span>
              )}
            </div>

            {/* Unsupervised best */}
            <div className="text-center space-y-0.5">
              <p className="text-[9px] text-tokyo-blue uppercase font-bold tracking-wide">Melhor Clustering</p>
              <p className="text-[10px] text-tokyo-muted font-mono">{bestClusterKey.replace(/_/g, ' + ')}</p>
              <p className={`text-xl font-bold font-mono ${scoreColor(bestClusterMetric.ari)}`}>
                {(bestClusterMetric.ari * 100).toFixed(1)}%
              </p>
              <p className="text-[9px] text-tokyo-muted">ARI</p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Overview table */}
            <div className="rounded-lg border border-tokyo-border overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-tokyo-dark bg-opacity-70 border-b border-tokyo-border text-[10px] font-mono text-tokyo-muted">
                    <th className="p-1.5 text-left">Representação</th>
                    <th className="p-1.5 text-left">Classificador</th>
                    <th className="p-1.5 text-right">Acc.</th>
                    <th className="p-1.5 text-right">F1-macro</th>
                    <th className="p-1.5 text-right">F1-wtd</th>
                    <th className="p-1.5 text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tokyo-border divide-opacity-30">
                  {rows.map((row, i) => {
                    const isBest = row === bestSupervised;
                    return (
                      <tr key={i} className={`transition ${isBest ? 'bg-tokyo-yellow bg-opacity-5' : 'hover:bg-tokyo-panel hover:bg-opacity-30'}`}>
                        <td className="p-1.5 font-mono text-[10px] text-tokyo-muted">{REP_NAMES[row.rep] ?? row.rep}</td>
                        <td className="p-1.5 text-[10px] text-tokyo-text flex items-center gap-1">
                          {isBest && <span className="text-[8px] text-tokyo-yellow">★</span>}
                          {CLF_NAMES[row.clf] ?? row.clf}
                        </td>
                        <td className={`p-1.5 text-right font-mono font-bold ${scoreColor(row.acc)}`}>{(row.acc * 100).toFixed(1)}%</td>
                        <td className={`p-1.5 text-right font-mono font-bold ${scoreColor(row.f1_macro)}`}>{(row.f1_macro * 100).toFixed(1)}%</td>
                        <td className={`p-1.5 text-right font-mono ${scoreColor(row.f1_weighted)}`}>{(row.f1_weighted * 100).toFixed(1)}%</td>
                        <td className="p-1.5 text-right font-mono text-tokyo-muted">{row.time.toFixed(1)}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Clustering comparison for current selection */}
            {clusterMetric && (
              <div className="p-2.5 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-30 space-y-2">
                <p className="text-[10px] font-semibold text-tokyo-muted flex items-center gap-1">
                  <TrendingUp size={11} className="text-tokyo-blue" />
                  Clustering atual ({clusterKey.replace(/_/g, ' + ')})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'ARI', val: clusterMetric.ari },
                    { label: 'NMI', val: clusterMetric.nmi },
                    { label: 'Pureza', val: clusterMetric.purity },
                  ].map(({ label, val }) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-tokyo-muted font-mono">
                        <span>{label}</span>
                        <span className={scoreColor(val)}>{(val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-tokyo-dark rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, val) * 100}%`, backgroundColor: scoreBarColor(val) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-1.5 text-[10px] text-tokyo-muted p-2 rounded border border-tokyo-border border-opacity-40 bg-tokyo-dark bg-opacity-20">
              <Info size={11} className="mt-0.5 shrink-0 text-tokyo-blue" />
              <span>
                Classificadores usam <strong className="text-tokyo-text">5-fold CV estratificado</strong>. Métricas de clustering são calculadas no conjunto completo sem rótulos.
              </span>
            </div>
          </>
        )}

        {activeTab === 'perclass' && perClassData && (
          <div className="space-y-2">
            <p className="text-[10px] text-tokyo-muted font-mono">
              F1 por classe — {REP_NAMES[selectedRep] ?? selectedRep}
            </p>
            {Object.entries(perClassData.f1_per_class ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([className, f1]) => {
                const val = f1 as number;
                return (
                  <div key={className} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-tokyo-text">{className}</span>
                      <span className={`font-bold ${scoreColor(val)}`}>{(val * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-tokyo-dark rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${val * 100}%`, backgroundColor: scoreBarColor(val) }}
                      />
                    </div>
                  </div>
                );
              })}
            <p className="text-[9px] text-tokyo-muted pt-1 italic">
              Classes com F1 baixo indicam dificuldade na separação — provavelmente as mesmas afetadas pelo clustering.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
