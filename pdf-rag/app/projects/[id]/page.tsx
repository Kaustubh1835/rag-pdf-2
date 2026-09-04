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
    <div className="min-h-screen flex flex-col">
      {/* ───── Navbar ───── */}
      <header className="flex flex-wrap items-center justify-between px-4 sm:px-10 py-3 sm:py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 shadow-xs sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 bg-transparent border border-slate-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            ← Back
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-[#0c4a6e] rounded-lg flex items-center justify-center text-white font-bold text-sm">I</div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#0c4a6e] m-0 max-w-[180px] sm:max-w-none truncate">{project.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm text-slate-500 font-medium">{project.documents.length} document{project.documents.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      {/* ───── Main ───── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-16 pb-24">
        <div className="w-full max-w-[800px]">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="p-5 sm:p-6 bg-white/85 border border-sky-500/10 rounded-2xl shadow-2xs">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center mb-4 text-xl">📤</div>
              <p className="text-base font-bold text-[#0c4a6e] m-0 mb-1">Upload</p>
              <p className="text-xs sm:text-sm text-slate-500 m-0 leading-relaxed">Add up to 3 PDF documents.</p>
            </div>
            <div
              onClick={() => { if (analysed || project.documents.length > 0) router.push(`/projects/${projectId}/summarize`); }}
              className={`p-5 sm:p-6 bg-white/85 border border-sky-500/10 rounded-2xl shadow-2xs transition-all ${
                analysed || project.documents.length > 0 ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"
              }`}
            >
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center mb-4 text-xl">⚡</div>
              <p className="text-base font-bold text-[#0c4a6e] m-0 mb-1">Summarize</p>
              <p className="text-xs sm:text-sm text-slate-500 m-0 leading-relaxed">Instant summaries in 4 modes.</p>
            </div>
            <div className="p-5 sm:p-6 bg-white/85 border border-sky-500/10 rounded-2xl shadow-2xs">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center mb-4 text-xl">💬</div>
              <p className="text-base font-bold text-[#0c4a6e] m-0 mb-1">Chat</p>
              <p className="text-xs sm:text-sm text-slate-500 m-0 leading-relaxed">Ask questions in plain English.</p>
            </div>
          </div>

          {/* Upload Area Card */}
          <div className="bg-white/85 backdrop-blur-2xl rounded-3xl p-5 sm:p-10 md:p-12 shadow-xl border border-white/60">

            {/* Existing Documents */}
            {project.documents.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm sm:text-base font-bold text-[#0c4a6e] mb-4">Uploaded Documents</h3>
                {project.documents.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-sky-50/60 border border-sky-500/10 rounded-xl mb-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center text-base shrink-0">📄</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-[#0c4a6e] m-0 truncate">{doc.fileName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${projectId}/chat`);
                        }}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Chat
                      </button>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[11px] font-semibold">Saved</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Zone */}
            <div
              className={`border-2 border-dashed rounded-2xl py-8 sm:py-10 px-4 text-center cursor-pointer transition-all ${
                dragOver ? "border-sky-500 bg-sky-500/5" : "border-sky-500/30 bg-white/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" multiple accept="application/pdf" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} />
              <p className="text-[#0c4a6e] font-semibold text-sm sm:text-base mb-1">Click or drag PDFs here</p>
              <p className="text-slate-500 text-xs">PDF files only · Max 3 files per project</p>
            </div>

            {/* Uploading Files */}
            {files.length > 0 && (
              <div className="mt-6">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 sm:p-4 bg-white/80 border border-sky-500/15 rounded-xl mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 text-lg">📄</div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-800 m-0 truncate">{f.file.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {f.status === "uploading" ? `Uploading… ${f.progress}%` : f.status === "done" ? "Uploaded ✓" : f.status === "error" ? "Failed" : "Pending"}
                        </p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="bg-transparent border-none cursor-pointer text-slate-400 text-lg p-2 hover:text-slate-600">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Analyse Button */}
            {files.length > 0 && !analysed && (
              <button
                onClick={() => { if (allUploaded && !analysing) handleAnalyse(); }}
                disabled={!allUploaded || analysing}
                className={`w-full py-4 text-sm sm:text-base font-semibold text-white rounded-xl transition-all mt-6 ${
                  !allUploaded || analysing
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-[#0c4a6e] hover:bg-[#073b5a] shadow-md shadow-[#0c4a6e]/30"
                }`}
              >
                {analysing ? "Analysing…" : "Analyse PDFs"}
              </button>
            )}

            {/* Success + Navigate */}
            {analysed && (
              <div className="text-center mt-6">
                <p className="text-xs sm:text-sm text-emerald-500 font-medium mb-4">✓ PDFs analysed successfully</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => router.push(`/projects/${projectId}/chat`)} className="w-full py-4 bg-[#0c4a6e] hover:bg-[#073b5a] text-white rounded-xl text-sm sm:text-base font-semibold shadow-md shadow-[#0c4a6e]/30 transition-all">
                    Start Chat
                  </button>
                  <button onClick={() => router.push(`/projects/${projectId}/summarize`)} className="w-full py-4 bg-white hover:bg-sky-50 text-[#0c4a6e] border-2 border-[#0c4a6e] rounded-xl text-sm sm:text-base font-semibold transition-all">
                    Summarize
                  </button>
                </div>
              </div>
            )}

            {analyseError && (
              <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl text-red-600 text-xs sm:text-sm text-center mt-4">
                {analyseError}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
