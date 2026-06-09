<div align="center">

  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=1a1b26&height=120&section=header"/>

  <h1>
    <img src="https://readme-typing-svg.herokuapp.com/?lines=📰+NEWS+CLUSTERING+LLM;Unsupervised+Text+Clustering;LLM+Semantic+Labeling;Interactive+Visual+Dashboard&font=Fira+Code&center=true&width=700&height=50&color=7aa2f7&vCenter=true&pause=1000&size=26" />
  </h1>

  <samp>Cluster · Compare · Explain · Visualize</samp>
  <br/><br/>

  <img src="https://img.shields.io/badge/Python-3.10+-c0caf5?style=for-the-badge&logo=python&logoColor=1a1b26"/>
  <img src="https://img.shields.io/badge/React-18-7aa2f7?style=for-the-badge&logo=react&logoColor=1a1b26"/>
  <img src="https://img.shields.io/badge/Scikit--Learn-ML_Engine-9ece6a?style=for-the-badge&logo=scikitlearn&logoColor=1a1b26"/>
  <img src="https://img.shields.io/badge/Gemini-LLM_Labels-bb9af7?style=for-the-badge&logo=google&logoColor=1a1b26"/>
  <img src="https://img.shields.io/badge/Ollama-Local_LLM-f7768e?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Status-Completed-9ece6a?style=for-the-badge"/>

</div>

<br/>

> An end-to-end academic research pipeline that applies **unsupervised clustering** to a corpus of **315 Portuguese news articles**, comparing multiple text representations and clustering algorithms. Clusters are automatically labeled by **LLMs (Gemini + Ollama)** and explored through an interactive **Tokyo Night–themed dashboard** with real-time projections and semantic search.

<br/>

## `> tech_stack`

<div align="center">
  <img src="https://skillicons.dev/icons?i=python,react,typescript,vite,git&theme=dark&perline=7" />
</div>

<table align="center">
<tr>
<td align="center" width="33%">

**⚙️ ML Pipeline**<br/><br/>
<img src="https://img.shields.io/badge/scikit--learn-1.3+-c0caf5?style=flat-square&logo=scikitlearn&logoColor=1a1b26"/>
<img src="https://img.shields.io/badge/SentenceTransformers-Multilingual-7aa2f7?style=flat-square"/>
<img src="https://img.shields.io/badge/UMAP-Dimensionality_Reduction-9ece6a?style=flat-square"/>

</td>
<td align="center" width="33%">

**🧠 LLM Labeling**<br/><br/>
<img src="https://img.shields.io/badge/Gemini-gemma--4--31b--it-bb9af7?style=flat-square&logo=google&logoColor=1a1b26"/>
<img src="https://img.shields.io/badge/Ollama-Local_Inference-f7768e?style=flat-square"/>
<img src="https://img.shields.io/badge/JSON_Mode-Structured_Output-c0caf5?style=flat-square"/>

</td>
<td align="center" width="33%">

**📊 Dashboard**<br/><br/>
<img src="https://img.shields.io/badge/React_18-TypeScript-7aa2f7?style=flat-square&logo=react&logoColor=1a1b26"/>
<img src="https://img.shields.io/badge/Vite-Canvas_2D-9ece6a?style=flat-square&logo=vite&logoColor=1a1b26"/>
<img src="https://img.shields.io/badge/Zustand-State_Management-bb9af7?style=flat-square"/>

</td>
</tr>
</table>

<br/>

## `> architecture_overview`

```
news-clustering-llm/
│
├── 🐍 backend/
│   ├── pipeline.py              # Full ML + LLM orchestration (~666 lines)
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # API keys (Gemini / Ollama host)
│   └── outputs/
│       ├── clustering_results.json   # Full precomputed results for frontend
│       └── comparacao_agrupamento_*.png  # Static comparison plots (PCA/UMAP/t-SNE)
│
├── 🌐 frontend/
│   └── src/
│       ├── components/
│       │   ├── ClusterPlot.tsx       # Canvas 2D scatter plot (zoom, pan, morphing)
│       │   ├── ClusterDetails.tsx    # Sidebar: LLM labels, stats, document reader
│       │   ├── MetricsPanel.tsx      # Comparative metrics table (ARI, NMI, Purity)
│       │   └── LLMComparison.tsx     # Side-by-side Gemini vs Ollama explanations
│       └── store/
│           └── useClusteringStore.ts # Zustand global state
│
├── 📓 notebook_experimentos.ipynb   # Exploratory Jupyter analysis
└── 📄 Base_dados_textos_6_classes.csv  # Raw dataset (315 articles, 6 categories)
```

