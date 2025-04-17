# pca_utils.py
import pickle
import base64
import os
from supabase import create_client
from typing import Optional
from sklearn.decomposition import IncrementalPCA

# supabase client setup
SUPABASE_URL = os.environ["REACT_APP_SUPABASE_URL"]
SUPABASE_KEY = os.environ["REACT_APP_SUPABASE_ANON_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_pca_model(project_id: str) -> Optional[IncrementalPCA]:
    """
    Fetch and unpickle the IncrementalPCA model for a given project.
    Returns None if none exists or on any error.
    """
    try:
        resp = (
            supabase
            .table("pca_models")
            .select("model_bytes")
            .eq("project_id", project_id)
            .execute()
        )
        rows = getattr(resp, "data", []) or []
    except Exception as e:
        print("‼ load_pca_model SUPABASE ERROR:", e)
        return None

    if len(rows) != 1:
        print(f"ℹ load_pca_model: found {len(rows)} rows (want exactly 1)")
        return None

    b64 = rows[0].get("model_bytes")
    if not b64:
        return None

    try:
        raw = base64.b64decode(b64)
        return pickle.loads(raw)
    except Exception as e:
        print("‼ load_pca_model UNPICKLE ERROR:", e)
        return None


def save_pca_model(project_id: str, ipca: IncrementalPCA) -> None:
    """
    Pickle the IncrementalPCA model, Base64‐encode it, and upsert into pca_models.
    """
    try:
        raw = pickle.dumps(ipca)
        b64 = base64.b64encode(raw).decode("ascii")

        resp = (
            supabase
            .table("pca_models")
            .upsert(
                {"project_id": project_id, "model_bytes": b64},
                on_conflict="project_id",        # make sure it overwrites the same row
                returning="representation"
            )
            .execute()
        )
        count = len(getattr(resp, "data", []) or [])
        print(f"→ save_pca_model upsert OK, rows returned: {count}")
    except Exception as e:
        print("‼ save_pca_model ERROR:", e)