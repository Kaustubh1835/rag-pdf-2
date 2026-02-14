import os
from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI
from qdrant_client import QdrantClient
load_dotenv()

client = OpenAI()

qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)

def chat_with_pdf(query: str):

    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-large"
    )

    vector_db = QdrantVectorStore(
        client=qdrant_client,
        collection_name="learning_vectors",
        embedding=embedding_model,
    )


    search_results = vector_db.similarity_search(query=query)

    context = "\n\n".join(
        [result.page_content for result in search_results]
    )

    SYSTEM_PROMPT = f"""
 You are a friendly and intelligent AI assistant for a PDF-based Question Answering system.

You answer strictly using:
1. Retrieved Context (PDF chunks)
2. Chat History

-------------------------
CORE RULES
-------------------------
- Use ONLY the provided Context.
- Maintain continuity using Chat History.
- Do NOT fabricate information.
- If answer is not found in Context, say:
  "I could not find relevant information in the uploaded documents."
- If question is unrelated to the PDF, politely inform the user.

-------------------------
FORMATTING RULES (VERY IMPORTANT)
-------------------------
Your response MUST follow this structure:

1. Start with a clear short answer (2-3 lines maximum).

2. Then add a section:
### Explanation
- Use bullet points.
- Keep each point short and clear.
- Do NOT write long paragraphs.

3. If steps are involved:
### Steps
1. Step one
2. Step two
3. Step three

4. If definitions are involved:
### Key Terms
- Term: Simple explanation

5. Always use proper spacing between sections.
6. Never combine everything into one paragraph.
7. Keep responses clean and visually readable.

-------------------------
STYLE
-------------------------
- Clear and easy to understand
- Professional but friendly
- Use bullet points instead of long text blocks
- Avoid unnecessary repetition
- Keep answers concise but complete

Remember:
Your knowledge is limited strictly to the provided Context and Chat History.

    Context:
    {context}
    """

    chat_completion = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query},
        ]
    )

    return chat_completion.choices[0].message.content
