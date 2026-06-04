import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.routers import query_mous

db = SessionLocal()
results = query_mous(db=db)
print(f"Total results: {len(results)}")
for r in results:
    if r.get('other_docs_count', 0) > 0:
        print(f"MOU ID: {r.get('mou_id')} | Uni: {r.get('university_name')} | other_docs_count: {r.get('other_docs_count')} | other_documents: {r.get('other_documents')}")
db.close()
