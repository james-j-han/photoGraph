import psycopg2
import numpy as np

conn = psycopg2.connect(
    dbname="photoGRAPH",
    user="postgres",
    password="",  #######INSERT PASSWORD
    host="localhost",
    port="5432"
)
cur = conn.cursor()


def retrieve_embeddings(limit=1):
    try:
        cur.execute(
            """
            SELECT image_name, clip_vector_embedding, umap_2d, umap_3d
            FROM image
            LIMIT %s;
            """, (limit,)
        )
        
        records = cur.fetchall()
        results = []

        for record in records:
            image_name = record[0]
            clip_embedding = np.array(record[1])
            umap_2d = np.array(record[2])
            umap_3d = np.array(record[3])
            
            results.append((image_name, clip_embedding, umap_2d, umap_3d))

        return results

    finally:
        cur.close()
        conn.close()

# Test the function
if __name__ == "__main__":
    retrieved_data = retrieve_embeddings(limit=1)

    if retrieved_data:
        image_name, clip_emb, umap_2d, umap_3d = retrieved_data[0]
        print(f"\nImage Name: {image_name}")
        print(f"CLIP Embedding (First 5 Values): {clip_emb[:5]}")
        print(f"UMAP 2D: {umap_2d}")
        print(f"UMAP 3D: {umap_3d}")