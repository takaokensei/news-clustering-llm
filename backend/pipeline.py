import os
import sys
import time
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from dotenv import load_dotenv

# Machine Learning and Clustering imports
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN, HDBSCAN
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score, silhouette_samples, davies_bouldin_score
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

# Deep Learning / Embeddings (Local fallback)
from sentence_transformers import SentenceTransformer

# LLM APIs
import ollama
from google import genai

# Suppress warnings for clean execution
warnings.filterwarnings('ignore')

# 1. ENVIRONMENT CONFIGURATION & PATHS
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "Base_dados_textos_6_classes.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "backend", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load environment variables
dotenv_path = os.path.join(BASE_DIR, "backend", ".env")
load_dotenv(dotenv_path)

# Workaround for Windows OLLAMA_HOST=0.0.0.0 environment issue
if os.environ.get("OLLAMA_HOST") == "0.0.0.0":
    os.environ["OLLAMA_HOST"] = "127.0.0.1"
    print("[OK] Corrigido OLLAMA_HOST de 0.0.0.0 para 127.0.0.1")

# Workaround for conflicting/expired system GOOGLE_API_KEY
if "GEMINI_API_KEY" in os.environ:
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
    print("[OK] Configurado GOOGLE_API_KEY com a chave de API fornecida no arquivo .env")
else:
    print("[WARN] GEMINI_API_KEY nao foi encontrada no arquivo .env. O pipeline do Gemini nao funcionara.")

# List of standard Portuguese stopwords for TF-IDF
PT_STOPWORDS = [
    'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'as', 'ate', 'com', 'como', 'da', 'das', 'de',
    'dela', 'delas', 'dele', 'deles', 'depois', 'do', 'dos', 'e', 'ela', 'elas', 'ele', 'eles', 'em', 'entre', 'era',
    'eram', 'essa', 'essas', 'esse', 'esses', 'esta', 'estas', 'este', 'estes', 'eu', 'foi', 'fomos', 'for', 'fora',
    'foram', 'forem', 'fosse', 'fossem', 'fui', 'ha', 'haja', 'hajam', 'houve', 'houveram', 'isso', 'isto', 'ja', 'lhe',
    'lhes', 'mais', 'mas', 'me', 'mesmo', 'meu', 'meus', 'minha', 'minhas', 'muito', 'na', 'nas', 'num', 'numa', 'nos',
    'o', 'os', 'ou', 'para', 'pela', 'pelas', 'pelo', 'pelos', 'por', 'qual', 'quando', 'que', 'quem', 'se', 'seja',
    'sejam', 'sem', 'ser', 'sera', 'serao', 'seu', 'seus', 'so', 'sua', 'suas', 'tambem', 'te', 'tem', 'temos', 'tenha',
    'tenham', 'tenho', 'ter', 'teu', 'teus', 'tu', 'tua', 'tuas', 'um', 'uma', 'umas', 'uns', 'vos', 'voce', 'voces',
    'vosso', 'vossa', 'vossos', 'vossas'
]

# 2. DATA LOADING & PREPROCESSING
def load_dataset():
    print(f"Lendo base de dados: {DATA_PATH}...")
    try:
        # The dataset is semicolon-separated
        df = pd.read_csv(DATA_PATH, sep=';', encoding='utf-8')
        print(f"Base carregada com sucesso! Total de registros: {len(df)}")
        # Clean null values in text columns to prevent vectorization crashes
        df = df.dropna(subset=["Texto Original", "Texto Expandido"])
        print(f"Apos limpar registros nulos: {len(df)} registros.")
        # Check column names
        expected_cols = ["Texto Original", "Texto Expandido", "Classe", "Categoria"]
        for col in expected_cols:
            if col not in df.columns:
                raise ValueError(f"Coluna esperada '{col}' nao encontrada no arquivo CSV.")
        return df
    except Exception as e:
        print(f"Erro ao carregar o dataset: {e}")
        sys.exit(1)

