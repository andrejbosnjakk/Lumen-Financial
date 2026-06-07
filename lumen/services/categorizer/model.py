"""
Transaction classifier model definition.

This is the single place to edit the neural network architecture.
Everything else (train.py, classifier.py) imports from here.
"""

import torch
import torch.nn as nn


# ---------------------------------------------------------------------------
# Architecture config — edit these to change the model
# ---------------------------------------------------------------------------

ARCHITECTURE = {
    "hidden_dims":  [512, 256],   # MLP hidden layer sizes
    "dropout":       0.1,          # dropout between every hidden layer
    "use_amount":    True,         # include transaction amount features
    "amount_dim":    3,            # checkpoint may override this, e.g. time.pt uses 7
    "activation":    "gelu",       # "gelu" | "relu" | "silu"
}


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

_ACTIVATIONS = {
    "gelu": nn.GELU,
    "relu": nn.ReLU,
    "silu": nn.SiLU,
}


class TransactionNet(nn.Module):
    """
    MLP classifier on top of frozen BGE-M3 embeddings.

    Input:  [embedding (1024-d) || numeric_features]        if use_amount
            [embedding (1024-d)]                            otherwise
    Output: logits over num_classes categories
    """

    def __init__(self, embedding_dim: int, num_classes: int, config: dict = ARCHITECTURE):
        super().__init__()
        self.config = config
        act_cls = _ACTIVATIONS[config["activation"]]

        in_dim = embedding_dim + (config["amount_dim"] if config["use_amount"] else 0)
        layers = []
        prev = in_dim
        for h in config["hidden_dims"]:
            layers += [
                nn.Linear(prev, h),
                nn.LayerNorm(h),
                act_cls(),
                nn.Dropout(config["dropout"]),
            ]
            prev = h
        layers.append(nn.Linear(prev, num_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
