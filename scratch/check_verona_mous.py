import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import MOU, PartnerUniversity

db = SessionLocal()
verona = db.query(PartnerUniversity).filter(PartnerUniversity.university_name == "University of Verona").first()
if verona:
    print(f"University of Verona ID: {verona.university_id}")
    mous = db.query(MOU).filter(MOU.university_id == verona.university_id, MOU.is_deleted == False).all()
    print(f"Total active MOUs for Verona: {len(mous)}")
    for m in mous:
        print(f"MOU ID: {m.mou_id} | Academic Year ID: {m.erp_academic_year_id} | Status: {m.status} | Docs Count: {m.other_docs_count}")
else:
    print("University of Verona not found in DB.")
db.close()
