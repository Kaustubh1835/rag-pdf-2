"use client";

import { useEffect, useState, useRef, use, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../../../firebase/clientApp";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Plus, 
  ArrowLeft, 
  Bot, 
  User as UserIcon, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Sparkles,
  Loader2
} from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

export default function ProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarMinimized(true);
    }
  }, []);

  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push("/signin");
      else fetchSessions();
    });
    return () => unsubscribe();
  }, [router]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          selectSession(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat ${sessions.length + 1}` }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, sending]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      // Auto-create session if none exists
      try {
        const res = await fetch(`/api/projects/${projectId}/chat-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed.substring(0, 30) + "..." }),
        });
        if (res.ok) {
          const newSession = await res.json();
          setSessions([newSession, ...sessions]);
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
        } else return;
      } catch (err) {
        console.error("Failed to auto-create session:", err);
        return;
      }
    }

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      // 1. Save user message to DB
      await fetch(`/api/chat-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMsg),
      });

      // 2. Get AI Response
      const token = await user?.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: trimmed, project_id: projectId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Chat request failed");
      }
      const data = await res.json();
      const aiMsg: Message = { role: "assistant", content: data.answer || "No response received." };
      
      // 3. Save AI message to DB
      await fetch(`/api/chat-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiMsg),
      });

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3">
          <Loader2 size={20} className="text-sky-400 animate-spin" />
          <p className="text-slate-300 text-sm font-medium">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div 
      className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
      style={{ userSelect: isResizing ? "none" : "auto" }}
    >
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarMinimized ? 0 : (typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(sidebarWidth, 280) : sidebarWidth) }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-slate-900/95 backdrop-blur-2xl flex flex-col shrink-0 relative md:relative absolute inset-y-0 left-0 z-40 shadow-2xl md:shadow-none border-r border-slate-800/80"
      >
        {!isSidebarMinimized && (
          <div 
            onMouseDown={startResizing}
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-sky-500/30 transition-colors"
          />
        )}
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
          className="absolute z-[60] flex items-center justify-center bg-slate-800 border border-slate-700 rounded-full shadow-lg hover:bg-slate-700 transition-all duration-200 text-slate-300 hover:text-white"
          style={{
            width: "28px",
            height: "28px",
            top: "20px",
            right: "-14px",
          }}
          title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          {isSidebarMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <AnimatePresence>
          {!isSidebarMinimized && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full overflow-hidden"
            >
              <div className="p-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-cyan-600 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-sky-500/20">I</div>
                  <span className="text-sm font-bold text-slate-200 tracking-tight">InsightPDF</span>
                </div>
                <button 
                  onClick={createNewSession}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-400 via-cyan-400 to-slate-200 text-slate-950 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/15 hover:shadow-sky-400/25 active:scale-95"
                >
                  <Plus size={16} /> New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2.5 space-y-1.5 py-3 custom-scrollbar">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className={`w-full p-3 text-left rounded-xl transition-all duration-200 group relative flex flex-col gap-1 border ${
                      currentSessionId === s.id 
                        ? "bg-slate-800/90 text-sky-400 border-sky-500/40 shadow-md shadow-sky-500/10" 
                        : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-medium text-xs truncate pr-2">{s.title}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
                      {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-sky-400 shadow-md">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100 leading-none">InsightPDF AI</h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Document Assistant Ready</p>
            </div>
          </div>
          <button 
            onClick={() => router.push(`/projects/${projectId}`)} 
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Project
          </button>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 custom-scrollbar">
          <div className="max-w-[760px] mx-auto py-8 sm:py-10 space-y-8">
            {messages.length === 0 && !sending && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-sky-500/10 relative group">
                  <div className="absolute inset-0 bg-sky-500/10 rounded-3xl blur-xl group-hover:bg-sky-500/20 transition-all" />
                  <Bot size={40} className="text-sky-400 relative z-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-100 mb-2 tracking-tight">How can I assist you with your PDFs?</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-8 leading-relaxed">
                  Ask any question about your uploaded documents, generate summaries, or extract key data.
                </p>

                {/* Quick Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                  {[
                    "📝 Summarize main points",
                    "💡 What are key requirements?",
                    "❓ Explain the details"
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setInput(promptText.replace(/^[^a-zA-Z]+/, '')); }}
                      className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 rounded-xl text-xs text-slate-300 hover:text-white transition-all text-left shadow-md hover:-translate-y-0.5"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3.5 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-md ${
                    msg.role === "assistant" 
                      ? "bg-slate-800/90 border-sky-500/40 text-sky-400 shadow-sky-500/10" 
                      : "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600 text-slate-200"
                  }`}>
                    {msg.role === "assistant" ? <Bot size={18} /> : <UserIcon size={18} />}
                  </div>
                  
                  <div className={`flex flex-col gap-1.5 max-w-[88%] sm:max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-600 text-white rounded-tr-xs shadow-sky-500/20 font-medium"
                        : "bg-slate-800/80 backdrop-blur-xl text-slate-100 rounded-tl-xs border border-slate-700/80 shadow-black/20"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-sky max-w-none text-slate-200 text-xs sm:text-sm prose-p:my-1.5 prose-headings:text-slate-100 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 prose-code:text-sky-300 prose-code:bg-slate-900/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 px-1 font-medium">
                      {msg.role === "assistant" ? "AI Assistant" : "You"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md shadow-sky-500/10 animate-pulse">
                  <Bot size={18} />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 px-5 py-3.5 rounded-2xl rounded-tl-xs">
                  <div className="flex gap-1.5 items-center">
                    <motion.span 
                      animate={{ opacity: [0.3, 1, 0.3] }} 
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-2 h-2 bg-sky-400 rounded-full"
                    />
                    <motion.span 
                      animate={{ opacity: [0.3, 1, 0.3] }} 
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-sky-400 rounded-full"
                    />
                    <motion.span 
                      animate={{ opacity: [0.3, 1, 0.3] }} 
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-sky-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 sm:p-6 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800/90">
          <div className="max-w-[760px] mx-auto relative group">
            <div className="relative bg-slate-900/90 border border-slate-700/80 focus-within:border-sky-500/70 focus-within:ring-4 focus-within:ring-sky-500/10 rounded-2xl p-2.5 sm:p-3 shadow-2xl transition-all">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask InsightPDF anything about your documents..."
                disabled={sending}
                className="w-full pl-2 pr-12 py-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs sm:text-sm resize-none custom-scrollbar min-h-[38px] max-h-[120px]"
                style={{ overflowY: input.split('\n').length > 5 ? 'auto' : 'hidden' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <button 
                onClick={sendMessage} 
                disabled={!input.trim() || sending} 
                className={`absolute right-3 top-[7px] sm:top-[9px] p-2.5 rounded-xl transition-all duration-200 ${
                  !input.trim() || sending 
                    ? "text-slate-600 bg-slate-800/40 cursor-not-allowed" 
                    : "text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 font-bold shadow-lg shadow-sky-500/25 active:scale-95 cursor-pointer"
                }`}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center font-medium">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

