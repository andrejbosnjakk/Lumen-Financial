"""
Production inference interface — the only file your friend needs.

Usage:
    from classifier import TransactionClassifier

    clf = TransactionClassifier("models/real_v1.pt")

    # Each transaction is [name] or [name, amount]
    predictions = clf.predict([
        ["Albert Heijn", -54.11],
        ["Spotify", -9.99],
        ["OVpay"],
    ])
    # -> ["Grocery Stores, Supermarkets",
    #     "Digital Goods: Large Digital Goods Merchant",
    #     "Local/Suburban Commuter Passenger Transportation..."]

    # With confidence scores:
    predictions = clf.predict_with_scores([["Albert Heijn", -54.11]])
    # -> [("Grocery Stores, Supermarkets", 0.97)]
"""

import os
import sys
from pathlib import Path
from typing import Union

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model import TransactionNet

HF_HOME = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface"))

EMBED_BATCH = 64


class TransactionClassifier:
    def __init__(self, checkpoint_path: Union[str, Path], device: str | None = None):
        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)

        ckpt = torch.load(checkpoint_path, map_location=self.device, weights_only=False)

        self.categories   = ckpt["categories"]
        self.amt_stats    = ckpt["amt_stats"]
        self.architecture = ckpt["architecture"]
        self.embedder_name = ckpt.get("embedder_name", "BAAI/bge-m3")
        embedding_dim      = ckpt.get("embedding_dim", 1024)

        self.model = TransactionNet(embedding_dim, len(self.categories), self.architecture)
        self.model.load_state_dict(ckpt["model_state"])
        self.model.to(self.device).eval()

        self._embedder = None  # lazy-loaded on first predict call

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(self, transactions: list) -> list[str]:
        """
        transactions: list of [name] or [name, amount]
        returns:      list of category strings, same length
        """
        logits = self._logits(transactions)
        indices = logits.argmax(dim=1).tolist()
        return [self.categories[i] for i in indices]

    def predict_with_scores(self, transactions: list) -> list[tuple[str, float]]:
        """
        Same as predict() but returns (category, confidence) tuples.
        Confidence is the softmax probability of the top-1 prediction.
        """
        logits = self._logits(transactions)
        probs  = F.softmax(logits, dim=1)
        top1_probs, top1_idx = probs.max(dim=1)
        return [
            (self.categories[i.item()], round(p.item(), 4))
            for i, p in zip(top1_idx, top1_probs)
        ]

    def predict_top3(self, transactions: list) -> list[list[tuple[str, float]]]:
        """
        Returns top-3 predictions with scores for each transaction.
        Useful for debugging or showing alternatives on the website.
        """
        logits = self._logits(transactions)
        probs  = F.softmax(logits, dim=1)
        top3   = probs.topk(3, dim=1)
        result = []
        for probs_row, idx_row in zip(top3.values, top3.indices):
            result.append([
                (self.categories[i.item()], round(p.item(), 4))
                for p, i in zip(probs_row, idx_row)
            ])
        return result

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _load_embedder(self):
        from sentence_transformers import SentenceTransformer
        print(f"Loading embedder {self.embedder_name} ...")
        embedder = SentenceTransformer(
            self.embedder_name,
            cache_folder=str(HF_HOME / "sentence_transformers"),
            device="cpu",
        )
        self._embedder = embedder.to(self.device)

    def _embed(self, texts: list[str]) -> np.ndarray:
        if self._embedder is None:
            self._load_embedder()
        return self._embedder.encode(
            texts,
            batch_size=EMBED_BATCH,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        ).astype(np.float32)

    def _amount_features(self, amounts: list[float]) -> torch.Tensor:
        raw = np.array([
            [a, np.log1p(abs(a)), 1.0 if a < 0 else 0.0]
            for a in amounts
        ], dtype=np.float32)
        mean = np.array(self.amt_stats["mean"], dtype=np.float32)
        std  = np.array(self.amt_stats["std"],  dtype=np.float32)
        return torch.from_numpy((raw - mean) / std).to(self.device)

    def _logits(self, transactions: list) -> torch.Tensor:
        names   = [str(t[0]) for t in transactions]
        amounts = [float(t[1]) if len(t) > 1 else 0.0 for t in transactions]

        embs = torch.from_numpy(self._embed(names)).to(self.device)

        with torch.no_grad():
            if self.architecture.get("use_amount", True):
                amt = self._amount_features(amounts)
                x   = torch.cat([embs, amt], dim=1)
            else:
                x = embs
            return self.model(x)
