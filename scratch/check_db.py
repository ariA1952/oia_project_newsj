from backend.database import SessionLocal
from backend.models import ErpAcademicYear, ErpCampus, ErpDepartment

db = SessionLocal()
print("Academic Years in local DB:")
years = db.query(ErpAcademicYear).all()
for y in years:
    print(f"ID: {y.erp_academic_year_id}, Name: {y.academic_year_name}")

print("\nCampuses in local DB:")
campuses = db.query(ErpCampus).all()
for c in campuses:
    print(f"ID: {c.erp_campus_id}, Name: {c.campus_name}")

db.close()
