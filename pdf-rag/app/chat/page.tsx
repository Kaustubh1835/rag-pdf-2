"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../firebase/clientApp";

interface Message {
    role: "user" | "assistant";
    content: string;
}

function renderMarkdown(text: string) {
    const lines = text.split("\n");
    let html = "";
    let inList = false;
    let inOl = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Close open lists if needed
        if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("• ")) {
            html += "</ul>";
            inList = false;
        }
        if (inOl && !/^\d+[\.\)]/.test(trimmed)) {
            html += "</ol>";
            inOl = false;
        }

        if (trimmed === "") {
            html += "<br/>";
        } else if (trimmed.startsWith("### ")) {
            html += `<h4 style="font-size:13px;font-weight:600;color:#111;margin:16px 0 6px 0;text-transform:uppercase;letter-spacing:0.5px">${trimmed.slice(4)}</h4>`;
        } else if (trimmed.startsWith("## ")) {
            html += `<h3 style="font-size:14px;font-weight:600;color:#111;margin:16px 0 6px 0">${trimmed.slice(3)}</h3>`;
        } else if (trimmed.startsWith("# ")) {
            html += `<h2 style="font-size:15px;font-weight:600;color:#111;margin:16px 0 6px 0">${trimmed.slice(2)}</h2>`;
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            if (!inList) { html += "<ul style='margin:4px 0;padding-left:18px'>"; inList = true; }
            const content = trimmed.startsWith("- ") ? trimmed.slice(2) : trimmed.slice(2);
            html += `<li style="margin:3px 0;line-height:1.5">${formatInline(content)}</li>`;
        } else if (/^\d+[\.\)]/.test(trimmed)) {
            if (!inOl) { html += "<ol style='margin:4px 0;padding-left:18px'>"; inOl = true; }
            const content = trimmed.replace(/^\d+[\.\)]\s*/, "");
            html += `<li style="margin:3px 0;line-height:1.5">${formatInline(content)}</li>`;
        } else {
            html += `<p style="margin:4px 0;line-height:1.6">${formatInline(trimmed)}</p>`;
        }
    }

    if (inList) html += "</ul>";
    if (inOl) html += "</ol>";

    return html;
}

function formatInline(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="background:#f5f5f5;padding:1px 5px;border-radius:3px;font-size:12px">$1</code>');
}

export default function ChatPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
            if (!u) router.push("/signin");
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || sending) return;

        const userMsg: Message = { role: "user", content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            const token = await user?.getIdToken();
            const res = await fetch("https://rag-pdf-2-ew54.onrender.com/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ query: trimmed }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "Chat request failed");
            }

            const data = await res.json();
            const assistantMsg: Message = {
                role: "assistant",
                content: data.answer || "No response received.",
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Something went wrong.";
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: msg },
            ]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
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
                    flexShrink: 0,
                }}
            >
                <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#111", margin: 0 }}>
                    Pineapple
                </h1>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        fontSize: "13px",
                        color: "#888",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    ← Back to uploads
                </button>
            </header>

            {/* Messages */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "32px 24px",
                }}
            >
                <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                    {messages.length === 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "80px 0",
                            }}
                        >
                            <p style={{ fontSize: "18px", color: "#999", fontWeight: 600 }}>
                                Ask anything about your PDFs
                            </p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                alignItems: "flex-start",
                                gap: "10px",
                                marginBottom: "16px",
                            }}
                        >
                            {msg.role === "assistant" && (
                                <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: "#111",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    marginTop: "2px",
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="10" rx="2" />
                                        <circle cx="9" cy="16" r="1" />
                                        <circle cx="15" cy="16" r="1" />
                                        <path d="M12 2v4" />
                                        <path d="M8 7h8" />
                                    </svg>
                                </div>
                            )}
                            <div
                                style={{
                                    maxWidth: "80%",
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                                    ...(msg.role === "user"
                                        ? {
                                            backgroundColor: "#f5f5f5",
                                            color: "#111",
                                        }
                                        : {
                                            backgroundColor: "#ffffff",
                                            color: "#111",
                                            border: "1px solid #e5e5e5",
                                        }),
                                }}
                            >
                                {msg.role === "assistant" ? (
                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                ) : (
                                    msg.content
                                )}
                            </div>
                            {msg.role === "user" && (
                                <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: "#111",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    marginTop: "2px",
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}

                    {sending && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-start",
                                alignItems: "flex-start",
                                gap: "10px",
                                marginBottom: "16px",
                            }}
                        >
                            <div style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: "#111",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: "2px",
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="10" rx="2" />
                                    <circle cx="9" cy="16" r="1" />
                                    <circle cx="15" cy="16" r="1" />
                                    <path d="M12 2v4" />
                                    <path d="M8 7h8" />
                                </svg>
                            </div>
                            <div
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    border: "1px solid #eee",
                                    fontSize: "14px",
                                    color: "#aaa",
                                }}
                            >
                                Thinking…
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Bar */}
            <div
                style={{
                    borderTop: "1px solid #eee",
                    padding: "16px 24px",
                    flexShrink: 0,
                    backgroundColor: "#ffffff",
                }}
            >
                <div
                    style={{
                        maxWidth: "640px",
                        margin: "0 auto",
                        display: "flex",
                        gap: "12px",
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your question…"
                        disabled={sending}
                        style={{
                            flex: 1,
                            padding: "12px 16px",
                            fontSize: "14px",
                            border: "1px solid #e5e5e5",
                            borderRadius: "6px",
                            outline: "none",
                            color: "#111",
                            backgroundColor: "#fff",
                            transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#bbb")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e5e5")}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        style={{
                            padding: "12px 24px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#fff",
                            backgroundColor: !input.trim() || sending ? "#ccc" : "#111",
                            border: "none",
                            borderRadius: "6px",
                            cursor: !input.trim() || sending ? "not-allowed" : "pointer",
                            transition: "background-color 0.15s ease",
                            flexShrink: 0,
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