# 3. REPRESENTATIONS GENERATION
def generate_representations(df):
    texts = df["Texto Expandido"].tolist()
    representations = {}
    
    # --- REPRESENTATION 1: TF-IDF (Frequencial) ---
    print("\n--- Gerando Representacao TF-IDF ---")
    tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words=PT_STOPWORDS)
    tfidf_matrix = tfidf_vectorizer.fit_transform(texts).toarray()
    representations["tfidf"] = tfidf_matrix
    print(f"Matriz TF-IDF gerada: {tfidf_matrix.shape}")
    
    # --- REPRESENTATION 2: SentenceTransformers (Semantica Local) ---
    print("\n--- Gerando Representacao SentenceTransformers (all-MiniLM-L6-v2) ---")
    try:
        st_model = SentenceTransformer('all-MiniLM-L6-v2')
        st_embeddings = st_model.encode(texts, show_progress_bar=True)
        representations["sentence_transformers"] = np.array(st_embeddings)
        print(f"Embeddings SentenceTransformers gerados: {st_embeddings.shape}")
    except Exception as e:
        print(f"Erro ao carregar ou gerar com SentenceTransformers: {e}")
        representations["sentence_transformers"] = None

    # --- REPRESENTATION 3: Ollama nomic-embed-text (Semantica Local via Ollama) ---
    print("\n--- Gerando Representacao Ollama (nomic-embed-text) ---")
    try:
        ollama_embeddings = []
        for i, text in enumerate(texts):
            if i % 50 == 0:
                print(f"Processando {i}/{len(texts)} com Ollama...")
            # nomic-embed-text generates 768-dimensional vectors
            res = ollama.embed(model='nomic-embed-text:latest', input=text)
            ollama_embeddings.append(res['embeddings'][0])
        representations["ollama"] = np.array(ollama_embeddings)
        print(f"Embeddings Ollama gerados: {representations['ollama'].shape}")
    except Exception as e:
        print(f"[WARN] Nao foi possivel obter embeddings via Ollama: {e}")
        print("Continuando o pipeline sem a representacao Ollama.")
        representations["ollama"] = None

    return representations

