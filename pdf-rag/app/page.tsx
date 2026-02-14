"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { auth, storage } from "../firebase/clientApp";

interface UploadedFile {
  file: File;
  progress: number;
  url: string | null;
  status: "pending" | "uploading" | "done" | "error";
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [analysed, setAnalysed] = useState(false);
  const [analyseError, setAnalyseError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push("/signin");
    });
    return () => unsubscribe();
  }, [router]);

  const addFiles = (newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf"
    );
    if (pdfFiles.length === 0) return;

    const totalAfter = files.length + pdfFiles.length;
    if (totalAfter > 3) {
      alert("You can upload a maximum of 3 PDFs.");
      return;
    }

    const newEntries: UploadedFile[] = pdfFiles.map((f) => ({
      file: f,
      progress: 0,
      url: null,
      status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...newEntries]);
    setAnalysed(false);
    setAnalyseError("");

    // Upload each file
    newEntries.forEach((entry, idx) => {
      const startIdx = files.length + idx;
      const storageRef = ref(
        storage,
        `pdfs/${user?.uid}/${Date.now()}_${entry.file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, entry.file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setFiles((prev) =>
            prev.map((f, i) =>
              i === startIdx ? { ...f, progress, status: "uploading" } : f
            )
          );
        },
        (error) => {
          console.error("Firebase Storage upload error:", error);
          alert(`Upload failed: ${error.message}\n\nMake sure Firebase Storage is enabled and rules allow authenticated uploads.`);
          setFiles((prev) =>
            prev.map((f, i) =>
              i === startIdx ? { ...f, status: "error" } : f
            )
          );
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFiles((prev) =>
            prev.map((f, i) =>
              i === startIdx ? { ...f, url, progress: 100, status: "done" } : f
            )
          );
        }
      );
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setAnalysed(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const allUploaded =
    files.length > 0 && files.every((f) => f.status === "done");

  const handleAnalyse = async () => {
    if (!allUploaded) return;
    setAnalysing(true);
    setAnalyseError("");
    try {
      const urls = files.map((f) => f.url).filter(Boolean);
      const token = await user?.getIdToken();
      const res = await fetch("https://pineapple-backend-rag.onrender.com/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ pdf_urls: urls }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || "Analysis failed");
      }
      setAnalysed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
      setAnalyseError(msg);
    } finally {
      setAnalysing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/signin");
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <p style={{ color: "#999", fontSize: "14px" }}>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid #eee",
        }}
      >
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#111", margin: 0 }}>
          Pineapple
        </h1>
        <button
          onClick={handleSignOut}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#fff",
            backgroundColor: "#111",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
        >
          Sign out
        </button>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
          }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "#111",
                margin: "0 0 8px 0",
              }}
            >
              Chat with your PDFs
            </h2>
            <p style={{ fontSize: "15px", color: "#888", margin: 0 }}>
              Upload up to 3 PDF files, analyse them, and start chatting.
            </p>
          </div>

          {/* Info Cards */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
            <div className="info-card" style={{ flex: 1, padding: "16px", border: "1px solid #eee", borderRadius: "6px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#111", margin: "0 0 4px 0" }}>1. Upload</p>
              <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: "1.5" }}>Add up to 3 PDF files to get started.</p>
            </div>
            <div className="info-card" style={{ flex: 1, padding: "16px", border: "1px solid #eee", borderRadius: "6px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#111", margin: "0 0 4px 0" }}>2. Analyse</p>
              <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: "1.5" }}>We index your documents for smart search.</p>
            </div>
            <div className="info-card" style={{ flex: 1, padding: "16px", border: "1px solid #eee", borderRadius: "6px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#111", margin: "0 0 4px 0" }}>3. Chat</p>
              <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: "1.5" }}>Ask questions and get answers from your PDFs.</p>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => files.length < 3 && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#111" : "#d4d4d4"}`,
              borderRadius: "8px",
              padding: "40px 24px",
              textAlign: "center",
              cursor: files.length >= 3 ? "default" : "pointer",
              transition: "border-color 0.15s ease",
              marginBottom: "24px",
              backgroundColor: "#fafafa",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#bbb"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: "0 auto 12px" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: "14px", color: "#666", margin: "0 0 4px 0" }}>
              {files.length >= 3
                ? "Maximum 3 files reached"
                : "Drop PDFs here or click to browse"}
            </p>
            <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
              PDF files only · Max 3 files
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "6px",
                    border: "1px solid #eee",
                    marginBottom: "8px",
                    backgroundColor: "#fff",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#333",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.file.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: "2px 0 0 0" }}>
                      {f.status === "uploading"
                        ? `Uploading… ${f.progress}%`
                        : f.status === "done"
                          ? "Uploaded"
                          : f.status === "error"
                            ? "Upload failed"
                            : "Pending"}
                    </p>
                  </div>

                  {/* Progress bar */}
                  {f.status === "uploading" && (
                    <div
                      style={{
                        width: "60px",
                        height: "3px",
                        backgroundColor: "#eee",
                        borderRadius: "2px",
                        marginRight: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${f.progress}%`,
                          height: "100%",
                          backgroundColor: "#111",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  )}

                  {/* Check mark for done */}
                  {f.status === "done" && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "12px", flexShrink: 0 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ccc",
                      fontSize: "18px",
                      lineHeight: 1,
                      padding: "0 0 0 4px",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Analyse Button */}
          {files.length > 0 && !analysed && (
            <button
              onClick={handleAnalyse}
              disabled={!allUploaded || analysing}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: !allUploaded || analysing ? "#ccc" : "#111",
                border: "none",
                borderRadius: "6px",
                cursor: !allUploaded || analysing ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
                marginBottom: "12px",
              }}
            >
              {analysing ? "Analysing…" : "Analyse PDFs"}
            </button>
          )}

          {analyseError && (
            <p
              style={{
                fontSize: "13px",
                color: "#dc2626",
                textAlign: "center",
                margin: "0 0 12px 0",
              }}
            >
              {analyseError}
            </p>
          )}

          {/* Success + Start Chat */}
          {analysed && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#22c55e",
                  fontWeight: 500,
                  margin: "0 0 16px 0",
                }}
              >
                ✓ PDFs analysed successfully
              </p>
              <button
                onClick={() => router.push("/chat")}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor: "#111",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                }}
              >
                Start Chat →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
