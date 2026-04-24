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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: "24px", background: "rgba(255,255,255,0.8)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "#0c4a6e", fontSize: "15px", fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div 
      className="flex h-screen overflow-hidden bg-[#fafafa]"
      style={{ userSelect: isResizing ? "none" : "auto" }}
    >
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarMinimized ? 0 : sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          background: "white",
          borderRight: isSidebarMinimized ? "none" : "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          zIndex: 40,
        }}
      >
        {!isSidebarMinimized && (
          <div 
            onMouseDown={startResizing}
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-sky-500/20 transition-colors"
          />
        )}
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
          className="absolute z-[60] flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all duration-200 text-gray-500 hover:text-sky-600"
          style={{
            width: "28px",
            height: "28px",
            top: "24px",
            right: isSidebarMinimized ? "-14px" : "-14px",
            transform: isSidebarMinimized ? "none" : "none"
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
              <div className="p-4 border-bottom border-gray-50">
                <button 
                  onClick={createNewSession}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95"
                >
                  <Plus size={16} /> New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2 custom-scrollbar">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className={`w-full p-3 text-left rounded-xl transition-all duration-200 group relative flex flex-col gap-0.5 ${
                      currentSessionId === s.id 
                        ? "bg-sky-50 text-sky-900 border-sky-100" 
                        : "text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-100"
                    } border`}
                  >
                    <span className="font-medium text-[13px] truncate pr-4">{s.title}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-sky-500/60 transition-colors">
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#ffffff] relative">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-semibold text-gray-900 leading-none">InsightPDF AI</h1>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Gpt-4o Model</p>
            </div>
          </div>
          <button 
            onClick={() => router.push(`/projects/${projectId}`)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <div className="max-w-[720px] mx-auto py-10 space-y-8">
            {messages.length === 0 && !sending && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[50vh] text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-tr from-sky-50 to-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-sky-50">
                  <Bot size={32} className="text-sky-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h3>
                <p className="text-sm text-gray-500 max-w-[320px]">
                  Ask questions about your documents, summarize content, or extract key insights.
                </p>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    msg.role === "assistant" 
                      ? "bg-white border-sky-100 text-sky-600" 
                      : "bg-gray-900 border-gray-900 text-white"
                  }`}>
                    {msg.role === "assistant" ? <Bot size={16} /> : <UserIcon size={16} />}
                  </div>
                  
                  <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-[14.5px] leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-sky-600 text-white rounded-tr-none"
                        : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100/50"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1 font-medium">
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
                <div className="w-8 h-8 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-50 border border-gray-100/50 px-4 py-2.5 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <motion.span 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-sky-400 rounded-full"
                    />
                    <motion.span 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-sky-400 rounded-full"
                    />
                    <motion.span 
                      animate={{ opacity: [0.4, 1, 0.4] }} 
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-sky-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-gray-50">
          <div className="max-w-[720px] mx-auto relative group">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message InsightPDF..."
              disabled={sending}
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-50/50 transition-all duration-200 text-sm resize-none custom-scrollbar min-h-[46px] max-h-[120px]"
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
              className={`absolute right-2 top-[5px] p-2 rounded-xl transition-all duration-200 ${
                !input.trim() || sending 
                  ? "text-gray-300" 
                  : "text-white bg-sky-600 hover:bg-sky-700 shadow-sm active:scale-95"
              }`}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">
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
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}

