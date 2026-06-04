# OIA Project - Frontend Documentation Guide

This document provides a detailed breakdown of the frontend directory structure for the Office of International Affairs (OIA) project.

## 📂 Root Directory (frontend/)
The root contains the build configuration and project-wide settings.

- **`.gitignore`**: Specifies which files and folders (like `node_modules`) should be ignored by Git.
- **`README.md`**: Initial documentation for the frontend project.
- **`eslint.config.js` / `eslint.json`**: Linting rules to ensure code quality and consistency.
- **`index.html`**: The entry point for the web application.
- **`package.json`**: Defines dependencies, scripts (dev, build, lint), and project metadata.
- **`vite.config.js`**: Configuration for the Vite build tool, including plugins and server settings.

---

## 📂 Source Code (frontend/src/)

### Core Files
- **`main.jsx`**: The React entry point that renders the `App` component into the DOM.
- **`App.jsx`**: The main application component. It handles global routing, layouts, and wraps the app in the `AuthProvider`.
- **`App.css` / `index.css`**: Global styles and layout constraints.

### 📁 common/ (Shared Utilities & Components)
Components used across multiple modules.

- **`ActionButton.jsx`**: Standardized button component used for consistent UI actions.
- **`AuthContext.jsx`**: Manages the authentication state (JWT tokens, user roles) and handles both Local and Keycloak login logic.
- **`ErrorBoundary.jsx`**: Catches JavaScript errors anywhere in the child component tree to prevent app crashes.
- **`FileUpload.jsx`**: A complex component for managing file uploads, previews, and deletions.
- **`Loader.jsx` / `Notification.jsx`**: UI feedback components for loading states and toast messages.
- **`ProtectedRoute.jsx`**: A wrapper component that redirects unauthenticated users to the login page.
- **`UploadViewPopup.jsx`**: The modal interface for the file upload system.

---

## 📁 modules/ (Feature-Specific Logic)

### 📁 auth/ (Authentication Module)
- **`pages/LoginPage.jsx`**: The standalone login screen supporting username/password entry.
- **`pages/Login.css`**: Styles specifically for the login experience.

### 📁 metrics/ (Core Business Logic)
The heart of the application, managing data entry, review, and reporting.

#### 📄 pages/
- **`Dashboard.jsx`**: Visual overview of activities, trends, and university partnerships.
- **`DataEntry.jsx`**: The interface for faculty to submit new collaboration data, exchange student records, etc.
- **`Review.jsx`**: The admin/HOD interface for approving or rejecting activities.
- **`Reports.jsx`**: Advanced filtering and exporting of collaboration data.
- **`Partners.jsx`**: Management of the list of Partner Universities.
- **`MOU.jsx`**: Tracking and managing Memorandum of Understanding documents.

#### 📄 components/
Contains smaller UI pieces specific to the metrics module, such as:
- **`FilterBar.jsx`**: The search and filter interface for lists.
- **`ParameterRow.jsx`**: Individual metric entry fields.
- **`SuggestUniversityModal.jsx`**: Interface for faculty to suggest new partners.

#### 📄 services/
- **`metricsService.js`**: The API abstraction layer. All requests to the backend (FastAPI) are centralized here using Axios.
