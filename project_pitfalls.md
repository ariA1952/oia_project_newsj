# OIA Project - Pitfalls and Risks Analysis

## 1. Approval Workflow & Logic Gaps

### **Critical: Missing Approval Logic**
- **Issue**:
    - **Frontend**: The UI allows users to "Submit" or "Save" valid activities directly. There are no distinct "Submit for Approval" vs "Save Draft" actions.
    - **Backend**: The API (`POST /collaboration-activity`) immediately creates the record in the database. There is no `status` field (e.g., `DRAFT`, `PENDING_APPROVAL`, `APPROVED`) to track progress.
- **Risk**:
    - **Data Integrity**: Any user (even students) can potentially create "Approved" activities if the API is exposed.
    - **Compliance**: Bypassing HOD/Dean sign-off is a major compliance risk.
    - **Confusion**: Unclear status of activities (Live vs Draft).
- **Solution**:
    - Add `status` (Enum) to `CollaborationActivity`.
    - Implement restricted `approve/reject` endpoints.
    - Update frontend to show different actions based on status.

### **File Upload Management**: "Orphaned" Files
- **Issue**: Files are uploaded immediately. If the user cancels the form, the file remains on the server.
- **Risk**: Storage bloat and potential security risk from unlinked files.
- **Solution**: Implement background cleanup tasks (cron) or link file persistence to record saving.

### **Partner University Duplication**
- **Issue**: No checks to prevent creating "Harvard" when "Harvard University" exists.
- **Risk**: Data fragmentation and inaccurate reporting.
- **Solution**: Implement fuzzy matching and duplicate detection on creation.

## 2. Frontend (React)

### **Critical: Missing Boilerplate Dependencies**
- **Issue**: The project relies on `ERPUtils`, `AppContext`, and `ApiGateway` which were initially missing and had to be mocked.
- **Risk**: Logic for notifications, API calls, and data validation will fail.
- **Solution**: Ensure all utility libraries are properly implemented and centralized.

### **High: Hardcoded Configuration**
- **Issue**: `ApiGateway.jsx` has `http://localhost:8000` hardcoded.
- **Risk**: Cannot deploy to production without code changes.
- **Solution**: Use environment variables (`import.meta.env.VITE_API_URL`).

### **Medium: Direct DOM Manipulation**
- **Issue**: Usage of `document.getElementById` inside React components.
- **Risk**: React synchronization bugs and potential crashes.
- **Solution**: Use React `refs`.

### **Medium: State Management**
- **Issue**: Heavy reliance on local `this.setState`.
- **Risk**: Unmanageable prop drilling as the app scales.
- **Solution**: Adopt Context API or a global state manager (Zustand/Redux).

## 3. Backend (FastAPI)

### **Critical: Mock Authentication**
- **Issue**: `dependencies.get_current_user` returns the **first user** in the database.
- **Risk**: **ZERO SECURITY.** All requests are treated as authorized by the first user (Admin).
- **Solution**: Implement JWT authentication or proper session integration.

### **High: Hardcoded Database Credentials**
- **Issue**: DB password hardcoded in `database.py`.
- **Risk**: Severe security vulnerability.
- **Solution**: Use `.env` files and `pydantic-settings`.

### **High: No Migration System**
- **Issue**: Reliance on `Base.metadata.create_all()` which cannot modify existing tables.
- **Risk**: Schema changes require manual SQL/DB deletion.
- **Solution**: Integrate **Alembic**.

### **Critical: Authorization Gaps (RBAC)**
- **Issue**: Inconsistent manual role checks (`if user.type != 'EMP_A'`).
- **Risk**: Privilege escalation; unauthorized users accessing admin data.
- **Solution**: Standardized `Permission` dependencies (e.g., `@require_role`).

### **Medium: Missing Validations**
- **Issue**: Lack of business logic validation (e.g., date ranges).
- **Risk**: Invalid data (negative rankings, end date < start date).
- **Solution**: Pydantic `@validator` methods.

## 4. Module Specific

### **Collaboration Activity Module**
- **Data Integrity**: Relies on external keys (`erp_dept_id`).
- **Risk**: Broken links if ERP data changes.
- **Solution**: Robust foreign key constraints or soft deletes.

### **Notification System**
- **Issue**: Relying on basic alerts/console logs.
- **Risk**: Poor UX; users don't know why actions fail.
- **Solution**: Implement structured error responses and a Toast notification system.
