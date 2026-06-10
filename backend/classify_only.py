"""
classify_only.py
----------------
Script standalone que roda APENAS a classificação supervisionada
e patcha o clustering_results.json já existente.

NÃO re-executa: embeddings Ollama, clustering, LLM (Gemini/Ollama),
projeções 2D, nem exportação de plots.

Tempo estimado: 1–3 minutos (TF-IDF ~1s, ST ~30–90s, classificadores ~10s).

Uso:
    python backend/classify_only.py
"""

import os, sys, time, json
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

# Force UTF-8 stdout encoding on Windows to support terminal emojis
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import LabelEncoder

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'Base_dados_textos_6_classes.csv')

# JSON gerado pelo pipeline completo (em duas localizações)
JSON_PATHS = [
    os.path.join(BASE_DIR, 'frontend', 'public', 'clustering_results.json'),
    os.path.join(BASE_DIR, 'backend', 'outputs', 'clustering_results.json'),
]

PT_STOPWORDS = [
    'a','ao','aos','aquela','aquelas','aquele','aqueles','as','ate','com','como',
    'da','das','de','dela','delas','dele','deles','do','dos','e','ela','elas',
    'ele','eles','em','entre','essa','esse','esta','este','eu','foi','ha','ja',
    'mas','me','meu','minha','muito','na','nas','no','nos','o','os','ou','para',
    'pela','pelo','por','que','quem','se','sem','ser','seu','seus','so','sua',
    'suas','tambem','te','tem','temos','um','uma','uns','voce','voces'
]


def load_dataset():
    print(f"📂 Lendo dataset: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH, sep=';', encoding='utf-8')
    df = df.dropna(subset=['Texto Original', 'Texto Expandido']).reset_index(drop=True)
    print(f"   {len(df)} registros válidos | {df['Categoria'].nunique()} categorias")
    return df


def generate_tfidf(texts):
    print("⏳ Gerando TF-IDF (1000 features)...")
    t0 = time.time()
    vec = TfidfVectorizer(max_features=1000, stop_words=PT_STOPWORDS)
    X = vec.fit_transform(texts).toarray()
    print(f"   TF-IDF: {X.shape}  ({time.time()-t0:.2f}s)")
    return X


def generate_st(texts):
    print("⏳ Gerando Embeddings ST (paraphrase-multilingual-MiniLM-L12-v2)...")
    try:
        from sentence_transformers import SentenceTransformer
        t0 = time.time()
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        X = model.encode(texts, show_progress_bar=True, batch_size=32)
        print(f"   ST: {X.shape}  ({time.time()-t0:.2f}s)")
        return np.array(X)
    except Exception as e:
        print(f"   [WARN] ST falhou: {e}. Pulando.")
        return None


def run_classification(representations, true_labels_raw):
    print("\n🤖 Rodando classificadores supervisionados (5-fold StratifiedKFold)...")
    le = LabelEncoder()
    y = le.fit_transform(true_labels_raw)
    class_names = list(le.classes_)

    classifiers = {
        'logistic_regression': LogisticRegression(
            max_iter=2000, C=1.0, solver='lbfgs',
            multi_class='multinomial', random_state=42
        ),
        'svm': LinearSVC(max_iter=4000, C=1.0, random_state=42),
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}

    for rep_name, X in representations.items():
        if X is None:
            print(f"   [SKIP] '{rep_name}' não disponível.")
            continue
        results[rep_name] = {}
        for clf_name, clf in classifiers.items():
            t0 = time.time()
            print(f"   {rep_name} + {clf_name}...", end=' ', flush=True)
            try:
                y_pred     = cross_val_predict(clf, X, y, cv=cv)
                acc        = float(accuracy_score(y, y_pred))
                f1_macro   = float(f1_score(y, y_pred, average='macro'))
                f1_weighted= float(f1_score(y, y_pred, average='weighted'))
                f1_per     = f1_score(y, y_pred, average=None)
                per_class  = {class_names[i]: round(float(f1_per[i]), 4) for i in range(len(class_names))}
                elapsed = time.time() - t0
                results[rep_name][clf_name] = {
                    'accuracy':     round(acc, 4),
                    'f1_macro':     round(f1_macro, 4),
                    'f1_weighted':  round(f1_weighted, 4),
                    'f1_per_class': per_class,
                    'time_taken':   round(elapsed, 3),
                }
                print(f"Acc={acc:.3f}  F1-macro={f1_macro:.3f}  ({elapsed:.1f}s)")
            except Exception as e:
                print(f"ERRO: {e}")
                results[rep_name][clf_name] = None
    return results


def patch_json(classification_results):
    """Lê o JSON existente, adiciona/atualiza a chave 'classification' e salva."""
    patched = 0
    for path in JSON_PATHS:
        if not os.path.exists(path):
            print(f"   [SKIP] Não encontrado: {path}")
            continue
        print(f"   📝 Patchando: {path}")
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['classification'] = classification_results
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        size_kb = os.path.getsize(path) / 1024
        print(f"      ✅ Salvo ({size_kb:.0f} KB)")
        patched += 1

    if patched == 0:
        # Nenhum JSON existente encontrado — avisa o usuário
        print("\n⚠️  Nenhum clustering_results.json encontrado.")
        print("   Execute primeiro: python backend/pipeline.py")
        print("   Depois re-execute este script.")
        sys.exit(1)


def main():
    print("=" * 60)
    print("  CLASSIFICAÇÃO SUPERVISIONADA — PATCH DO JSON EXISTENTE")
    print("=" * 60)

    df = load_dataset()
    texts = df['Texto Expandido'].tolist()

    # Gerar apenas as representações rápidas (TF-IDF sempre; ST se possível)
    # Ollama propositalmente ignorado — muito lento para um patch
    representations = {
        'tfidf':                 generate_tfidf(texts),
        'sentence_transformers': generate_st(texts),
    }

    classification_results = run_classification(representations, df['Categoria'].values)

    print("\n💾 Salvando resultados...")
    patch_json(classification_results)

    print("\n" + "=" * 60)
    print("  PATCH CONCLUÍDO! Resultados:")
    for rep, clfmap in classification_results.items():
        for clf, res in (clfmap or {}).items():
            if res:
                print(f"  {rep:28s} + {clf:22s}  "
                      f"Acc={res['accuracy']:.3f}  F1-macro={res['f1_macro']:.3f}")
    print("=" * 60)
    print("\n🔄 Recarregue o dashboard no navegador para ver o novo painel.")


if __name__ == '__main__':
    main()
