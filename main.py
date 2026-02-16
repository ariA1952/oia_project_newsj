from fastapi import FastAPI
from backend.routers import partner_router, activity_router
from backend.database import Base, engine

# Create tables if they don't exist (optional, but good for local dev)
# Base.metadata.create_all(bind=engine) 

app = FastAPI(title="OIA Project API")

app.include_router(partner_router)
app.include_router(activity_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to OIA Project API"}
