from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from services.rag_index import analyse_pdf
from services.rag_chat import chat_with_pdf

app = FastAPI()

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pdf-rag-plum.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class AnalyseRequest(BaseModel):
    pdf_urls: List[str]

class ChatRequest(BaseModel):
    query: str


# 1️⃣ Health Route
@app.get("/health")
def health_check():
    return {"status": "Backend is running 🚀"}


# 2️⃣ Analyse Route
@app.post("/analyse")
def analyse(request: AnalyseRequest):
    try:
        analyse_pdf(request.pdf_urls)
        return {"message": "PDF Indexed Successfully ✅"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"message": f"Analysis failed: {str(e)}"}


# 3️⃣ Chat Route
@app.post("/chat")
def start_chat(request: ChatRequest):
    response = chat_with_pdf(request.query)
    return {"answer": response}
