"""
Calibracion del modelo de eleccion discreta (regresion logistica sobre tareas A/B)
con intervalos de confianza por remuestreo (bootstrapping).
"""

import csv
import json
import math
import os
import random

def sigmoid(z):
    z_clamped = max(-20.0, min(20.0, z))
    return 1.0 / (1.0 + math.exp(-z_clamped))

def train_logistic_regression(X, y, num_features, lr=0.05, epochs=300):
    weights = [0.0] * num_features
    m = len(y)
    if m == 0:
        return weights

    for _ in range(epochs):
        gradients = [0.0] * num_features
        for i in range(m):
            xi = X[i]
            yi = y[i]
            z = sum(w * x for w, x in zip(weights, xi))
            pred = sigmoid(z)
            error = pred - yi
            for j in range(num_features):
                gradients[j] += error * xi[j]
        
        # Actualizacion de pesos con regularizacion L2 ligera
        for j in range(num_features):
            weights[j] -= lr * (gradients[j] / m + 0.001 * weights[j])

    return weights

def bootstrap_ci(X, y, num_features, n_bootstraps=300, epochs=300, seed=42):
    """
    IC 95% por percentiles. Usa el mismo estimador (mismas epocas y
    regularizacion) que la estimacion puntual para que ambos sean comparables.
    """
    rng = random.Random(seed)
    m = len(y)
    bootstrap_weights = []

    for _ in range(n_bootstraps):
        sample_indices = [rng.randint(0, m - 1) for _ in range(m)]
        X_sample = [X[idx] for idx in sample_indices]
        y_sample = [y[idx] for idx in sample_indices]
        w = train_logistic_regression(X_sample, y_sample, num_features, epochs=epochs)
        bootstrap_weights.append(w)

    ci_results = []
    for j in range(num_features):
        vals = sorted([w[j] for w in bootstrap_weights])
        low_idx = int(0.025 * len(vals))
        high_idx = min(len(vals) - 1, int(0.975 * len(vals)))
        ci_results.append((vals[low_idx], vals[high_idx]))

    return ci_results

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    interviews_path = os.path.join(root_dir, "data", "raw", "interviews.csv")
    config_weights_path = os.path.join(root_dir, "config", "choice_model_weights.json")
    processed_weights_path = os.path.join(root_dir, "data", "processed", "choice_model_weights.json")

    X = []
    y = []

    with open(interviews_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d_time = float(row["route_a_walking_time_min"]) - float(row["route_b_walking_time_min"])
            d_cost = float(row["route_a_cost_mxn"]) - float(row["route_b_cost_mxn"])
            d_ver = float(row["route_a_pct_verified"]) - float(row["route_b_pct_verified"])
            d_loc = float(row["route_a_pct_local"]) - float(row["route_b_pct_local"])
            d_per = float(row["route_a_pct_periferia"]) - float(row["route_b_pct_periferia"])

            # Vector de caracteristicas normalizadas
            feat = [
                d_time / 30.0,
                d_cost / 50.0,
                d_ver,
                d_loc,
                d_per
            ]
            X.append(feat)
            y.append(1.0 if row["chosen_route"].strip().upper() == "A" else 0.0)

    num_features = 5
    feature_names = [
        "beta_tiempo_caminado_min",
        "beta_costo_total_mxn",
        "beta_pct_verificado",
        "beta_pct_local",
        "beta_pct_periferia"
    ]

    # Ajuste del modelo sobre el conjunto completo
    weights = train_logistic_regression(X, y, num_features, epochs=300)
    ci = bootstrap_ci(X, y, num_features, n_bootstraps=300)

    with open(config_weights_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    # Actualizar coeficientes estimados con intervalos de confianza del 95%
    for j, name in enumerate(feature_names):
        val = round(weights[j], 3)
        ci_low = round(ci[j][0], 3)
        ci_high = round(ci[j][1], 3)
        cfg["coeficientes_modelo_eleccion_logistica"][name] = {
            "estimacion": val,
            "intervalo_confianza_95": [ci_low, ci_high],
            "incluye_cero": ci_low <= 0.0 <= ci_high,
            "n_observaciones": len(y),
            "estado": "calibrado con tareas A/B de ejemplo sinteticas (data/raw/interviews.csv); sustituir por entrevistas reales antes de interpretar"
        }

    # Guardar archivo actualizado
    with open(config_weights_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

    os.makedirs(os.path.dirname(processed_weights_path), exist_ok=True)
    with open(processed_weights_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

    print("Calibracion del modelo de eleccion completada exitosamente:")
    for j, name in enumerate(feature_names):
        print(f"- {name}: {weights[j]:.3f} (IC 95%: [{ci[j][0]:.3f}, {ci[j][1]:.3f}])")

if __name__ == "__main__":
    main()
