import sys
import os

# Add root folder to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Verifying backend files...")
try:
    print("1. Importing database engine and Base...")
    from backend.database import Base, engine
    print("   [OK] Database module imported successfully.")
    
    print("2. Importing models...")
    from backend.models import MOU, ErpUsers
    print("   [OK] Models imported successfully.")
    
    # Test property availability on a mock instance
    m = MOU(other_documents=[{"title": "Doc1"}, {"title": "Doc2"}])
    print(f"   [OK] MOU class initialized. Test other_docs_count property: {m.other_docs_count} (Expected: 2)")
    assert m.other_docs_count == 2, "other_docs_count property check failed!"
    
    print("3. Importing schemas...")
    from backend.schemas import MOUResponse
    print("   [OK] Schemas imported successfully.")
    
    # Verify field is present in schema
    fields = MOUResponse.model_fields
    print("   Fields in MOUResponse:", list(fields.keys()))
    assert "other_docs_count" in fields, "other_docs_count is missing from MOUResponse schema!"
    print("   [OK] other_docs_count is successfully present in MOUResponse schema.")
    
    print("4. Importing main FastAPI application and routers...")
    from main import app
    print("   [OK] FastAPI app and all routers imported successfully. No syntax or import errors!")
    print("\nBackend code verification successful! All components are error-free.")
    sys.exit(0)

except Exception as e:
    import traceback
    print("\n[ERROR] Verification failed:")
    traceback.print_exc()
    sys.exit(1)
