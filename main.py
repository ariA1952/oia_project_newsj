from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from backend.routers import partner_router, activity_router, auth_router, mou_router, general_router
from backend.master_data_routers import master_data_router
from backend.database import Base, engine

# Create tables if they don't exist (optional, but good for local dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OIA Project API")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

# CORS Configuration - Allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _cors_headers(request: Request) -> dict:
    """Return CORS headers matching the request's origin if it is in the allowed list."""
    origin = request.headers.get("origin", "")
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure CORS headers are present even on error responses (e.g. 401, 403).
    FastAPI's CORSMiddleware does not always add headers to responses raised
    via HTTPException, so we handle it explicitly here."""
    print("HTTPException:", exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers(request),
    )

'''@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print("Unhandled Exception:", str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=_cors_headers(request),
    )'''

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Same CORS fix for 422 validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=_cors_headers(request),
    )


app.include_router(partner_router)
app.include_router(activity_router)
app.include_router(mou_router)
app.include_router(master_data_router)
app.include_router(auth_router)
app.include_router(general_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to OIA Project API"}

