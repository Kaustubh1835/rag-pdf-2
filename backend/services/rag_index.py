import os
import tempfile
import requests
from dotenv import load_dotenv
from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

load_dotenv()

from qdrant_client import QdrantClient

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)


def analyse_pdf(pdf_urls: List[str], project_id: str):
    all_docs = []

    for url in pdf_urls:
        # Download PDF from Firebase Storage URL
        print(f"Downloading PDF from: {url[:80]}...")
        response = requests.get(url)
        response.raise_for_status()

        # Save to a temp file (close it first so PyPDFLoader can read on Windows)
        tmp_path = os.path.join(tempfile.gettempdir(), f"rag_pdf_{os.getpid()}_{id(url)}.pdf")
        with open(tmp_path, "wb") as f:
            f.write(response.content)

        print(f"Saved temp PDF: {tmp_path} ({len(response.content)} bytes)")

        loader = PyPDFLoader(file_path=tmp_path)
        docs = loader.load()
        all_docs.extend(docs)
        print(f"Loaded {len(docs)} pages from PDF")

    print(f"Total pages across all PDFs: {len(all_docs)}")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=400
    )

    split_docs = text_splitter.split_documents(all_docs)
    print(f"Split into {len(split_docs)} chunks")

    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-large"
    )

    collection_name = f"project_{project_id}"
    print(f"Indexing into Qdrant collection: {collection_name}")
    QdrantVectorStore.from_documents(
    documents=split_docs,
    embedding=embedding_model,
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    collection_name=collection_name
)


    # Clean up temp files
    for url in pdf_urls:
        tmp_path = os.path.join(tempfile.gettempdir(), f"rag_pdf_{os.getpid()}_{id(url)}.pdf")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    print("Indexing Done")