# 4. CLUSTERING ALGORITHMS
def run_clustering(representation_matrix, method, num_classes=6):
    if representation_matrix is None:
        return None, {}
        
    labels = None
    t0 = time.time()
    
    if method == "kmeans":
        kmeans = KMeans(n_clusters=num_classes, random_state=42, n_init=10)
        labels = kmeans.fit_predict(representation_matrix)
    elif method == "agglomerative":
        agg = AgglomerativeClustering(n_clusters=num_classes, linkage='ward')
        labels = agg.fit_predict(representation_matrix)
    elif method == "dbscan":
        # DBSCAN needs careful tuning of eps for different dimensions.
        # Normalize representations to unit length so cosine similarity matches euclidean distance
        norms = np.linalg.norm(representation_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1e-12
        normed_matrix = representation_matrix / norms
        
        # Sense default: TF-IDF has larger dimension, SentenceTransformers are compact
        eps = 0.4 if representation_matrix.shape[1] < 500 else 1.15
        dbscan = DBSCAN(eps=eps, min_samples=3)
        labels = dbscan.fit_predict(normed_matrix)
    elif method == "hdbscan":
        # HDBSCAN from scikit-learn
        hdb = HDBSCAN(min_cluster_size=5, min_samples=3)
        labels = hdb.fit_predict(representation_matrix)
    else:
        raise ValueError(f"Algoritmo de clustering '{method}' desconhecido.")
        
    execution_time = time.time() - t0
    return labels, {"execution_time": execution_time}

# 5. METRICS EVALUATION
def calculate_metrics(X, true_labels, pred_labels):
    # Number of unique clusters (ignoring noise -1)
    unique_clusters = set(pred_labels)
    num_clusters = len(unique_clusters - {-1})
    noise_points = np.sum(pred_labels == -1)
    
    # Unsupervised metrics
    # Silhouette requires at least 2 clusters and less than N clusters
    if num_clusters > 1 and num_clusters < len(pred_labels):
        silhouette = float(silhouette_score(X, pred_labels))
        db_index = float(davies_bouldin_score(X, pred_labels))
    else:
        silhouette = -1.0
        db_index = -1.0
        
    # Supervised metrics
    ari = float(adjusted_rand_score(true_labels, pred_labels))
    nmi = float(normalized_mutual_info_score(true_labels, pred_labels))
    
    # Purity calculation: sum of maximum class matches per cluster, divided by total size
    # Ignore noise points in purity or treat them as separate singletons
    purity = 0.0
    total_elements = len(true_labels)
    if total_elements > 0:
        match_sum = 0
        for cluster in unique_clusters:
            if cluster == -1:
                # Noise points are treated as their own individual matches
                noise_indices = np.where(pred_labels == -1)[0]
                for idx in noise_indices:
                    match_sum += 1
                continue
            indices = np.where(pred_labels == cluster)[0]
            if len(indices) == 0:
                continue
            cluster_true = [true_labels[i] for i in indices]
            # Find the most frequent true label in this cluster
            max_class_count = pd.Series(cluster_true).value_counts().max()
            match_sum += max_class_count
        purity = float(match_sum / total_elements)
        
    return {
        "silhouette": silhouette,
        "davies_bouldin": db_index,
        "ari": ari,
        "nmi": nmi,
        "purity": purity,
        "num_clusters": num_clusters,
        "noise_points": int(noise_points)
    }

# 6. DIMENSIONALITY REDUCTION
def run_dim_reduction(X, method):
    if X is None:
        return None
        
    t0 = time.time()
    if method == "pca":
        pca = PCA(n_components=2, random_state=42)
        coords = pca.fit_transform(X)
    elif method == "tsne":
        # High perplexity for small dataset, cap it at N/10
        perplexity = min(30, max(5, int(len(X) / 10)))
        tsne = TSNE(n_components=2, perplexity=perplexity, random_state=42, init='pca', learning_rate='auto')
        coords = tsne.fit_transform(X)
    elif method == "umap":
        import umap
        reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=42)
        coords = reducer.fit_transform(X)
    else:
        raise ValueError(f"Tecnica de reducao de dimensionalidade '{method}' desconhecida.")
        
    print(f"Reducao {method.upper()} finalizada em {time.time() - t0:.2f}s")
    return coords

# 7. EXTRACT KEY DOCUMENTS (CENTRAL & FRONTIER)
def extract_key_documents(X, labels, df, num_samples=3):
    unique_clusters = set(labels) - {-1}
    cluster_landmarks = {}
    
    # Calculate silhouette sample values to find frontier points (low silhouette means close to boundary)
    if len(unique_clusters) > 1:
        sil_samples = silhouette_samples(X, labels)
    else:
        sil_samples = np.zeros(len(labels))
        
    for cluster in unique_clusters:
        indices = np.where(labels == cluster)[0]
        if len(indices) == 0:
            continue
            
        cluster_data = X[indices]
        cluster_df_indices = indices
        
        # 1. CENTRAL POINTS (Medoids): Closest to geometric center
        centroid = np.mean(cluster_data, axis=0)
        distances = np.linalg.norm(cluster_data - centroid, axis=1)
        # Sort indices in this cluster by distance to centroid (ascending)
        sorted_by_dist = np.argsort(distances)
        central_indices = [cluster_df_indices[idx] for idx in sorted_by_dist[:num_samples]]
        
        # 2. FRONTIER POINTS (Ambiguous): Points with lowest silhouette score (often close to 0 or negative)
        cluster_silhouettes = sil_samples[indices]
        # Sort by silhouette value (ascending: most ambiguous first)
        sorted_by_sil = np.argsort(cluster_silhouettes)
        frontier_indices = [cluster_df_indices[idx] for idx in sorted_by_sil[:num_samples]]
        
        # Formulate documentation objects
        central_docs = []
        for idx in central_indices:
            row = df.iloc[idx]
            central_docs.append({
                "id": int(idx),
                "title": str(row["Texto Original"]),
                "text": str(row["Texto Expandido"]),
                "class": int(row["Classe"]),
                "category": str(row["Categoria"]),
                "dist_to_centroid": float(distances[np.where(sorted_by_dist == np.where(cluster_df_indices == idx)[0][0])[0][0]])
            })
            
        frontier_docs = []
        for idx in frontier_indices:
            row = df.iloc[idx]
            # Get the silhouette score
            sil_score = float(sil_samples[idx])
            frontier_docs.append({
                "id": int(idx),
                "title": str(row["Texto Original"]),
                "text": str(row["Texto Expandido"]),
                "class": int(row["Classe"]),
                "category": str(row["Categoria"]),
                "silhouette": sil_score
            })
            
        cluster_landmarks[int(cluster)] = {
            "central": central_docs,
            "frontier": frontier_docs
        }
        
    return cluster_landmarks

