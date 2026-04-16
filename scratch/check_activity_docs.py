from backend.database import SessionLocal
from backend.models import CollaborationActivity
import json

db = SessionLocal()
for aid in [24, 25]:
    activity = db.query(CollaborationActivity).filter(CollaborationActivity.activity_id == aid).first()
    if activity:
        print(f"Activity ID: {aid}")
        print(f"Status: {activity.status}")
        print(f"Activity Data: {json.dumps(activity.activity_data, indent=2)}")
        print("-" * 20)
    else:
        print(f"Activity ID: {aid} not found")
db.close()
