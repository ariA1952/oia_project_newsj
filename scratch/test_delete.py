from backend.database import SessionLocal
from backend.models import CollaborationActivity, ActivityStatusLog
import sys

db = SessionLocal()
try:
    # Let's find a rejected activity
    rejected_activity = db.query(CollaborationActivity).filter(CollaborationActivity.status == "REJECTED").first()
    if not rejected_activity:
        print("No rejected activities found. Let's look for any activity.")
        rejected_activity = db.query(CollaborationActivity).first()
    
    if not rejected_activity:
        print("No activities found at all.")
        sys.exit(0)
        
    print(f"Found activity to delete: ID={rejected_activity.activity_id}, Status={rejected_activity.status}")
    
    # Check related tables
    logs = db.query(ActivityStatusLog).filter(ActivityStatusLog.activity_id == rejected_activity.activity_id).all()
    print(f"Status logs count: {len(logs)}")
    
    # Try deleting (inside transaction, will rollback)
    db.delete(rejected_activity)
    db.commit()
    print("Success: Activity deleted successfully!")
except Exception as e:
    db.rollback()
    print(f"Error occurred during delete: {type(e).__name__}: {e}")
finally:
    db.close()