# Helper function to call Gemini with exponential backoff retries for 503 errors
def generate_with_retry(client_gemini, prompt, model='gemini-2.5-flash', max_retries=4, initial_delay=3.0):
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            response = client_gemini.models.generate_content(
                model=model,
                contents=prompt
            )
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"    [WARN] Falha na chamada do Gemini (tentativa {attempt+1}/{max_retries}): {e}. Retentando em {delay}s...")
            time.sleep(delay)
            delay *= 2

# 8. LLM EXPLANATION (OLLAMA vs GEMINI)
def explain_cluster_with_llm(cluster_id, central_docs, frontier_docs, client_gemini=None):
    # Formulate prompt in Portuguese
    prompt = f"""Você é um cientista de dados e linguista sênior especialista em Processamento de Linguagem Natural (PLN).
Analise os seguintes textos de notícias em português que foram agrupados no Cluster #{cluster_id} por um algoritmo de aprendizado de máquina.

TEXTOS CENTRAIS (Representam o núcleo do tema do grupo - medoides):
"""
    for idx, doc in enumerate(central_docs):
        prompt += f"{idx+1}. TÍTULO: {doc['title']}\n   CONTEÚDO: {doc['text']}\n\n"
        
    prompt += "TEXTOS DE FRONTEIRA (Estão na borda de decisão do grupo, podendo ser híbridos ou ambíguos):\n"
    for idx, doc in enumerate(frontier_docs):
        prompt += f"{idx+1}. TÍTULO: {doc['title']}\n   CONTEÚDO: {doc['text']}\n\n"
        
    prompt += """Instrução: Com base nessas amostras, forneça uma análise estruturada contendo:
1. RÓTULO PROPOSTO: Um nome curto, direto e claro (até 4 palavras) que identifique o assunto dominante.
2. TEMA DOMINANTE: Um parágrafo conciso (3 a 4 linhas) explicando o tema do grupo.
3. ANÁLISE DE FRONTEIRA: Comente brevemente por que os textos de fronteira são ambíguos ou qual a interseção temática deles com outras categorias (como tecnologia, economia, esportes, etc.).
4. COERÊNCIA: Classifique a coesão do cluster como 'Alta', 'Média' ou 'Baixa'.

Você DEVE responder ESTRITAMENTE em formato JSON estruturado com as seguintes chaves (sem blocos Markdown ```json no início ou fim, retorne apenas o objeto JSON plano):
{
  "rotulo": "string",
  "resumo": "string",
  "analise_fronteira": "string",
  "coerencia": "string"
}"""

    explanations = {}

    # --- 8.1 CLOUD LLM: Gemini 2.5 Flash ---
    if client_gemini:
        t0 = time.time()
        try:
            # Call Gemini with a retry wrapper to absorb transient 503 unavailability
            response = generate_with_retry(client_gemini, prompt, model='gemini-2.5-flash')
            text_response = response.text.strip()
            # Remove potential markdown wrappers in case the LLM ignored instruction
            if text_response.startswith("```json"):
                text_response = text_response[7:]
            if text_response.endswith("```"):
                text_response = text_response[:-3]
            text_response = text_response.strip()
            
            parsed_json = json.loads(text_response)
            parsed_json["latency"] = time.time() - t0
            explanations["gemini"] = parsed_json
            print(f"  [OK] Cluster {cluster_id} explicado por Gemini em {parsed_json['latency']:.2f}s")
        except Exception as e:
            print(f"  [ERR] Erro no Gemini para Cluster {cluster_id}: {e}")
            explanations["gemini"] = {
                "rotulo": "Erro ao Processar",
                "resumo": f"Erro na chamada do Gemini: {str(e)}",
                "analise_fronteira": "N/A",
                "coerencia": "Baixa",
                "latency": time.time() - t0
            }
    else:
        explanations["gemini"] = {
            "rotulo": "Nao Executado",
            "resumo": "API Key do Gemini nao configurada no .env",
            "analise_fronteira": "N/A",
            "coerencia": "N/A",
            "latency": 0.0
        }

    # --- 8.2 LOCAL LLM: Ollama (Qwen 2.5) ---
    t0 = time.time()
    try:
        response = ollama.chat(
            model='qwen2.5:7b',
            messages=[{'role': 'user', 'content': prompt}],
            options={'temperature': 0.1}
        )
        text_response = response['message']['content'].strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
        text_response = text_response.strip()
        
        parsed_json = json.loads(text_response)
        parsed_json["latency"] = time.time() - t0
        explanations["ollama"] = parsed_json
        print(f"  [OK] Cluster {cluster_id} explicado por Ollama (Qwen) em {parsed_json['latency']:.2f}s")
    except Exception as e:
        print(f"  [WARN] Falha no Qwen para Cluster {cluster_id}. Tentando Llama 3.1...")
        try:
            t0_fallback = time.time()
            response = ollama.chat(
                model='llama3.1:8b',
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1}
            )
            text_response = response['message']['content'].strip()
            if text_response.startswith("```json"):
                text_response = text_response[7:]
            if text_response.endswith("```"):
                text_response = text_response[:-3]
            text_response = text_response.strip()
            
            parsed_json = json.loads(text_response)
            parsed_json["latency"] = time.time() - t0_fallback
            explanations["ollama"] = parsed_json
            print(f"  [OK] Cluster {cluster_id} explicado por Ollama (Llama 3.1) em {parsed_json['latency']:.2f}s")
        except Exception as e2:
            print(f"  [ERR] Erro no Ollama local para Cluster {cluster_id}: {e2}")
            explanations["ollama"] = {
                "rotulo": "Erro ao Processar Local",
                "resumo": f"Erro na chamada do Ollama: {str(e2)}",
                "analise_fronteira": "N/A",
                "coerencia": "Baixa",
                "latency": time.time() - t0
            }

    return explanations

