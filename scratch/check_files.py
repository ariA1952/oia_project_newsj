import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import MOU

db = SessionLocal()
mous = db.query(MOU).filter(MOU.is_deleted == False).all()
for m in mous:
    if m.other_documents:
        for idx, doc in enumerate(m.other_documents):
            path = doc.get("file_path")
            exists = os.path.exists(path) if path else False
            print(f"MOU ID: {m.mou_id} | Doc #{idx}: {doc.get('title')} | Path: {path} | File Exists: {exists}")
db.close()
