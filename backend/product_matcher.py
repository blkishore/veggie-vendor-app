"""
Vector search for free-form buyer text -> product catalog matching.

Real-world problem this solves: a buyer's WhatsApp message says
"thakkali" or "tamatar" instead of picking the exact catalog string
"Tomato" from a dropdown. We embed each product's name plus its known
Latin-script spelling variants (transliterations buyers actually type)
as character n-gram TF-IDF vectors, index them in FAISS, and do a
nearest-neighbour search against the buyer's raw text.

IMPORTANT LIMITATION (a real one, worth knowing): character n-grams
only match text in the SAME SCRIPT. "thakkali" (Latin) and "தக்காளி"
(Tamil Unicode) share zero characters, so this cannot bridge native
Tamil/Hindi script to English on its own — that needs either a
phonetic transliteration table or a multilingual embedding model.
What this DOES solve well: typos, plurals, and the many ways people
romanize the same word on a phone keyboard ("thakkali", "thakkaali",
"tamatar", "tomatoe"), because those all share overlapping substrings.

This is intentionally embedding-model-free (no external API call, no
model download) so it runs fully offline — swap `TfidfVectorizer` for a
sentence-transformers model later without touching the FAISS index code
at all; the index/search API is identical either way.
"""
import numpy as np
import faiss
from sklearn.feature_extraction.text import TfidfVectorizer


class ProductMatcher:
    def __init__(self, products: list[dict]):
        """products: list of dicts with id, name, common_spellings
        (comma-separated Latin-script aliases)."""
        self.products = products
        self._corpus = [
            " ".join(
                filter(
                    None,
                    [p["name"]] + (p.get("common_spellings") or "").split(","),
                )
            )
            for p in products
        ]

        # Character n-grams handle spelling/transliteration variants
        # ("tamatar" vs "tomato") far better than word-level tokens would.
        self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))
        vectors = self.vectorizer.fit_transform(self._corpus).toarray().astype("float32")

        faiss.normalize_L2(vectors)  # so inner product == cosine similarity
        self.index = faiss.IndexFlatIP(vectors.shape[1])
        self.index.add(vectors)

    def match(self, query_text: str, top_k: int = 3) -> list[dict]:
        query_vec = self.vectorizer.transform([query_text]).toarray().astype("float32")
        faiss.normalize_L2(query_vec)

        scores, indices = self.index.search(query_vec, top_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            results.append(
                {
                    "product": self.products[idx],
                    "confidence": round(float(score), 3),
                }
            )
        return results

    def parse_list(self, free_text: str, min_confidence: float = 0.35) -> list[dict]:
        """Split a buyer's raw message on commas/newlines and match each
        chunk independently. E.g. 'thakkali 2kg, ulli konjam' -> two matches."""
        chunks = [c.strip() for c in free_text.replace("\n", ",").split(",") if c.strip()]
        matched = []
        for chunk in chunks:
            best = self.match(chunk, top_k=1)
            if best and best[0]["confidence"] >= min_confidence:
                matched.append({"input_text": chunk, **best[0]})
            else:
                matched.append({"input_text": chunk, "product": None, "confidence": 0})
        return matched