# 9. LATEX FIGURE EXPORTER
def export_latex_plots(coordinates_dict, labels_dict, df):
    rep_key = "sentence_transformers"
    clust_key = "kmeans"
    
    if rep_key not in coordinates_dict or clust_key not in labels_dict:
        print("Aviso: Configuracoes ausentes para geracao de plot LaTeX.")
        return
        
    labels = labels_dict[rep_key][clust_key]
    true_categories = df["Categoria"].values
    
    for red_key in ["umap", "tsne", "pca"]:
        coords = coordinates_dict[rep_key][red_key]
        if coords is None:
            continue
            
        fig, axes = plt.subplots(1, 2, figsize=(15, 6.5), dpi=300)
        cmap = plt.get_cmap("tab10")
        
        # Left Panel: Predicted Clusters
        unique_labels = sorted(list(set(labels)))
        for label in unique_labels:
            indices = np.where(labels == label)[0]
            label_name = f"Cluster {label}" if label != -1 else "Outliers/Ruido"
            color = "gray" if label == -1 else cmap(label % 10)
            axes[0].scatter(coords[indices, 0], coords[indices, 1], label=label_name, alpha=0.8, edgecolors='none', s=45, color=color)
        axes[0].set_title(f"Grupos Obtidos por Agrupamento ({clust_key.upper()})", fontsize=12, fontweight='bold')
        axes[0].set_xlabel(f"{red_key.upper()} Componente 1", fontsize=10)
        axes[0].set_ylabel(f"{red_key.upper()} Componente 2", fontsize=10)
        axes[0].legend(loc="best", fontsize=9, framealpha=0.6)
        axes[0].grid(True, linestyle='--', alpha=0.3)
        
        # Right Panel: Real Classes
        unique_cats = sorted(list(set(true_categories)))
        for idx, cat in enumerate(unique_cats):
            indices = np.where(true_categories == cat)[0]
            axes[1].scatter(coords[indices, 0], coords[indices, 1], label=cat, alpha=0.8, edgecolors='none', s=45, color=cmap(idx % 10))
        axes[1].set_title("Categorias Originais (Classes Reais)", fontsize=12, fontweight='bold')
        axes[1].set_xlabel(f"{red_key.upper()} Componente 1", fontsize=10)
        axes[1].set_ylabel(f"{red_key.upper()} Componente 2", fontsize=10)
        axes[1].legend(loc="best", fontsize=9, framealpha=0.6)
        axes[1].grid(True, linestyle='--', alpha=0.3)
        
        plt.suptitle(f"Analise Comparativa 2D - Representacao: {rep_key.upper()} | Projecao: {red_key.upper()}", fontsize=14, fontweight='bold', y=0.98)
        plt.tight_layout()
        
        # Save high DPI figures
        png_path = os.path.join(OUTPUT_DIR, f"comparacao_agrupamento_{red_key}.png")
        pdf_path = os.path.join(OUTPUT_DIR, f"comparacao_agrupamento_{red_key}.pdf")
        plt.savefig(png_path, bbox_inches='tight')
        plt.savefig(pdf_path, bbox_inches='tight')
        plt.close()
        print(f"[OK] Graficos salvos com sucesso em alta definicao (LaTeX):")
        print(f"  - [PNG] {png_path}")
        print(f"  - [PDF] {pdf_path}")

