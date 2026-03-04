# Clarification Workflow - Quick Test Guide

## Fixed Issues Summary

### 1. ✅ Document Handling Regression (FIXED)

**File**: [backend/routers.py](backend/routers.py#L545-L555)
**Change**: Replaced broken `document_name`/`document_data` with correct `save_file()` and `document_path`
**Status**: Fully implemented and verified

### 2. ✅ Auto-Resubmit After Clarification (VERIFIED)

**File**: [backend/routers.py](backend/routers.py#L505-L507)
**Logic**: When faculty edits a CLARIFICATION_REQUESTED activity:

- Status auto-transitions to SUBMITTED
- rejection_remarks are cleared
  **Status**: Already implemented correctly

### 3. ✅ Clarification Resubmit Support (VERIFIED)

**File**: [backend/routers.py](backend/routers.py#L386)
**Logic**: submit_collaboration_activity allows both DRAFT and CLARIFICATION_REQUESTED statuses
**Status**: Already implemented correctly

---

## Workflow Validation Checklist

### Phase 1: Draft Creation

- [ ] Faculty creates new activity (status = DRAFT)
- [ ] Optional: Upload document
- [ ] Verify: Activity appears in Draft list

### Phase 2: Initial Submission

- [ ] Faculty submits activity
- [ ] API Endpoint: `PUT /collaboration-activity/{id}/submit`
- [ ] Expected Status: DRAFT → SUBMITTED
- [ ] Verify: Activity moves to "Pending Review" for HOD

### Phase 3: Request Clarification

- [ ] HOD views submitted activity
- [ ] HOD enters clarification remarks (e.g., "Please provide more details on participants")
- [ ] API Endpoint: `PUT /collaboration-activity/{id}/clarify`
- [ ] Expected Status: SUBMITTED → CLARIFICATION_REQUESTED
- [ ] Expected Change: rejection_remarks field populated with HOD's message
- [ ] Verify: Activity appears in faculty's "Clarification Needed" list

### Phase 4: Faculty Edits & Resubmits

- [ ] Faculty navigates to "Clarification Needed" activities in DataEntry
- [ ] Faculty sees the clarification remarks from HOD
- [ ] Faculty edits fields and/or uploads new document
- [ ] Faculty clicks "Save"
- [ ] API Endpoint: `PUT /collaboration-activity/{id}`
- [ ] Expected Status: CLARIFICATION_REQUESTED → SUBMITTED (auto-transition)
- [ ] Expected Change: rejection_remarks cleared (set to null)
- [ ] Verify: Activity automatically resubmitted and appears in HOD's Pending Review

### Phase 5: Final Approval/Rejection

- [ ] HOD reviews the resubmitted activity
- [ ] Either:
  - **Approve**: Click "Approve" button
    - API: `PUT /collaboration-activity/{id}/approve`
    - Expected: Status → APPROVED
  - **Reject**: Click "Reject" with remarks
    - API: `PUT /collaboration-activity/{id}/reject`
    - Expected: Status → REJECTED
- [ ] Verify: Activity reaches final state

---

## Test Data Setup

### Required Users (Via Seed Data)

```
FACULTY User:
- erp_users_id = 2
- erp_users_type = 'FACULTY'
- erp_campus_department_mapping_id = 1
- password = 'password123'

HOD User:
- erp_users_id = 3
- erp_users_type = 'HOD'
- erp_campus_department_mapping_id = 1
- password = 'password123'
```

### Required Master Data

```
Academic Year:
- erp_academic_year_id = 1
- academic_year_name = '2025-2026'

Quarter:
- quarter_id = 1
- quarter_number = 1
- erp_academic_year_id = 1

Parameter:
- parameter_id = 1
- parameter_name = 'Student Exchange'
```

---

## Manual Testing via cURL

### 1. Faculty Login

```bash
TOKEN=$(curl -s -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=2&password=password123" | jq -r '.access_token')

echo "Faculty Token: $TOKEN"
```

### 2. Create Activity (DRAFT)

```bash
ACTIVITY_ID=$(curl -s -X POST "http://127.0.0.1:8000/collaboration-activity/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "parameter_id=1" \
  -F "erp_academic_year_id=1" \
  -F "quarter_id=1" \
  -F "activity_title=Student Exchange Program 2026" | jq -r '.activity_id')

echo "Created Activity ID: $ACTIVITY_ID"
```

### 3. Submit Activity (DRAFT → SUBMITTED)

```bash
curl -s -X PUT "http://127.0.0.1:8000/collaboration-activity/$ACTIVITY_ID/submit" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "SUBMITTED"
```

### 4. HOD Login

```bash
HOD_TOKEN=$(curl -s -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=3&password=password123" | jq -r '.access_token')

echo "HOD Token: $HOD_TOKEN"
```

### 5. HOD Requests Clarification (SUBMITTED → CLARIFICATION_REQUESTED)

```bash
curl -s -X PUT "http://127.0.0.1:8000/collaboration-activity/$ACTIVITY_ID/clarify" \
  -H "Authorization: Bearer $HOD_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "remarks=Please provide more details on the number of participating students and which universities are involved" \
  | jq '.status, .rejection_remarks'
# Expected status: "CLARIFICATION_REQUESTED"
# Expected remarks: "Please provide more details..."
```

### 6. Faculty Edits Activity (CLARIFICATION_REQUESTED → SUBMITTED)

```bash
curl -s -X PUT "http://127.0.0.1:8000/collaboration-activity/$ACTIVITY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "activity_title=Student Exchange Program 2026 - Updated with Details" \
  -F "numeric_value=25" \
  -F 'activity_data={"participating_students": 25, "partner_universities": ["Harvard", "MIT"]}' \
  | jq '.status, .rejection_remarks'
# Expected status: "SUBMITTED"
# Expected rejection_remarks: null
```

### 7. HOD Approves Activity (SUBMITTED → APPROVED)

```bash
curl -s -X PUT "http://127.0.0.1:8000/collaboration-activity/$ACTIVITY_ID/approve" \
  -H "Authorization: Bearer $HOD_TOKEN" | jq '.status'
# Expected: "APPROVED"
```

### 8. Verify Final State

```bash
curl -s -X GET "http://127.0.0.1:8000/collaboration-activity/$ACTIVITY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{status, rejection_remarks, approved_user_id, activity_title}'
```

---

## Expected API Responses

### Activity Object Structure

```json
{
  "activity_id": 1,
  "parameter_id": 1,
  "activity_title": "Student Exchange Program 2026",
  "status": "SUBMITTED",
  "rejection_remarks": null,
  "numeric_value": 25,
  "activity_data": {
    "participating_students": 25,
    "partner_universities": ["Harvard", "MIT"]
  },
  "document_path": "/uploads/collaboration_activity/activity_1_2026-03-03.pdf",
  "approved_user_id": null,
  "approved_time": null,
  "created_time": "2026-03-03T10:30:00",
  "modified_time": "2026-03-03T11:45:00"
}
```

---

## Troubleshooting

### Issue: "Activity does not belong to your department"

- **Cause**: Faculty is trying to edit activity with different mapping_id
- **Fix**: Ensure user's `erp_campus_department_mapping_id` matches activity's

### Issue: "Only DRAFT or CLARIFICATION_REQUESTED activities can be submitted"

- **Cause**: Activity is in a state that cannot be submitted
- **Fix**: Verify activity status before calling submit endpoint

### Issue: Document not saved / Lost on update

- **Cause**: Old code using non-existent `document_data` field
- **Fix**: Code has been updated to use `save_file()` and `document_path`
- **Verification**: New documents properly stored in uploads directory

### Issue: rejection_remarks not cleared after resubmit

- **Cause**: Update endpoint not clearing remarks field
- **Fix**: Code now sets `rejection_remarks = None` when transitioning from CLARIFICATION_REQUESTED
- **Verification**: Query activity after update, remarks should be null

---

## Code References

### Backend Endpoints

| Endpoint                                | Method | Purpose               | Status   |
| --------------------------------------- | ------ | --------------------- | -------- |
| `/collaboration-activity/`              | POST   | Create new activity   | ✅       |
| `/collaboration-activity/{id}`          | GET    | Retrieve activity     | ✅       |
| `/collaboration-activity/{id}`          | PUT    | Update activity       | ✅ FIXED |
| `/collaboration-activity/{id}/submit`   | PUT    | Submit for approval   | ✅       |
| `/collaboration-activity/{id}/clarify`  | PUT    | Request clarification | ✅       |
| `/collaboration-activity/{id}/approve`  | PUT    | Approve activity      | ✅       |
| `/collaboration-activity/{id}/reject`   | PUT    | Reject activity       | ✅       |
| `/collaboration-activity/{id}/document` | GET    | Download document     | ✅       |

### Frontend Components

| Component         | Status | Notes                                             |
| ----------------- | ------ | ------------------------------------------------- |
| DataEntry.jsx     | ✅     | Allows saving DRAFT and CLARIFICATION_REQUESTED   |
| Review.jsx        | ✅     | Shows resubmit button for CLARIFICATION_REQUESTED |
| metricsService.js | ✅     | Properly serializes JSON and documents            |

---

## Sign-Off

- **Date**: March 3, 2026
- **Changes Implemented**: ✅ All 3 required fixes completed
- **Testing Status**: Ready for manual testing
- **Code Review**: All changes verified in source files
