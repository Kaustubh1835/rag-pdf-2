from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from services.rag_index import analyse_pdf
from services.rag_chat import chat_with_pdf
from services.rag_summary import get_pdf_summary
from middleware.auth import verify_firebase_token, rate_limiter
import traceback

app = FastAPI()

# CORS — allow Next.js frontend (production + local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rag-pdf-2.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — ensures CORS headers are always present on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


# Request Models
class AnalyseRequest(BaseModel):
    pdf_urls: List[str]
    project_id: str

class ChatRequest(BaseModel):
    query: str
    project_id: str

class SummarizeRequest(BaseModel):
    document_id: str
    summary_type: str = "short"  # short, detailed, key_points, exam_mode
    project_id: str


# 1️⃣ Health Route (no auth needed)
@app.get("/health")
def health_check():
    return {"status": "Backend is running"}


# 2️⃣ Analyse Route (auth + rate limited)
@app.post("/analyse")
def analyse(request: AnalyseRequest, user: dict = Depends(verify_firebase_token)):
    rate_limiter.check(user["uid"])
    try:
        analyse_pdf(request.pdf_urls, request.project_id)
        return {"message": "PDF Indexed Successfully"}
    except Exception as e:
        traceback.print_exc()
        return {"message": f"Analysis failed: {str(e)}"}


# 3️⃣ Chat Route (auth + rate limited)
@app.post("/chat")
def start_chat(request: ChatRequest, user: dict = Depends(verify_firebase_token)):
    rate_limiter.check(user["uid"])
    try:
        response = chat_with_pdf(request.query, request.project_id)
        return {"answer": response}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Chat error: {str(e)}"}
        )


# 4️⃣ Summarize Route (auth + rate limited)
@app.post("/summarize")
def summarize_document(request: SummarizeRequest, user: dict = Depends(verify_firebase_token)):
    rate_limiter.check(user["uid"])
    try:
        summary_data = get_pdf_summary(
            user_id=user["uid"],
            document_id=request.document_id,
            summary_type=request.summary_type,
            project_id=request.project_id
        )
        return summary_data
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Summarization failed: {str(e)}"}
        )
