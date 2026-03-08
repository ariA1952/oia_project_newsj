Design and implement a **modern, high-quality frontend interface** for the **OIA Collaboration Management System (International Office Web Application)**. The system supports **six modules** and must fully align with the backend APIs, database structure, and the defined **Role Based Access Control (RBAC)** rules.

The interface must be **visually appealing, smooth, and responsive**, with a professional university administration dashboard style.

---

### Global System Behavior

The system has **three user roles**:

* **FACULTY** – Faculty members who create and submit collaboration activities
* **HOD** – Heads of Department who review departmental activities
* **OIA_ADMIN** – International Office administrators with global access

The UI must **dynamically adjust available actions and visible modules depending on the logged-in user role**.

Resource visibility must follow these rules:

* **FACULTY:** can only see activities they created and their documents.
* **HOD:** can see activities within their department.
* **OIA_ADMIN:** can access all activities and documents.

Filters across modules must automatically apply:

* **Academic Year → auto selected**
* **Quarter → auto selected**
* **Campus → default set to "Central Campus"**

---

### 1. Dashboard Module

Redesign the dashboard for clarity and visibility.

Requirements:

* Remove the **large white header section at the top**.
* The dashboard should **not require vertical scrolling**.
* All **summary data cards must be visible in the viewport**.

The cards should dynamically fetch data from the backend database.

Display the following cards:

* Total mous
* Total Approved
* Total Publication
* Total Faculty Exchange
* Total Student Exchange
* Total Conference
* Total Joint Research
* Total Rejected
When clicked on the card showed acquire that data from database as it is already implemented in frontend.

Each card must include:

* icon
* numeric metric
* subtle hover animation
* color-coded status indicators

Data shown should respect **role visibility scope**.

Example:

* Faculty sees **only their activity counts**
* HOD sees **department activity counts**
* OIA_ADMIN sees **global activity counts**

---

### 2. Data Entry Module (FACULTY + OIA_ADMIN)

This module allows users to create and manage collaboration activities.

Requirements:

Add a **main parameter selection box** containing the **14 collaboration parameters**.

Features:

* Dropdown showing all parameters
* User selects a parameter
* Corresponding data entry form dynamically appears

Additional functionality:

* Provide a **search bar to quickly find parameters**
* Forms must align exactly with backend data models
* Fields should be clearly grouped and structured

Document Handling:

* Users must be able to **upload supporting documents**
* Uploaded documents must be **stored via backend API**
* Documents should be **viewable from the interface**

Activity Status Behavior:

* Users can **save activities as DRAFT**
* Users can **submit activities**
* Editing is allowed only when status is:

  * DRAFT
  * CLARIFICATION_REQUESTED

---

### 3. Review Module (HOD / OIA_ADMIN)

Create a **review dashboard where submitted activities appear in a structured table format**.

Table columns:

Title
Value
University
Duration
Status
Processed By

Each row must contain **action buttons** depending on permissions:

Available actions:

Approve
Reject
Request Clarification

Actions must only be available when:

Status = **SUBMITTED**

Add confirmation prompts before approval or rejection.

Status updates must be reflected immediately in the interface.

---

### 4. Faculty Review Module

Faculty users must be able to **track their submitted activities**.

Display data in a **clean tabular layout** with status indicators.

Faculty should be able to view activities categorized by:

* Submitted
* Approved
* Rejected

Each row should display:

Title
Value
University
Duration
Status

Color coding:

* Approved → green
* Rejected → red
* Submitted → yellow

---

### 5. Clarification Chat System

When an activity receives **CLARIFICATION_REQUESTED**, a clarification chat interface should be available.

Features:

* Chat thread attached to each activity
* Messages displayed in chronological order
* Input field for replies

Permissions:

* **HOD / OIA_ADMIN** can initiate clarification
* **FACULTY** can reply for their own activities
* All involved roles can view the clarification chat

The chat should visually resemble a **modern messaging interface**.

---

### 6. Partner Universities Module (OIA_ADMIN Only)

Admin users can manage partner universities.

Features:

* List view of partner universities
* Detailed view page

Permissions:

* Only **OIA_ADMIN can create new partner universities**
* Other roles can **view partner universities**

Editing and deleting universities should **not be implemented**.

---

### 7. MOU Module

Features:

* List of MOUs
* MOU details view
* Document download

Permissions:

* Only **OIA_ADMIN can create MOU records**
* All users can view MOUs
* Document download requires authentication

Updating MOUs should **not be implemented yet**.

---

### 8. UI / UX Design Requirements

The interface must feel like a **modern enterprise dashboard used in university administration systems**.

Key design goals:

* smooth interactions
* minimal scrolling
* card-based dashboards
* clean data tables with sorting and pagination
* clear visual hierarchy
* subtle animations and transitions

The final design should be **highly polished, intuitive, and visually engaging**, while remaining fully aligned with backend APIs and RBAC rules.
  Note: Do not change the backend code, only implement the frontend. If backend code needs to be changed, then ask for permission and provide the reason for the change.