import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK (server-side only)
if (!getApps().length) {
  // In production, use a service account JSON or GOOGLE_APPLICATION_CREDENTIALS.
  // For local dev, we use the project ID and let the Admin SDK verify tokens
  // against Firebase's public keys (no service account needed for token verification).
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminAuth = getAuth();

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded token (contains uid, email, etc.) or null.
 */
export async function verifyToken(
  request: Request
): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
