"""
Fuzzy free-text product matching.

This keeps the app fully offline and lightweight by using a pure-Python
character similarity heuristic instead of depending on heavy ML packages
(scikit-learn / FAISS). It still handles common buyer typos and
romanized variants well enough for a real operational MVP.
"""
from difflib import SequenceMatcher
import re


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


class ProductMatcher:
    def __init__(self, products: list[dict]):
        """products: list of dicts with id, name, common_spellings
        (comma-separated Latin-script aliases)."""
        self.products = products

    def _score_product(self, query_text: str, product: dict) -> float:
        query = _normalize(query_text)
        if not query:
            return 0.0

        aliases = [product.get("name", "")] + (
            [alias.strip() for alias in (product.get("common_spellings")
                                         or "").split(",") if alias.strip()]
        )

        best_score = 0.0
        for alias in aliases:
            alias_text = _normalize(alias)
            if not alias_text:
                continue

            if alias_text == query:
                return 1.0

            if alias_text in query or query in alias_text:
                best_score = max(best_score, 0.8)

            ratio = SequenceMatcher(None, query, alias_text).ratio()
            if ratio > best_score:
                best_score = ratio

            q_tokens = set(query.split())
            a_tokens = set(alias_text.split())
            if q_tokens and a_tokens:
                overlap = len(q_tokens & a_tokens) / \
                    max(len(q_tokens | a_tokens), 1)
                best_score = max(best_score, overlap)

        return round(best_score, 3)

    def match(self, query_text: str, top_k: int = 3) -> list[dict]:
        results = []
        for product in self.products:
            confidence = self._score_product(query_text, product)
            if confidence > 0:
                results.append({"product": product, "confidence": confidence})

        results.sort(key=lambda item: item["confidence"], reverse=True)
        return results[:top_k]

    def parse_list(self, free_text: str, min_confidence: float = 0.35) -> list[dict]:
        """Split a buyer's raw message on commas/newlines and match each
        chunk independently. E.g. 'thakkali 2kg, ulli konjam' -> two matches."""
        chunks = [c.strip() for c in free_text.replace(
            "\n", ",").split(",") if c.strip()]
        matched = []
        for chunk in chunks:
            best = self.match(chunk, top_k=1)
            if best and best[0]["confidence"] >= min_confidence:
                matched.append({"input_text": chunk, **best[0]})
            else:
                matched.append(
                    {"input_text": chunk, "product": None, "confidence": 0})
        return matched
