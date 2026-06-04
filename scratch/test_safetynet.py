import sys
import os
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from backend.database import SessionLocal
from backend.models import MOU, ErpUsers
from backend.routers import get_current_user

# Setup TestClient
client = TestClient(app)

# Override get_current_user dependency so we don't have to authenticate
db = SessionLocal()
admin_user = db.query(ErpUsers).filter(ErpUsers.erp_users_type == "SUPER_ADMIN").first()
if not admin_user:
    admin_user = db.query(ErpUsers).filter(ErpUsers.erp_users_type == "OIA_ADMIN").first()
db.close()

assert admin_user is not None, "No admin user found in DB to override dependency!"

def override_get_current_user():
    return admin_user

app.dependency_overrides[get_current_user] = override_get_current_user

print(f"Testing safetynet with user: {admin_user.erp_users_id} (Role: {admin_user.erp_users_type})")

# Find Verona University (MOU #165)
db = SessionLocal()
mou = db.query(MOU).filter(MOU.mou_id == 165).first()
original_docs = list(mou.other_documents) if mou.other_documents else []
print(f"Original supporting documents for Verona University (MOU #165): {original_docs}")
db.close()

# Simulate a PUT request that updates the status but does NOT provide other_documents_metadata
print("\nPerforming PUT request without other_documents_metadata...")
response = client.put(
    "/mou/165",
    data={
        "university_id": 4, # Verona
        "erp_academic_year_id": 1,
        "mou_type": "Joint Program",
        "status": "Active",
    }
)

print(f"Response status code: {response.status_code}")
if response.status_code != 200:
    print(f"Error payload: {response.text}")
assert response.status_code == 200, "Update request failed!"

# Fetch the MOU from DB again to verify that documents are preserved!
db = SessionLocal()
mou_after = db.query(MOU).filter(MOU.mou_id == 165).first()
docs_after = list(mou_after.other_documents) if mou_after.other_documents else []
print(f"Supporting documents after PUT without other_documents_metadata: {docs_after}")
assert docs_after == original_docs, "FAIL: Supporting documents were wiped out when metadata was missing!"
print("\n[SUCCESS] Backend Safetynet successfully preserved supporting documents when metadata was absent!")

# Clean up dependency overrides
app.dependency_overrides.clear()
sys.exit(0)