<br/>

## `> pipeline_workflow`

<table align="center">
<tr>
<td width="50%">

### 📥 Phase 1: Data Ingestion
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**Input:** `Base_dados_textos_6_classes.csv`
- **315** articles across **6 news categories**
- Columns: `Texto Original`, `Texto Expandido`, `Classe`, `Categoria`
- PT stopwords filtering · null-value cleaning

</td>
<td width="50%">

### 🔢 Phase 2: Text Representations
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**3 representations compared:**
1. **TF-IDF** — top-1000 features, PT stopwords
2. **Sentence Transformers** — `paraphrase-multilingual-MiniLM-L12-v2` (PT-BR optimized)
3. **Ollama** — `nomic-embed-text` (768-dim local vectors)

</td>
</tr>
<tr>
<td width="50%">

### 🤖 Phase 3: Clustering Algorithms
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**4 algorithms × 3 representations = 12 configs:**
- **K-Means** — k=6, n_init=10
- **Agglomerative** — Ward linkage
- **DBSCAN** — adaptive ε, min_samples=3
- **HDBSCAN** — min_cluster_size=5

</td>
<td width="50%">

### 🧠 Phase 4: LLM Semantic Labeling
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**Dual LLM strategy:**
- **Gemini** (`gemma-4-31b-it`) — Cloud, structured JSON output
- **Ollama** — Local fallback, full privacy
- Output: label, summary, boundary analysis, coherence score

</td>
</tr>
<tr>
<td width="50%">

### 📐 Phase 5: Dimensionality Reduction
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**3 projections per configuration:**
- **PCA** — Linear baseline
- **t-SNE** — Neighborhood-preserving (perplexity auto-tuned)
- **UMAP** — Topology-preserving (n_neighbors=15)

</td>
<td width="50%">

### 📊 Phase 6: Interactive Dashboard
<p><img src="https://img.shields.io/badge/Status-✅_Complete-9ece6a?style=for-the-badge"/></p>

**React + Canvas 2D visualization:**
- Smooth morphing animation (400ms ease-in-out) between projections
- Real-time document search with text highlight
- Selection pulse effect · Zoom/pan with native wheel events

</td>
</tr>
</table>

<br/>

## `> results_benchmark`

<div align="center">
<img src="https://img.shields.io/badge/Dataset-315_Articles-f7768e?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Categories-6_Classes-7aa2f7?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Configurations-12_Combos-bb9af7?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Best_Purity-93.3%25-9ece6a?style=for-the-badge"/>
</div>

<br/>

**Full metrics table (ARI · NMI · Purity · Silhouette):**

| Configuration | ARI ↑ | NMI ↑ | Purity ↑ | Silhouette ↑ |
|:---|:---:|:---:|:---:|:---:|
| 🏆 **TF-IDF + Agglomerative** | **0.852** | **0.852** | **0.933** | 0.025 |
| TF-IDF + K-Means | 0.705 | 0.778 | 0.857 | 0.024 |
| ST + Agglomerative | 0.587 | 0.743 | 0.756 | 0.079 |
| ST + K-Means | 0.556 | 0.665 | 0.752 | 0.083 |
| Ollama + K-Means | 0.500 | 0.616 | 0.724 | 0.064 |
| Ollama + Agglomerative | 0.455 | 0.564 | 0.695 | 0.056 |
| TF-IDF + DBSCAN | 0.029 | 0.369 | 0.994* | 0.007 |
| ST + HDBSCAN | 0.091 | 0.221 | 0.429 | 0.173 |

> \* DBSCAN purity is inflated by collapsing most articles into noise (-1) clusters.

**Key findings:**
- **TF-IDF + Agglomerative (Ward)** is the overall winner — high ARI/NMI indicates strong alignment with ground-truth categories
- **Sentence Transformers** (multilingual PT-BR model) underperforms TF-IDF on this dataset — likely due to the short, headline-style text of `Texto Original`; the expanded text representation partially closes the gap
- **DBSCAN / HDBSCAN** struggle with these high-dimensional, uniformly-distributed embeddings — density-based methods require dense region structure that frequency/semantic vectors don't naturally form here

