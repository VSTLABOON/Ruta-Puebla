"""
Copia los artefactos estaticos procesados y las configuraciones a la carpeta publica de apps/web.
"""

import os
import shutil

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    src_processed = os.path.join(root_dir, "data", "processed")
    src_config = os.path.join(root_dir, "config")
    dest_dir = os.path.join(root_dir, "apps", "web", "public", "data")

    os.makedirs(dest_dir, exist_ok=True)

    # Copiar archivos procesados
    processed_files = [
        "accessibility_segments.geojson",
        "pois.json",
        "sidewalk_graph.json",
        "time_matrices.json"
    ]
    for pf in processed_files:
        src = os.path.join(src_processed, pf)
        if os.path.exists(src):
            dst = os.path.join(dest_dir, pf)
            shutil.copy2(src, dst)
            print(f"Copiado {pf} -> apps/web/public/data/{pf}")

    # Copiar configuraciones
    config_files = [
        "accessibility_thresholds.json",
        "choice_model_weights.json"
    ]
    for cf in config_files:
        src = os.path.join(src_config, cf)
        if os.path.exists(src):
            dst = os.path.join(dest_dir, cf)
            shutil.copy2(src, dst)
            print(f"Copiado {cf} -> apps/web/public/data/{cf}")

if __name__ == "__main__":
    main()
