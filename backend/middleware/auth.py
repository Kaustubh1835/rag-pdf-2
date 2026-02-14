import time
import os
import json
from collections import defaultdict
from fastapi import Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# Firebase Admin SDK Init
# ──────────────────────────────────────────────
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

if not firebase_admin._apps:
    cred = None

    # Option 1: Local JSON file (for development)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
    sa_path = os.path.join(base_dir, "firebase-service-account.json")

    if os.path.exists(sa_path):
        cred = credentials.Certificate(sa_path)
        print(f"🔐 Firebase Admin: loaded from local file")

    # Option 2: ENV variable with full JSON (for Render / production)
    elif os.getenv("FIREBASE_SERVICE_ACCOUNT"):
        sa_dict = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT"))
        cred = credentials.Certificate(sa_dict)
        print(f"🔐 Firebase Admin: loaded from FIREBASE_SERVICE_ACCOUNT env var")

    else:
        print("⚠️ Firebase Admin: no credentials found!")

    firebase_admin.initialize_app(cred, {"projectId": "pdf-rag-883ef"})
    print("🔐 Firebase Admin initialized")


# ──────────────────────────────────────────────
# Auth Dependency — verifies Firebase ID token
# ──────────────────────────────────────────────
async def verify_firebase_token(request: Request) -> dict:
    """Extract and verify Firebase ID token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        print("❌ Auth: Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split("Bearer ")[1]

    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=False)
        print(f"✅ Auth: verified user {decoded.get('email', decoded['uid'])}")
        return decoded
    except Exception as e:
        print(f"❌ Auth: Token verification failed — {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")


# ──────────────────────────────────────────────
# Rate Limiter — max N requests per window
# ──────────────────────────────────────────────
class RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def check(self, user_id: str):
        now = time.time()
        self.requests[user_id] = [
            t for t in self.requests[user_id]
            if now - t < self.window_seconds
        ]
        if len(self.requests[user_id]) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds} seconds."
            )
        self.requests[user_id].append(now)


# Single instance shared across routes
rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