# MAIN PIPELINE EXECUTION
def main():
    print("==========================================================")
    print(" INICIANDO PIPELINE DE CLUSTERIZACAO E ANALISE DE NOTICIAS ")
    print("==========================================================")
    
    # 1. Load Dataset
    df = load_dataset()
    
    # Initialize Gemini API Client
    client_gemini = None
    if os.environ.get("GOOGLE_API_KEY"):
        try:
            client_gemini = genai.Client()
            print("[OK] Cliente Gemini inicializado com sucesso.")
        except Exception as e:
            print(f"[WARN] Falha ao inicializar o cliente Gemini: {e}")
            print("O pipeline rodara apenas com modelos locais do Ollama.")
            
    # 2. Generate Representations
    representations = generate_representations(df)
    
    # Setup data structures for output
    active_representations = [k for k, v in representations.items() if v is not None]
    print(f"\nRepresentacoes ativas no experimento: {active_representations}")
    
    cluster_labels = {rep: {} for rep in active_representations}
    metrics = {}
    
    # 3. Running Clustering & Metrics Evaluation
    print("\n--- Rodando Agrupamentos e Computando Metricas ---")
    algorithms = ["kmeans", "agglomerative", "dbscan", "hdbscan"]
    
    for rep_name in active_representations:
        X = representations[rep_name]
        for alg_name in algorithms:
            print(f"Agrupando '{rep_name}' com '{alg_name}'...")
            labels, metadata = run_clustering(X, alg_name, num_classes=6)
            
            if labels is not None:
                cluster_labels[rep_name][alg_name] = labels
                # Calculate all unsupervised and supervised metrics
                eval_metrics = calculate_metrics(X, df["Classe"].values, labels)
                eval_metrics["time_taken"] = metadata["execution_time"]
                metrics[f"{rep_name}_{alg_name}"] = eval_metrics
                print(f"  -> Separados {eval_metrics['num_clusters']} grupos (Ruido: {eval_metrics['noise_points']}) | Silhouette: {eval_metrics['silhouette']:.4f} | ARI: {eval_metrics['ari']:.4f}")
                
    # 4. Running Dimensionality Reductions
    print("\n--- Projetando embeddings para 2D (PCA, t-SNE, UMAP) ---")
    projections = ["pca", "tsne", "umap"]
    coordinates = {rep: {} for rep in active_representations}
    
    for rep_name in active_representations:
        X = representations[rep_name]
        for proj_name in projections:
            print(f"Projetando '{rep_name}' usando '{proj_name}'...")
            coords = run_dim_reduction(X, proj_name)
            coordinates[rep_name][proj_name] = coords
            
    # 5. Extract Landmarks & run LLM explanations
    llm_explanations = {}
    configs_to_explain = []
    
    if "sentence_transformers" in active_representations:
        configs_to_explain.append(("sentence_transformers", "kmeans"))
    if "tfidf" in active_representations:
        configs_to_explain.append(("tfidf", "kmeans"))
        
    print("\n--- Selecionando Exemplos Criticos e Executando Explicacoes com LLM ---")
    for rep_name, alg_name in configs_to_explain:
        config_key = f"{rep_name}_{alg_name}"
        print(f"Explicando clusters para a configuracao: {config_key}")
        
        X = representations[rep_name]
        labels = cluster_labels[rep_name][alg_name]
        
        # Extract medoids and boundary items
        landmarks = extract_key_documents(X, labels, df)
        llm_explanations[config_key] = {}
        
        for cluster_id, data in landmarks.items():
            print(f"  Explicando Cluster #{cluster_id}...")
            explanation = explain_cluster_with_llm(
                cluster_id, 
                data["central"], 
                data["frontier"], 
                client_gemini=client_gemini
            )
            
            llm_explanations[config_key][str(cluster_id)] = {
                "explanations": explanation,
                "central": data["central"],
                "frontier": data["frontier"]
            }

    # 6. Build the Final JSON Database for the Frontend
    print("\n--- Estruturando banco de dados JSON para o visualizador frontend ---")
    output_records = []
    for idx, row in df.iterrows():
        record = {
            "id": int(idx),
            "original_text": str(row["Texto Original"]),
            "expanded_text": str(row["Texto Expandido"]),
            "true_class": int(row["Classe"]),
            "true_category": str(row["Categoria"]),
            "clustering": {},
            "projections": {}
        }
        
        for rep_name in active_representations:
            record["clustering"][rep_name] = {}
            for alg_name in algorithms:
                if alg_name in cluster_labels[rep_name]:
                    record["clustering"][rep_name][alg_name] = int(cluster_labels[rep_name][alg_name][idx])
                    
        for rep_name in active_representations:
            record["projections"][rep_name] = {}
            for proj_name in projections:
                if proj_name in coordinates[rep_name] and coordinates[rep_name][proj_name] is not None:
                    coord = coordinates[rep_name][proj_name][idx]
                    record["projections"][rep_name][proj_name] = {
                        "x": float(coord[0]),
                        "y": float(coord[1])
                    }
                    
        output_records.append(record)
        
    final_output = {
        "dataset": output_records,
        "metrics": metrics,
        "llm_explanations": llm_explanations,
        "active_representations": active_representations
    }
    
    FRONTEND_PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "public")
    os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)
    json_path = os.path.join(FRONTEND_PUBLIC_DIR, "clustering_results.json")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON consolidado salvo com sucesso em: {json_path}")
    
    backend_json_path = os.path.join(OUTPUT_DIR, "clustering_results.json")
    with open(backend_json_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON consolidado copiado em: {backend_json_path}")
    
    # 7. Export high DPI plots for LaTeX reports
    print("\n--- Exportando graficos cientificos para LaTeX ---")
    export_latex_plots(coordinates, cluster_labels, df)
    
    print("\n==========================================================")
    print("       PIPELINE FINALIZADO E EXECUTADO COM SUCESSO!        ")
    print("==========================================================")

if __name__ == "__main__":
    main()
