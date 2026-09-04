"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/clientApp";

interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push("/signin");
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch projects once user is available
  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [project, ...prev]);
        setNewProjectName("");
        setShowModal(false);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project? All associated PDFs and chats will be lost.")) return;
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        alert("Failed to delete project.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/signin");
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: "24px", background: "rgba(255,255,255,0.8)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "#0c4a6e", fontSize: "15px", fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ───── Navbar ───── */}
      <header className="flex flex-wrap items-center justify-between px-4 sm:px-10 py-3 sm:py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 shadow-xs sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-4 sm:gap-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-[#0c4a6e] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-sky-500/30">I</div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0c4a6e] m-0 tracking-tight">InsightPDF</h1>
          </div>
          <nav className="flex gap-4 sm:gap-7 items-center">
            <a href="#" className="text-sm font-semibold text-sky-500">Dashboard</a>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Settings</a>
          </nav>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 bg-white rounded-full border border-slate-200/80 shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center font-bold text-xs">
              {(user?.displayName || user?.email || "U")[0].toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 max-w-[100px] sm:max-w-[160px] truncate">
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </span>
          </div>
          <button onClick={handleSignOut} className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 transition-all">
            Sign out
          </button>
        </div>
      </header>

      {/* ───── Main Content ───── */}
      <main className="flex-1 px-4 sm:px-10 py-8 sm:py-16">
        <div className="max-w-[1100px] mx-auto">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0c4a6e] m-0 tracking-tight">
                Your Projects
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Create a project, upload PDFs, and start chatting with your documents.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-sky-500 to-[#0c4a6e] rounded-xl shadow-lg shadow-sky-500/25 hover:-translate-y-0.5 transition-transform"
            >
              <span className="text-xl leading-none">+</span> New Project
            </button>
          </div>

          {/* Projects Grid */}
          {loadingProjects ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-sky-500/10 border-t-sky-500 rounded-full animate-spin mx-auto mb-5" />
              <p className="text-slate-500">Loading projects…</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 sm:py-24 px-6 bg-white/60 rounded-3xl border-2 border-dashed border-sky-500/20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl sm:text-4xl">📁</div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0c4a6e] mb-3">No projects yet</h3>
              <p className="text-sm sm:text-base text-slate-500 max-w-[400px] mx-auto mb-8">
                Create your first project to start uploading PDFs and chatting with them using AI.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3.5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-sky-500 to-[#0c4a6e] rounded-xl shadow-lg shadow-sky-500/25"
              >
                + Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="p-6 sm:p-8 bg-white/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/60 shadow-xs hover:shadow-lg hover:border-sky-500/30 hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[#0c4a6e] m-0">{project.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-slate-500 font-medium">Click to open →</span>
                  </div>
                </div>
              ))}

              {/* Add New Project Card */}
              <div
                onClick={() => setShowModal(true)}
                className="p-6 sm:p-8 bg-white/40 hover:bg-sky-50/80 rounded-2xl sm:rounded-3xl border-2 border-dashed border-sky-500/25 hover:border-sky-500 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] sm:min-h-[180px]"
              >
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl text-sky-500 font-bold leading-none">+</span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-sky-500 m-0">New Project</p>
              </div>
            </div>
          )}

          {/* ───── Feature Sections ───── */}
          <div className="w-full mt-16 sm:mt-28">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c4a6e] mb-3">Powerful features for everyone</h2>
              <p className="text-sm sm:text-base text-slate-500">Everything you need to master your PDF library.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 sm:mb-24">
              {[
                { icon: "🔍", title: "Deep Semantic Search", desc: "Our AI understands context and meaning, not just keywords." },
                { icon: "🔒", title: "Secure & Private", desc: "Your documents are encrypted and only accessible to you." },
                { icon: "📑", title: "Multi-file Analysis", desc: "Analyze up to 3 PDFs simultaneously per project." },
                { icon: "🌐", title: "Anywhere Access", desc: "Your indexed documents are stored in the cloud." },
                { icon: "⚡", title: "Instant Extraction", desc: "Get precise answers from complex tables and text in seconds." },
                { icon: "📊", title: "Summary Modes", desc: "Short, Detailed, Key Points, and Exam Mode summaries." },
              ].map((f, i) => (
                <div key={i} className="p-6 sm:p-8 bg-white/85 rounded-2xl border border-sky-500/10 shadow-2xs">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h4 className="text-base font-bold text-[#0c4a6e] mb-2">{f.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed m-0">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 sm:mb-20 bg-white p-6 sm:p-12 rounded-3xl border border-sky-500/10 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-sky-500 m-0 mb-1">99%</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase">Accuracy</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-sky-500 m-0 mb-1">2s</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase">Avg. Response</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-sky-500 m-0 mb-1">1k+</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase">PDFs Indexed</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ───── Create Project Modal ───── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => { setShowModal(false); setNewProjectName(""); }}
        >
          <div
            className="w-full max-w-[480px] p-6 sm:p-10 bg-white/95 rounded-3xl shadow-2xl border border-white/80 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0c4a6e] m-0">Create New Project</h3>
              <button
                onClick={() => { setShowModal(false); setNewProjectName(""); }}
                className="bg-transparent border-none text-2xl text-slate-400 cursor-pointer p-1"
              >×</button>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
              Give your project a name. You can upload PDFs and chat with them inside.
            </p>
            <input
              type="text"
              placeholder="e.g. Research Papers, Course Notes…"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
              autoFocus
              className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border border-slate-200 rounded-xl outline-none text-[#0c4a6e] bg-slate-50 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
            />
            <div className="flex gap-3 mt-7">
              <button
                onClick={() => { setShowModal(false); setNewProjectName(""); }}
                className="flex-1 py-3 text-xs sm:text-sm font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold text-white rounded-xl transition-all ${
                  !newProjectName.trim() || creating
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-sky-500 to-[#0c4a6e] shadow-md shadow-sky-500/30"
                }`}
              >
                {creating ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
