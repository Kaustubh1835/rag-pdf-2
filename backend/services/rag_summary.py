import os
from typing import List, Optional
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)

# Mock database/cache for summaries (In production, use Redis or Postgres)
SUMMARY_CACHE = {}

def get_all_chunks(collection_name: str) -> List[str]:
    """Retrieve all document chunks from the vector database."""
    # Note: This is an expensive operation for very large collections.
    # In a multi-tenant app, we should filter by metadata like document_id or user_id.
    chunks = []
    offset = None
    
    while True:
        response, next_offset = qdrant_client.scroll(
            collection_name=collection_name,
            limit=100,
            offset=offset,
            with_payload=True
        )
        for record in response:
            chunks.append(record.payload.get("page_content", ""))
        
        offset = next_offset
        if offset is None:
            break
            
    return chunks

def summarize_chunk(chunk: str, style: str) -> str:
    """Summarize a single chunk of text."""
    # Use a simpler prompt for faster processing
    prompt = f"Summarize this text for a {style} report:\n\n{chunk}"
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Flash model - much faster and smarter than 3.5
        messages=[
            {"role": "system", "content": "You are a fast and accurate summarizer."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200
    )
    return response.choices[0].message.content

def aggregate_summaries(summaries: List[str], style: str) -> List[str]:
    """Combine multiple chunk summaries into a final structured summary."""
    combined_text = "\n\n".join(summaries)
    
    style_prompts = {
        "short": "5 concise bullet points. Return as a JSON list of strings.",
        "detailed": "A comprehensive, high-quality detailed summary written in 2-3 structured paragraphs. Return this as a JSON list containing each paragraph as a separate string element.",
        "key_points": "Most important insights. Return as a JSON list of strings.",
        "exam_mode": "Definitions and potential questions. Return as a JSON list of strings."
    }
    
    prompt = f"""
    Create a {style} summary from these parts:
    {combined_text}
    
    Instruction: {style_prompts.get(style)}
    Return ONLY a JSON list of strings. No extra text.
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini", # Flash model
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    # Simple extraction (in production use structured output/pydantic)
    content = response.choices[0].message.content
    # Fallback if AI doesn't return exactly a list
    if "[" in content and "]" in content:
        try:
            import json
            return json.loads(content[content.find("["):content.rfind("]")+1])
        except:
            return [p.strip() for p in content.split("\n") if p.strip()]
    return [p.strip() for p in content.split("\n") if p.strip()]

def summarize_chunks_parallel(chunks: List[str], style: str) -> List[str]:
    """Summarize chunks in parallel for better performance."""
    from concurrent.futures import ThreadPoolExecutor
    
    # Process only a subset for speed if needed, but here we parallelize
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(summarize_chunk, chunk, style) for chunk in chunks]
        results = [f.result() for f in futures]
    return results

def get_pdf_summary(user_id: str, document_id: str, summary_type: str = "short", project_id: str = ""):
    """Main function to handle summarization with caching."""
    cache_key = f"{user_id}_{document_id}_{summary_type}"
    
    if cache_key in SUMMARY_CACHE:
        print(f"Returning cached summary for {cache_key}")
        return SUMMARY_CACHE[cache_key]
    
    print(f"Generating new {summary_type} summary for {document_id} in project {project_id}")
    
    # 1. Get all chunks (limit search for speed)
    collection_name = f"project_{project_id}" if project_id else "learning_vectors"
    chunks = get_all_chunks(collection_name)
    
    if not chunks:
        return {"summary": ["No content found to summarize."]}

    # 2. Summarize chunks in parallel (Faster than loop)
    # limit to first 10 chunks for rapid speed
    target_chunks = chunks[:10] 
    chunk_summaries = summarize_chunks_parallel(target_chunks, summary_type)
        
    # 3. Aggregate
    final_summary = aggregate_summaries(chunk_summaries, summary_type)
    
    # Optional: Log the fact that gpt-3.5 and parallel processing was used
    print(f"Summary generated successfully for {document_id}")
    result = {
        "document_id": document_id,
        "summary_type": summary_type,
        "summary": final_summary,
        "timestamp": "2024-04-24T12:00:00Z"
    }
    SUMMARY_CACHE[cache_key] = result
    
    return result
