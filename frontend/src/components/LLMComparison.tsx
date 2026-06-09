import React from 'react';
import { useClusteringStore } from '../store/useClusteringStore';
import { Cpu, Cloud, Zap, Clock, ShieldCheck } from 'lucide-react';

export const LLMComparison: React.FC = () => {
  const {
    llmExplanations,
    selectedRep,
    selectedAlg,
    selectedCluster
  } = useClusteringStore();

  if (selectedCluster === null) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-6 text-center glass-panel rounded-xl text-tokyo-muted">
        <Clock size={36} className="mb-2 text-tokyo-blue animate-float" />
        <h3 className="font-semibold text-tokyo-text mb-1">Selecione um Cluster</h3>
        <p className="text-xs">
          A comparação lado a lado entre modelos de nuvem e locais será exibida aqui após selecionar um grupo.
        </p>
      </div>
    );
  }

  const configKey = `${selectedRep}_${selectedAlg}`;
  const clusterData = llmExplanations[configKey]?.[selectedCluster];

  if (!clusterData) {
    return (
      <div className="p-6 text-center text-tokyo-muted glass-panel rounded-xl">
        Aviso: Nenhuma explicação de LLM encontrada para esta configuração de clustering.
      </div>
    );
  }

  const { gemini, ollama } = clusterData.explanations;
  const showGemini = gemini && gemini.rotulo !== 'Não Executado';
  const showOllama = ollama && ollama.rotulo !== 'Erro ao Processar Local';

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col space-y-4 text-xs h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tokyo-border pb-2.5">
        <div className="flex items-center space-x-2">
          <Zap size={16} className="text-tokyo-yellow" />
          <h3 className="font-bold text-tokyo-text">Comparador: Nuvem vs Local</h3>
        </div>
        <span className="text-[10px] text-tokyo-muted">Cluster #{selectedCluster}</span>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
        {/* Cloud Side: Gemini */}
        <div className="p-3.5 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-35 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-tokyo-border border-opacity-40">
              <span className="font-bold text-tokyo-blue flex items-center">
                <Cloud size={14} className="mr-1.5" />
                Gemma 4 31B (Nuvem)
              </span>
              <span className="text-[10px] text-tokyo-cyan font-mono bg-tokyo-cyan bg-opacity-10 px-2 py-0.5 rounded border border-tokyo-cyan border-opacity-20 flex items-center">
                <Clock size={10} className="mr-1" />
                {showGemini ? `${gemini.latency.toFixed(2)}s` : 'N/A'}
              </span>
            </div>

            {showGemini ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Rótulo Sugerido:</span>
                  <h4 className="font-bold text-tokyo-text text-sm">"{gemini.rotulo}"</h4>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Resumo Temático:</span>
                  <p className="text-tokyo-text leading-relaxed">{gemini.resumo}</p>
                </div>
                {gemini.analise_fronteira && (
                  <div>
                    <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Fronteira & Ambiguidade:</span>
                    <p className="text-tokyo-muted leading-relaxed italic">{gemini.analise_fronteira}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-tokyo-muted py-6 text-center">
                Gemini desativado. API Key expirada ou ausente no arquivo `.env`.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-tokyo-border border-opacity-40 flex justify-between items-center text-[10px] text-tokyo-muted font-mono">
            <span>Serviço: Nuvem API</span>
            <span className="text-tokyo-green flex items-center">
              <ShieldCheck size={12} className="mr-1" /> Estável
            </span>
          </div>
        </div>

        {/* Local Side: Ollama */}
        <div className="p-3.5 rounded-lg border border-tokyo-border bg-tokyo-panel bg-opacity-35 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-tokyo-border border-opacity-40">
              <span className="font-bold text-tokyo-magenta flex items-center">
                <Cpu size={14} className="mr-1.5" />
                Ollama: Qwen 2.5 7B
              </span>
              <span className="text-[10px] text-tokyo-magenta font-mono bg-tokyo-magenta bg-opacity-10 px-2 py-0.5 rounded border border-tokyo-magenta border-opacity-20 flex items-center">
                <Clock size={10} className="mr-1" />
                {showOllama ? `${ollama.latency.toFixed(2)}s` : 'N/A'}
              </span>
            </div>

            {showOllama ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Rótulo Sugerido:</span>
                  <h4 className="font-bold text-tokyo-text text-sm">"{ollama.rotulo}"</h4>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Resumo Temático:</span>
                  <p className="text-tokyo-text leading-relaxed">{ollama.resumo}</p>
                </div>
                {ollama.analise_fronteira && (
                  <div>
                    <span className="text-[10px] font-bold text-tokyo-muted block mb-0.5">Fronteira & Ambiguidade:</span>
                    <p className="text-tokyo-muted leading-relaxed italic">{ollama.analise_fronteira}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-tokyo-muted py-6 text-center">
                Ollama desativado ou Qwen 2.5 7B não disponível localmente.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-tokyo-border border-opacity-40 flex justify-between items-center text-[10px] text-tokyo-muted font-mono">
            <span>Serviço: Local Engine</span>
            <span className="text-tokyo-magenta">Offline-First</span>
          </div>
        </div>
      </div>

      {/* Latency Comparative Bar */}
      {showGemini && showOllama && (
        <div className="pt-2 border-t border-tokyo-border flex flex-col space-y-1.5">
          <div className="flex justify-between text-[10px] text-tokyo-muted font-mono">
            <span>Latência de Explicação (Menor é melhor)</span>
            <span>Gemini {gemini.latency.toFixed(1)}s vs Ollama {ollama.latency.toFixed(1)}s</span>
          </div>
          <div className="w-full bg-tokyo-dark h-2 rounded-full overflow-hidden flex">
            {/* Compute proportional widths */}
            {(() => {
              const total = gemini.latency + ollama.latency;
              const geminiWidth = total > 0 ? (gemini.latency / total) * 100 : 50;
              const ollamaWidth = 100 - geminiWidth;
              return (
                <>
                  <div className="bg-tokyo-cyan h-full transition-all duration-500" style={{ width: `${geminiWidth}%` }} title="Gemini Latency" />
                  <div className="bg-tokyo-magenta h-full transition-all duration-500" style={{ width: `${ollamaWidth}%` }} title="Ollama Latency" />
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
