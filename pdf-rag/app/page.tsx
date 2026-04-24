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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ───── Navbar ───── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "18px", boxShadow: "0 4px 10px rgba(14,165,233,0.3)" }}>I</div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0c4a6e", margin: 0, letterSpacing: "-0.5px" }}>InsightPDF</h1>
          </div>
          <nav style={{ display: "flex", gap: "28px", alignItems: "center" }}>
            <a href="#" style={{ fontSize: "15px", fontWeight: 600, color: "#0ea5e9", textDecoration: "none" }}>Dashboard</a>
            <a href="#" style={{ fontSize: "15px", fontWeight: 500, color: "#64748b", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Settings</a>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 16px", background: "white", borderRadius: "30px", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e0f2fe", color: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px" }}>
              {(user?.displayName || user?.email || "U")[0].toUpperCase()}
            </div>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </span>
          </div>
          <button onClick={handleSignOut} style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", transition: "all 0.2s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#0f172a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#64748b"; }}>
            Sign out
          </button>
        </div>
      </header>

      {/* ───── Main Content ───── */}
      <main style={{ flex: 1, padding: "60px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px" }}>
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#0c4a6e", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                Your Projects
              </h2>
              <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
                Create a project, upload PDFs, and start chatting with your documents.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 28px", fontSize: "15px", fontWeight: 700,
                color: "white", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)",
                border: "none", borderRadius: "14px", cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                boxShadow: "0 6px 20px rgba(14,165,233,0.25)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(14,165,233,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(14,165,233,0.25)"; }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>+</span> New Project
            </button>
          </div>

          {/* Projects Grid */}
          {loadingProjects ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: "40px", height: "40px", border: "4px solid rgba(14,165,233,0.1)", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
              <p style={{ color: "#64748b" }}>Loading projects…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : projects.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "100px 40px",
              background: "rgba(255,255,255,0.6)", borderRadius: "32px",
              border: "2px dashed rgba(14,165,233,0.2)",
            }}>
              <div style={{ width: "80px", height: "80px", background: "#f0f9ff", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "40px" }}>📁</div>
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0c4a6e", marginBottom: "12px" }}>No projects yet</h3>
              <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "400px", margin: "0 auto 32px" }}>
                Create your first project to start uploading PDFs and chatting with them using AI.
              </p>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: "14px 32px", fontSize: "15px", fontWeight: 700,
                  color: "white", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)",
                  border: "none", borderRadius: "14px", cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(14,165,233,0.25)",
                }}
              >
                + Create First Project
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{
                    padding: "32px", background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(20px)", borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
                    cursor: "pointer", transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(14,165,233,0.12)"; e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ width: "48px", height: "48px", background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>📄</div>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0c4a6e", margin: 0 }}>{project.name}</h3>
                      <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                        {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Click to open →</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ padding: "4px 10px", background: "#f0f9ff", color: "#0ea5e9", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>Chat</span>
                      <span style={{ padding: "4px 10px", background: "#ecfdf5", color: "#059669", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>Summarize</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Project Card */}
              <div
                onClick={() => setShowModal(true)}
                style={{
                  padding: "32px", background: "rgba(255,255,255,0.4)",
                  borderRadius: "24px", border: "2px dashed rgba(14,165,233,0.25)",
                  cursor: "pointer", transition: "all 0.25s ease",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  minHeight: "180px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,249,255,0.8)"; e.currentTarget.style.borderColor = "#0ea5e9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(14,165,233,0.25)"; }}
              >
                <div style={{ width: "48px", height: "48px", background: "#e0f2fe", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "28px", color: "#0ea5e9", lineHeight: 1 }}>+</span>
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#0ea5e9", margin: 0 }}>New Project</p>
              </div>
            </div>
          )}

          {/* ───── Feature Sections ───── */}
          <div style={{ width: "100%", marginTop: "120px" }}>
            <div style={{ textAlign: "center", marginBottom: "64px" }}>
              <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0c4a6e", marginBottom: "16px" }}>Powerful features for everyone</h2>
              <p style={{ fontSize: "18px", color: "#64748b" }}>Everything you need to master your PDF library.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "100px" }}>
              {[
                { icon: "🔍", title: "Deep Semantic Search", desc: "Our AI understands context and meaning, not just keywords." },
                { icon: "🔒", title: "Secure & Private", desc: "Your documents are encrypted and only accessible to you." },
                { icon: "📑", title: "Multi-file Analysis", desc: "Analyze up to 3 PDFs simultaneously per project." },
                { icon: "🌐", title: "Anywhere Access", desc: "Your indexed documents are stored in the cloud." },
                { icon: "⚡", title: "Instant Extraction", desc: "Get precise answers from complex tables and text in seconds." },
                { icon: "📊", title: "Summary Modes", desc: "Short, Detailed, Key Points, and Exam Mode summaries." },
              ].map((f, i) => (
                <div key={i} style={{ padding: "32px", background: "rgba(255,255,255,0.85)", borderRadius: "24px", border: "1px solid rgba(14,165,233,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.icon}</div>
                  <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#0c4a6e", marginBottom: "8px" }}>{f.title}</h4>
                  <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "80px", background: "white", padding: "48px", borderRadius: "32px", border: "1px solid rgba(14,165,233,0.1)", textAlign: "center" }}>
              <div>
                <p style={{ fontSize: "40px", fontWeight: 800, color: "#0ea5e9", margin: "0 0 8px 0" }}>99%</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Accuracy</p>
              </div>
              <div>
                <p style={{ fontSize: "40px", fontWeight: 800, color: "#0ea5e9", margin: "0 0 8px 0" }}>2s</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Avg. Response</p>
              </div>
              <div>
                <p style={{ fontSize: "40px", fontWeight: 800, color: "#0ea5e9", margin: "0 0 8px 0" }}>1k+</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>PDFs Indexed</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ───── Create Project Modal ───── */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease",
          }}
          onClick={() => { setShowModal(false); setNewProjectName(""); }}
        >
          <div
            style={{
              width: "100%", maxWidth: "480px", padding: "48px",
              background: "rgba(255,255,255,0.95)", borderRadius: "28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.8)",
              animation: "slideUp 0.25s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0c4a6e", margin: 0 }}>Create New Project</h3>
              <button
                onClick={() => { setShowModal(false); setNewProjectName(""); }}
                style={{ background: "none", border: "none", fontSize: "24px", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >×</button>
            </div>
            <p style={{ color: "#64748b", fontSize: "15px", margin: "0 0 24px 0", lineHeight: 1.6 }}>
              Give your project a name. You can upload PDFs and chat with them inside.
            </p>
            <input
              type="text"
              placeholder="e.g. Research Papers, Course Notes…"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
              autoFocus
              style={{
                width: "100%", padding: "16px 20px", fontSize: "15px",
                border: "1px solid #e2e8f0", borderRadius: "14px",
                outline: "none", color: "#0c4a6e", backgroundColor: "#f8fafc",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 4px rgba(14,165,233,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
              <button
                onClick={() => { setShowModal(false); setNewProjectName(""); }}
                style={{
                  flex: 1, padding: "14px", fontSize: "15px", fontWeight: 600,
                  color: "#64748b", background: "white", border: "1px solid #e2e8f0",
                  borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                style={{
                  flex: 1, padding: "14px", fontSize: "15px", fontWeight: 700,
                  color: "white",
                  background: !newProjectName.trim() || creating ? "#cbd5e1" : "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)",
                  border: "none", borderRadius: "12px",
                  cursor: !newProjectName.trim() || creating ? "not-allowed" : "pointer",
                  boxShadow: !newProjectName.trim() || creating ? "none" : "0 4px 14px rgba(14,165,233,0.3)",
                  transition: "all 0.2s",
                }}
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