<br/>

## `> dashboard_features`

<table align="center">
<tr>
<td width="50%">

**🗺️ Cluster Plot (Canvas 2D)**
- Switch between **12 algorithm/representation combos**
- Toggle projections: **PCA · UMAP · t-SNE**
- Smooth **morphing animation** between projections
- Zoom (scroll wheel) + pan (drag) with native events
- Color by **predicted cluster** or **true category**
- Legend with individual cluster toggle

</td>
<td width="50%">

**📖 Cluster Details Sidebar**
- **LLM semantic label** with coherence badge
- **Category purity bars** — true class distribution inside the cluster
- **Medoid documents** (closest to centroid) vs **Frontier documents** (lowest silhouette)
- **Document Reader** — full text + expanded text + predicted vs true label
- **Real-time search** with highlighted matches across all 315 articles

</td>
</tr>
<tr>
<td width="50%">

**📈 Metrics Panel**
- Full comparison table across all 12 configurations
- Auto-highlights the best-performing config on load

</td>
<td width="50%">

**🤖 LLM Comparison**
- Side-by-side **Gemini vs Ollama** explanations per cluster
- JSON-structured output: label · summary · boundary analysis · coherence

</td>
</tr>
</table>

<br/>

## `> news_categories`

The dataset covers **6 thematic classes** of Brazilian Portuguese news:

| # | Category | Description |
|:---:|:---|:---|
| 1 | 🔵 **Economia** | Economic news, markets, finance |
| 2 | 🟠 **Esportes** | Sports coverage, championships |
| 3 | 🔴 **Polícia e Direitos** | Police reports, civil rights, justice |
| 4 | 🟣 **Política** | Government, elections, public policy |
| 5 | 🩵 **Turismo** | Travel, culture, tourism |
| 6 | 🟡 **Variedades e Sociedade** | Lifestyle, society, entertainment |

<br/>

## `> installation`

```bash
# 1. Clone the repository
git clone https://github.com/takaokensei/news-clustering-llm.git
cd news-clustering-llm
```

### 🐍 Backend (ML Pipeline)

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY and optionally OLLAMA_HOST

# (Optional) Start Ollama for local LLM inference
ollama serve
ollama pull llama3
ollama pull nomic-embed-text

# Run the full pipeline (~5-15 min depending on hardware)
python pipeline.py
```

> The pipeline outputs `backend/outputs/clustering_results.json` — the single source of truth consumed by the frontend.

### 🌐 Frontend (Dashboard)

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:5173
```

<br/>

## `> llm_output_schema`

Each cluster receives a structured JSON explanation from both LLM backends:

```json
{
  "rotulo": "Economia & Mercados",
  "resumo": "Este cluster agrupa notícias sobre movimentações no mercado financeiro...",
  "analise_fronteira": "Os textos de fronteira misturam temas de política econômica...",
  "coerencia": "Alta"
}
```

Fields: **`rotulo`** (short label, ≤4 words) · **`resumo`** (3–4 line summary) · **`analise_fronteira`** (boundary ambiguity) · **`coerencia`** (`Alta / Média / Baixa`)

<br/>

## `> contact`

<div align="center">

  <strong>Cauã Vitor (takaokensei)</strong>
  <br/>
  <samp>AI Researcher & Electrical Engineering Student</samp>
  <br/>
  <samp>UFRN — Universidade Federal do Rio Grande do Norte</samp>

  <br/><br/>

  <a href="https://github.com/takaokensei">
    <img src="https://img.shields.io/badge/-GitHub-1a1b26?style=for-the-badge&logo=github&logoColor=c0caf5"/>
  </a>

</div>

<br/>

<div align="center">
  <img src="https://img.shields.io/badge/Made_with-Python_🐍_+_React_⚛️-c0caf5?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Powered_by-Gemini_+_Ollama-7aa2f7?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Theme-Tokyo_Night_🌃-bb9af7?style=for-the-badge"/>
</div>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=1a1b26&height=100&section=footer"/>
