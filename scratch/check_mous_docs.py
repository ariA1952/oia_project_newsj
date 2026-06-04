import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import MOU

db = SessionLocal()
print("Querying MOUs from DB:")
mous = db.query(MOU).filter(MOU.is_deleted == False).all()
for m in mous:
    print(f"MOU ID: {m.mou_id}")
    print(f"  other_documents field: {m.other_documents} (Type: {type(m.other_documents)})")
    print(f"  other_docs_count property: {m.other_docs_count}")
db.close()
