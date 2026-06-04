import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import MOU, PartnerUniversity

db = SessionLocal()
mous = db.query(MOU).filter(MOU.is_deleted == False).all()
print(f"Total active/not-deleted MOUs in DB: {len(mous)}")
for m in mous:
    uni = db.query(PartnerUniversity).filter(PartnerUniversity.university_id == m.university_id).first()
    uni_name = uni.university_name if uni else f"Uni #{m.university_id}"
    if m.other_docs_count > 0 or m.other_documents:
        print(f"MOU ID: {m.mou_id} | Uni: {uni_name} | Status: {m.status} | Docs Count: {m.other_docs_count} | Other Documents: {m.other_documents}")
db.close()
