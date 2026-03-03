from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import partner_router, activity_router, auth_router, mou_router
from backend.master_data_routers import master_data_router
from backend.database import Base, engine

# Create tables if they don't exist (optional, but good for local dev)
Base.metadata.create_all(bind=engine) 

app = FastAPI(title="OIA Project API")

# CORS Configuration - Allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # Frontend is now on port 5174
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(partner_router)
app.include_router(activity_router)
app.include_router(mou_router)
app.include_router(master_data_router)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to OIA Project API"}
