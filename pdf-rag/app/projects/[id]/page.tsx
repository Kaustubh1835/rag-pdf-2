"use client";

import { useEffect, useState, useRef, use } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { auth, storage } from "../../../firebase/clientApp";

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface ProjectData {
  id: string;
  name: string;
  documents: Document[];
}

interface UploadingFile {
  file: File;
  progress: number;
  url: string | null;
  status: "pending" | "uploading" | "done" | "error";
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [files, setFiles] = useState<UploadingFile[]>([]);
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

  // Fetch project details + documents
  useEffect(() => {
    if (!user) return;
    fetchProject();
  }, [user, projectId]);

  const fetchProject = async () => {
    setLoadingProject(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
    } finally {
      setLoadingProject(false);
    }
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    if (pdfFiles.length === 0) return;

    const existingDocs = project?.documents?.length || 0;
    const totalAfter = existingDocs + files.length + pdfFiles.length;
    if (totalAfter > 3) {
      alert("You can upload a maximum of 3 PDFs per project.");
      return;
    }

    const newEntries: UploadingFile[] = pdfFiles.map((f) => ({
      file: f, progress: 0, url: null, status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...newEntries]);
    setAnalysed(false);
    setAnalyseError("");

    newEntries.forEach((entry, idx) => {
      const startIdx = files.length + idx;
      const storageRef = ref(storage, `pdfs/${user?.uid}/${projectId}/${Date.now()}_${entry.file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, entry.file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setFiles((prev) => prev.map((f, i) => (i === startIdx ? { ...f, progress, status: "uploading" } : f)));
        },
        (error) => {
          console.error("Upload error:", error);
          setFiles((prev) => prev.map((f, i) => (i === startIdx ? { ...f, status: "error" } : f)));
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFiles((prev) => prev.map((f, i) => (i === startIdx ? { ...f, url, progress: 100, status: "done" } : f)));

          // Save document record to Neon DB
          try {
            const token = await user?.getIdToken();
            await fetch("/api/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ projectId, fileName: entry.file.name, fileUrl: url }),
            });
          } catch (err) {
            console.error("Failed to save doc record:", err);
          }
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

  const allUploaded = files.length > 0 && files.every((f) => f.status === "done");

  const handleAnalyse = async () => {
    if (!allUploaded) return;
    setAnalysing(true);
    setAnalyseError("");
    try {
      const urls = files.map((f) => f.url).filter(Boolean);
      const token = await user?.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pdf_urls: urls, project_id: projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || "Analysis failed");
      }
      setAnalysed(true);
      // Refresh project to show new docs
      fetchProject();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
      setAnalyseError(msg);
    } finally {
      setAnalysing(false);
    }
  };

  if (authLoading || loadingProject) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: "24px", background: "rgba(255,255,255,0.8)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "#0c4a6e", fontSize: "15px", fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user || !project) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ───── Navbar ───── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#475569", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
            ← Back
          </button>
          <div style={{ height: "24px", width: "1px", background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "14px" }}>I</div>
            <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#0c4a6e", margin: 0 }}>{project.name}</h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{project.documents.length} document{project.documents.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      {/* ───── Main ───── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px 100px" }}>
        <div style={{ width: "100%", maxWidth: "800px" }}>
          {/* Info Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "48px" }}>
            <div style={{ padding: "24px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ width: "40px", height: "40px", background: "#f0f9ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "20px" }}>📤</div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#0c4a6e", margin: "0 0 8px 0" }}>Upload</p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>Add up to 3 PDF documents.</p>
            </div>
            <div
              onClick={() => { if (analysed || project.documents.length > 0) router.push(`/projects/${projectId}/summarize`); }}
              style={{ cursor: analysed || project.documents.length > 0 ? "pointer" : "default", padding: "24px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{ width: "40px", height: "40px", background: "#f0f9ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "20px" }}>⚡</div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#0c4a6e", margin: "0 0 8px 0" }}>Summarize</p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>Instant summaries in 4 modes.</p>
            </div>
            <div style={{ padding: "24px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ width: "40px", height: "40px", background: "#f0f9ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "20px" }}>💬</div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#0c4a6e", margin: "0 0 8px 0" }}>Chat</p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>Ask questions in plain English.</p>
            </div>
          </div>

          {/* Upload Area Card */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(30px)", borderRadius: "32px", padding: "48px", boxShadow: "0 20px 60px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.6)" }}>

            {/* Existing Documents */}
            {project.documents.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0c4a6e", marginBottom: "16px" }}>Uploaded Documents</h3>
                {project.documents.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", background: "rgba(240,249,255,0.6)", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "12px", marginBottom: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>📄</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#0c4a6e", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${projectId}/chat`);
                        }}
                        style={{
                          background: "#0ea5e9",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0284c7"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0ea5e9"}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Chat
                      </button>
                      <span style={{ padding: "4px 10px", background: "#ecfdf5", color: "#059669", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>Saved</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Zone */}
            <div
              style={{
                border: `2px dashed ${dragOver ? "#0ea5e9" : "rgba(14,165,233,0.3)"}`,
                borderRadius: "16px", padding: "40px 20px", textAlign: "center",
                backgroundColor: dragOver ? "rgba(14,165,233,0.05)" : "rgba(255,255,255,0.5)",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" multiple accept="application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} />
              <p style={{ color: "#0c4a6e", fontWeight: 600, fontSize: "15px", margin: "0 0 8px 0" }}>Click or drag PDFs here</p>
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>PDF files only · Max 3 files per project</p>
            </div>

            {/* Uploading Files */}
            {files.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                {files.map((f, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", overflow: "hidden" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>📄</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "#333", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</p>
                        <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                          {f.status === "uploading" ? `Uploading… ${f.progress}%` : f.status === "done" ? "Uploaded ✓" : f.status === "error" ? "Failed" : "Pending"}
                        </p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "18px", padding: "8px" }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Analyse Button */}
            {files.length > 0 && !analysed && (
              <button
                onClick={() => { if (allUploaded && !analysing) handleAnalyse(); }}
                disabled={!allUploaded || analysing}
                style={{
                  width: "100%", padding: "16px", fontSize: "16px", fontWeight: 600, color: "#fff",
                  backgroundColor: !allUploaded || analysing ? "#cbd5e1" : "#0c4a6e",
                  border: "none", borderRadius: "12px",
                  cursor: !allUploaded || analysing ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease", marginTop: "24px",
                  boxShadow: !allUploaded || analysing ? "none" : "0 4px 14px rgba(12,74,110,0.3)",
                }}
              >
                {analysing ? "Analysing…" : "Analyse PDFs"}
              </button>
            )}

            {/* Success + Navigate */}
            {analysed && (
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <p style={{ fontSize: "14px", color: "#10b981", fontWeight: 500, margin: "0 0 16px 0" }}>✓ PDFs analysed successfully</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => router.push(`/projects/${projectId}/chat`)} style={{ padding: "16px", backgroundColor: "#0c4a6e", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(12,74,110,0.3)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#073b5a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0c4a6e")}>
                    Start Chat
                  </button>
                  <button onClick={() => router.push(`/projects/${projectId}/summarize`)} style={{ padding: "16px", backgroundColor: "white", color: "#0c4a6e", border: "1.5px solid #0c4a6e", borderRadius: "12px", fontSize: "16px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}>
                    Summarize
                  </button>
                </div>
              </div>
            )}

            {analyseError && (
              <div style={{ padding: "14px", backgroundColor: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "12px", color: "#dc2626", fontSize: "14px", textAlign: "center", marginTop: "16px" }}>
                {analyseError}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
