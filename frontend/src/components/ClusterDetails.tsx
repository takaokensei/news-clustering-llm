import React, { useState } from 'react';
import { useClusteringStore } from '../store/useClusteringStore';
import { Target, Award, Compass, Layers } from 'lucide-react';

export const ClusterDetails: React.FC = () => {
  const {
    dataset,
    llmExplanations,
    selectedRep,
    selectedAlg,
    selectedCluster,
    selectedDocId,
    setSelectedDocId
  } = useClusteringStore();

  const [activeTab, setActiveTab] = useState<'central' | 'frontier'>('central');

  if (selectedCluster === null) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-6 text-center glass-panel rounded-xl text-tokyo-muted">
        <Compass size={40} className="mb-3 animate-pulse text-tokyo-blue" />
        <h3 className="font-semibold text-tokyo-text mb-1">Selecione um Cluster</h3>
        <p className="text-xs max-w-xs">
          Clique em um ponto do gráfico ou selecione um grupo para analisar suas amostras centrais, amostras de fronteira e rótulos semânticos.
        </p>
      </div>
    );
  }

  const configKey = `${selectedRep}_${selectedAlg}`;
  const clusterData = llmExplanations[configKey]?.[selectedCluster];
  
  // Calculate distribution of true classes in the selected cluster
  const clusterDocs = dataset.filter(doc => doc.clustering[selectedRep]?.[selectedAlg] === selectedCluster);
  const totalInCluster = clusterDocs.length;
  
  const categoryCounts: { [key: string]: number } = {};
  clusterDocs.forEach(doc => {
    categoryCounts[doc.true_category] = (categoryCounts[doc.true_category] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCounts)
    .map(([cat, count]) => ({
      category: cat,
      count,
      percentage: totalInCluster > 0 ? (count / totalInCluster) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Fallback to local computation if LLM is not run for this config
  const explanation = clusterData?.explanations?.gemini?.rotulo !== 'Não Executado'
    ? clusterData?.explanations?.gemini 
    : clusterData?.explanations?.ollama;

  const hasLLMExplanation = !!explanation && explanation.rotulo !== 'Não Executado' && explanation.rotulo !== 'Erro ao Processar';

  const coherenceColors: { [key: string]: string } = {
    'alta': 'text-tokyo-green bg-tokyo-green bg-opacity-10 border-tokyo-green',
    'média': 'text-tokyo-yellow bg-tokyo-yellow bg-opacity-10 border-tokyo-yellow',
    'media': 'text-tokyo-yellow bg-tokyo-yellow bg-opacity-10 border-tokyo-yellow',
    'baixa': 'text-tokyo-red bg-tokyo-red bg-opacity-10 border-tokyo-red',
  };

  const getCoherenceStyle = (coherence: string = 'média') => {
    const clean = coherence.trim().toLowerCase();
    return coherenceColors[clean] || 'text-tokyo-muted bg-tokyo-panel border-tokyo-border';
  };

  // Node details (if a document is clicked)
  const selectedDoc = dataset.find(d => d.id === selectedDocId);

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden text-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-tokyo-dark bg-opacity-70 border-b border-tokyo-border flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Layers size={16} className="text-tokyo-magenta" />
          <h3 className="font-semibold text-tokyo-text">Detalhes do Cluster #{selectedCluster}</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-tokyo-panel border border-tokyo-border text-tokyo-muted">
          {totalInCluster} notícias
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* LLM Title & Summary */}
        <div className="p-3.5 rounded-lg border border-tokyo-border bg-tokyo-dark bg-opacity-40">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h4 className="font-bold text-tokyo-blue flex items-center">
              <Award size={15} className="mr-1.5" />
              {hasLLMExplanation ? explanation.rotulo : `Cluster #${selectedCluster}`}
            </h4>
            {hasLLMExplanation && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold ${getCoherenceStyle(explanation.coerencia)}`}>
                Coerência: {explanation.coerencia}
              </span>
            )}
          </div>
          
          <p className="text-xs text-tokyo-text leading-relaxed">
            {hasLLMExplanation 
              ? explanation.resumo 
              : "Sem explicação automática disponível. Atualmente exibindo estatísticas brutas deste cluster. Certifique-se de executar o pipeline Python com chaves de API."}
          </p>

          {hasLLMExplanation && explanation.analise_fronteira && (
            <div className="mt-3 pt-2.5 border-t border-tokyo-border border-dashed text-[11px] text-tokyo-muted leading-relaxed">
              <span className="font-semibold text-tokyo-yellow block mb-1">Análise de Ambiguidade:</span>
              {explanation.analise_fronteira}
            </div>
          )}
        </div>

        {/* Category Alignment / Distribution */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-tokyo-muted flex items-center">
            <Target size={14} className="mr-1.5 text-tokyo-cyan" />
            Pureza & Alinhamento de Categorias
          </h4>
          <div className="space-y-1.5 p-3 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-40">
            {sortedCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-tokyo-text">{cat.category}</span>
                  <span className="text-tokyo-muted">{cat.count} ({cat.percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-tokyo-dark rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${cat.percentage}%`,
                      backgroundColor: idx === 0 ? '#7aa2f7' : idx === 1 ? '#bb9af7' : '#565f89' 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Samples Tabs */}
        {clusterData && (
          <div className="space-y-2">
            <div className="flex border-b border-tokyo-border text-xs">
              <button
                onClick={() => setActiveTab('central')}
                className={`flex-1 pb-2 font-semibold text-center border-b-2 transition ${activeTab === 'central' ? 'text-tokyo-blue border-tokyo-blue' : 'text-tokyo-muted border-transparent hover:text-tokyo-text'}`}
              >
                Centrais (Medoides)
              </button>
              <button
                onClick={() => setActiveTab('frontier')}
                className={`flex-1 pb-2 font-semibold text-center border-b-2 transition ${activeTab === 'frontier' ? 'text-tokyo-blue border-tokyo-blue' : 'text-tokyo-muted border-transparent hover:text-tokyo-text'}`}
              >
                Fronteiras (Ambíguos)
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeTab === 'central' ? (
                clusterData.central.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${selectedDocId === doc.id ? 'bg-tokyo-blue bg-opacity-10 border-tokyo-blue' : 'bg-tokyo-panel bg-opacity-35 border-tokyo-border hover:bg-tokyo-panel hover:bg-opacity-70'}`}
                  >
                    <div className="flex justify-between text-[9px] text-tokyo-muted font-mono mb-1">
                      <span>Proximidade: #{idx + 1} central</span>
                      <span>ID: {doc.id}</span>
                    </div>
                    <h5 className="font-semibold text-tokyo-text line-clamp-1">{doc.title}</h5>
                    <p className="text-[10px] text-tokyo-muted line-clamp-2 mt-1">{doc.text}</p>
                  </div>
                ))
              ) : (
                clusterData.frontier.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${selectedDocId === doc.id ? 'bg-tokyo-blue bg-opacity-10 border-tokyo-blue' : 'bg-tokyo-panel bg-opacity-35 border-tokyo-border hover:bg-tokyo-panel hover:bg-opacity-70'}`}
                  >
                    <div className="flex justify-between text-[9px] text-tokyo-muted font-mono mb-1">
                      <span className="text-tokyo-orange">Silhueta: {doc.silhouette.toFixed(3)}</span>
                      <span>ID: {doc.id}</span>
                    </div>
                    <h5 className="font-semibold text-tokyo-text line-clamp-1">{doc.title}</h5>
                    <p className="text-[10px] text-tokyo-muted line-clamp-2 mt-1">{doc.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Selected Document Reader panel (if a doc is clicked) */}
        {selectedDoc && (
          <div className="p-3.5 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-50 text-xs space-y-2.5">
            <div className="flex justify-between items-center text-[10px] text-tokyo-muted font-mono border-b border-tokyo-border pb-1.5">
              <span className="text-tokyo-blue">Leitor de Notícia</span>
              <span>ID: {selectedDoc.id}</span>
            </div>
            
            <h5 className="font-bold text-tokyo-text leading-tight">{selectedDoc.original_text}</h5>
            
            {/* Real Class vs Predicted Badge Display */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 py-1 border-t border-b border-tokyo-border border-opacity-30">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-tokyo-muted">Categoria Real:</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-tokyo-blue bg-opacity-10 text-tokyo-blue border border-tokyo-blue border-opacity-20 uppercase">
                  {selectedDoc.true_category}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-tokyo-muted">Cluster Predito:</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-tokyo-magenta bg-opacity-10 text-tokyo-magenta border border-tokyo-magenta border-opacity-20">
                  #{selectedDoc.clustering[selectedRep]?.[selectedAlg]}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-tokyo-cyan block">Texto Expandido:</span>
              <p className="text-tokyo-text leading-relaxed text-[11px] max-h-40 overflow-y-auto bg-tokyo-dark bg-opacity-40 p-2 rounded border border-tokyo-border border-opacity-40 font-serif">
                {selectedDoc.expanded_text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
