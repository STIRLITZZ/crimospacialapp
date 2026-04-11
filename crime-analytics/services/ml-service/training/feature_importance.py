from typing import List


def get_feature_importance(model, feature_names: List[str]) -> List[dict]:
    """Extract and sort feature importances from a trained model.

    Works with models that expose ``feature_importances_`` (tree-based)
    or ``coef_`` (linear models, uses mean absolute coefficient per feature).

    Returns a list of {feature, importance} dicts sorted descending.
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_.tolist()
    elif hasattr(model, "coef_"):
        # For multi-class linear models coef_ is (n_classes, n_features)
        import numpy as np

        importances = np.abs(model.coef_).mean(axis=0).tolist()
    else:
        return [{"feature": f, "importance": 0.0} for f in feature_names]

    paired = [
        {"feature": name, "importance": round(imp, 6)}
        for name, imp in zip(feature_names, importances)
    ]
    paired.sort(key=lambda x: x["importance"], reverse=True)
    return paired
