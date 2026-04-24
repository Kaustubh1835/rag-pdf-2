\"use client\";

import { useEffect, useState } from \"react\";
import { onAuthStateChanged, signOut, User } from \"firebase/auth\";
import { useRouter } from \"next/navigation\";
import { auth } from \"../firebase/clientApp\";
import { motion, AnimatePresence } from \"framer-motion\";
import { 
  Plus, 
  Search, 
  Trash2, 
  Folder, 
  MessageSquare, 
  FileText, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Clock,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Loader2
} from \"lucide-react\";
import * as Dialog from \"@radix-ui/react-dialog\";
import * as DropdownMenu from \"@radix-ui/react-dropdown-menu\";
import * as Avatar from \"@radix-ui/react-avatar\";
import { clsx, type ClassValue } from \"clsx\";
import { twMerge } from \"tailwind-merge\";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [newProjectName, setNewProjectName] = useState(\"\");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState(\"\");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push(\"/signin\");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\"/api/projects\", {
        headers: { Authorization: Bearer \ },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(\"Failed to fetch projects:\", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\"/api/projects\", {
        method: \"POST\",
        headers: {
          \"Content-Type\": \"application/json\",
          Authorization: Bearer \,
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [project, ...prev]);
        setNewProjectName(\"\");
        setShowModal(false);
      }
    } catch (err) {
      console.error(\"Failed to create project:\", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm(\"Are you sure you want to delete this project? All associated PDFs and chats will be lost.\")) return;
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\/api/projects/\\, {
        method: \"DELETE\",
        headers: { Authorization: Bearer \ },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        alert(\"Failed to delete project.\");
      }
    } catch (err) {
      console.error(\"Delete error:\", err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push(\"/signin\");
  };

  if (authLoading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-[#fafafa]\">
        <div className=\"flex flex-col items-center gap-4\">
          <Loader2 className=\"animate-spin text-sky-600\" size={32} />
          <p className=\"text-gray-400 font-medium text-sm\">Synchronizing Cloud...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className=\"min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-900 selection:bg-sky-100 selection:text-sky-900\">
      <nav className=\"sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 h-16\">
        <div className=\"flex items-center gap-10\">
          <div className=\"flex items-center gap-2.5\">
            <div className=\"w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-gray-200\">
              <span className=\"font-bold text-lg tracking-tighter\">I</span>
            </div>
            <span className=\"font-bold text-xl tracking-tight text-gray-900\">InsightPDF</span>
          </div>
          
          <div className=\"hidden md:flex items-center gap-1\">
            {[
              { name: \"Dashboard\", icon: LayoutDashboard, active: true },
              { name: \"Settings\", icon: Settings, active: false }
            ].map((item) => (
              <button
                key={item.name}
                className={cn(
                  \"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200\",
                  item.active 
                    ? \"text-sky-600 bg-sky-50/50\" 
                    : \"text-gray-500 hover:text-gray-900 hover:bg-gray-50\"
                )}
              >
                <item.icon size={16} strokeWidth={item.active ? 2.5 : 2} />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className=\"flex items-center gap-4\">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className=\"flex items-center gap-3 p-1.5 pl-3 rounded-full border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all outline-none\">
                <span className=\"text-xs font-semibold text-gray-600 truncate max-w-[100px]\">
                  {user?.displayName || user?.email?.split(\"@\")[0]}
                </span>
                <Avatar.Root className=\"w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center overflow-hidden border border-sky-200\">
                  <Avatar.Fallback className=\"text-[10px] font-bold text-sky-700\">
                    {(user?.displayName || user?.email || \"U\")[0].toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className=\"min-w-[200px] bg-white rounded-xl p-1 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-100 z-[100]\"
                align=\"end\"
                sideOffset={8}
              >
                <div className=\"px-3 py-2 border-b border-gray-50 mb-1\">
                  <p className=\"text-[10px] font-bold text-gray-400 uppercase tracking-widest\">Account</p>
                  <p className=\"text-xs font-medium text-gray-600 truncate\">{user?.email}</p>
                </div>
                <DropdownMenu.Item className=\"flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg outline-none cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors\">
                  <Settings size={14} /> Account Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onClick={handleSignOut}
                  className=\"flex items-center gap-2 px-3 py-2 text-sm text-red-500 rounded-lg outline-none cursor-pointer hover:bg-red-50 transition-colors\"
                >
                  <LogOut size={14} /> Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>

      <div className=\"bg-white border-b border-gray-100\">
        <div className=\"max-w-7xl mx-auto px-8 py-12 md:py-20 flex flex-col md:flex-row md:items-end justify-between gap-8\">
          <div className=\"space-y-4 max-w-2xl\">
            <h2 className=\"text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1]\">
              Knowledge, <span className=\"text-sky-600\">Simplified.</span>
            </h2>
            <p className=\"text-lg text-gray-500 font-medium leading-relaxed\">
              Transform your static documents into interactive conversations. 
              Organize projects and unlock insights in seconds.
            </p>
          </div>
          
          <div className=\"flex flex-col sm:flex-row items-center gap-3\">
            <div className=\"relative group w-full sm:w-64\">
              <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors\" size={16} />
              <input 
                type=\"text\" 
                placeholder=\"Search projects...\"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=\"w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-sky-500/5 focus:border-sky-300 transition-all text-sm font-medium\"
              />
            </div>
            
            <Dialog.Root open={showModal} onOpenChange={setShowModal}>
              <Dialog.Trigger asChild>
                <button className=\"w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-2xl shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap\">
                  <Plus size={18} strokeWidth={3} /> New Project
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className=\"fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] animate-in fade-in duration-300\" />
                <Dialog.Content className=\"fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl p-8 shadow-2xl z-[201] animate-in zoom-in-95 duration-200 focus:outline-none\">
                  <Dialog.Title className=\"text-2xl font-bold text-gray-900 mb-2\">Create New Project</Dialog.Title>
                  <Dialog.Description className=\"text-gray-500 text-sm mb-6 font-medium\">
                    Give your project a name to get started with analysis.
                  </Dialog.Description>
                  
                  <div className=\"space-y-4\">
                    <div>
                      <label className=\"text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1\">Project Name</label>
                      <input 
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        placeholder=\"e.g. Legal Analysis 2024\"
                        className=\"w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-sky-500 transition-all font-medium\"
                      />
                    </div>
                    
                    <button 
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || creating}
                      className=\"w-full py-3.5 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-200 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 active:scale-[0.98]\"
                    >
                      {creating ? <Loader2 className=\"animate-spin\" size={18} /> : \"Create Project\"}
                    </button>
                  </div>
                </Dialog.Content> 
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>

      <main className=\"max-w-7xl mx-auto px-8 py-16 flex-1 w-full\">
        {loadingProjects ? (
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
            {[1, 2, 3].map(i => (
              <div key={i} className=\"h-[220px] bg-white rounded-3xl border border-gray-100 animate-pulse shadow-sm\" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className=\"flex flex-col items-center justify-center py-20 text-center\"
          >
            <div className=\"w-24 h-24 bg-sky-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-sky-100\">
              <Folder className=\"text-sky-500\" size={40} strokeWidth={1.5} />
            </div>
            <h3 className=\"text-2xl font-bold text-gray-900 mb-3 tracking-tight\">
              {searchQuery ? \"No matching projects\" : \"Your library is empty\"}
            </h3>
            <p className=\"text-gray-500 max-w-[360px] font-medium leading-relaxed mb-8\">
              {searchQuery ? \We couldn't find anything matching \"\\"\ : \"Begin by creating a new project to start chatting with your PDF documents.\"}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowModal(true)}
                className=\"px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 shadow-sm hover:border-sky-500 hover:text-sky-600 transition-all hover:shadow-md active:scale-95\"
              >
                Create your first project
              </button>
            )}
          </motion.div>
        ) : (
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
            <AnimatePresence mode=\"popLayout\">
              {filteredProjects.map((project) => (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => router.push(\/projects/\\)}
                  className=\"group bg-white rounded-[2rem] p-7 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-sky-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative\"
                >
                  <div className=\"flex items-start justify-between mb-8\">
                    <div className=\"w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all duration-300 border border-sky-100/50\">
                      <FileText size={22} strokeWidth={2.5} />
                    </div>
                    
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className=\"p-2 text-gray-300 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all outline-none\"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className=\"min-w-[160px] bg-white rounded-xl p-1 shadow-2xl border border-gray-100 z-[100]\">
                          <DropdownMenu.Item 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(e as any, project.id); }}
                            className=\"flex items-center gap-2 px-3 py-2 text-sm text-red-500 rounded-lg outline-none cursor-pointer hover:bg-red-50\"
                          >
                            <Trash2 size={14} /> Delete Project
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>

                  <div className=\"space-y-1.5 mb-6\">
                    <h3 className=\"text-xl font-bold text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-1\">
                      {project.name}
                    </h3>
                    <div className=\"flex items-center gap-2 text-xs font-semibold text-gray-400\">
                      <Clock size={12} />
                      {new Date(project.createdAt).toLocaleDateString(\"en-US\", { month: \"short\", day: \"numeric\", year: \"numeric\" })}
                    </div>
                  </div>

                  <div className=\"flex items-center gap-2 pt-6 border-t border-gray-50\">
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(\/projects/\/chat\); }}
                      className=\"flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-sky-50 text-gray-600 hover:text-sky-600 rounded-xl text-xs font-bold transition-all group/btn active:scale-95\"
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                      className=\"flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all active:scale-95\"
                      onClick={(e) => { e.stopPropagation(); router.push(\/projects/\/summarize\); }}
                    >
                      Summarize
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className=\"py-10 border-t border-gray-100 bg-white\">
        <div className=\"max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4\">
          <p className=\"text-xs font-bold text-gray-400 uppercase tracking-widest\">© 2026 InsightPDF Intelligent Systems</p>
          <div className=\"flex gap-8\">
            <a href=\"#\" className=\"text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest\">Privacy</a>
            <a href=\"#\" className=\"text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest\">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
