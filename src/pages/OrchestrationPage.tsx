import { useState, useEffect, useRef, type MouseEvent, memo } from "react";
import { useNavigate } from "react-router-dom";
import Viewer3D from "@/components/Viewer3D";
import InteractiveWaveShader from "@/components/ui/flowing-waves-shader";
import { 
  Plus, 
  Send, 
  Image as ImageIcon, 
  History, 
  LogOut, 
  User, 
  Copy, 
  Check, 
  Loader2,
  Download,
  Trash2,
  Sparkles,
  ChevronLeft,
  Bot,
  IndianRupee,
  Share2,
  Mail,
  MessageCircle,
  Palette,
  PanelLeftOpen,
  PanelLeftClose,
  Menu,
  ChevronRight,
  X,
  Maximize
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import { getArchitectStream, getCostEstimation, generateDesignImage, generateMultipleDesignImages, generateProjectTitle, enhancePrompt, type CostBreakdown } from "@/lib/gemini";
import { generateDesignPDF } from "@/lib/pdfGenerator";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { STYLE_PRESETS, type StylePreset, type DesignConcept } from "@/types";

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

interface ProjectSession {
  id: string;
  title: string;
  messages: Message[];
  designPrompt: string | null;
  designImage: string | null;
  designImages: string[];  // Multiple generated variants
  costBreakdown: null | CostBreakdown;
  timestamp: number;
}

import ChatGPTInput from "../components/ui/prompt-input-dynamic-grow";
import { LoadingBreadcrumb } from "../components/ui/animated-loading-svg-text-shimmer";
import confetti from 'canvas-confetti';

const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Set properties for a pleasant bright "ding"
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // Slide up to C6
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (error) {
    console.error("Audio API not supported or blocked", error);
  }
};

const triggerSuccessFeedback = () => {
  // Play subtle satisfying completion ping
  playSuccessSound();
  
  // Fire delightful low-key confetti burst from bottom center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.9 },
    colors: ['#3b82f6', '#a855f7', '#ffffff'] // Match app cyan/purple/glow tones
  });
};

const ArchAgentLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-2 text-cyan-400">
    <path d="M12 2C7.02944 2 3 6.02944 3 11C3 15.9706 7.02944 20 12 20C16.9706 20 21 15.9706 21 11C21 6.02944 16.9706 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="11" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="11" r="1.5" fill="currentColor"/>
  </svg>
);

const StatusBadge = memo(({ endpoint, provider, label }: { endpoint: string, provider: string, label: string }) => {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(endpoint)
      .then(res => res.json())
      .then(data => setStatus(!!data[provider]))
      .catch(() => setStatus(false));
  }, [endpoint, provider]);

  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-500",
      status === null ? "bg-white/5 border-white/5 animate-pulse" :
      status ? "bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-red-500/5 border-red-500/10 opacity-50"
    )}>
      <div className={cn(
        "h-1.5 w-1.5 rounded-full mb-0.5",
        status === null ? "bg-white/20" : status ? "bg-green-400" : "bg-red-400"
      )} />
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest",
        status === null ? "text-white/20" : status ? "text-green-400/80" : "text-red-400/60"
      )}>{label}</span>
    </div>
  );
});

const UserProfileLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-2 text-white">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProjectTab = memo(({ id, label, icon: Icon, active, onClick }: { id: string, label: string, icon: any, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all",
      active 
        ? "bg-white text-black shadow-lg" 
        : "text-white/40 hover:text-white hover:bg-white/5"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
));

import { supabase } from "@/lib/supabase";

export default function OrchestrationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"chat" | "cost" | "visual">("chat");
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      } else if (localStorage.getItem("auth_token") === "mock") {
        setUser({ email: "name@example.com" });
      }
    });
  }, []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEstimatingCost, setIsEstimatingCost] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [costInput, setCostInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [copied, setCopied] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLE_PRESETS[0]);
  const [showImmersiveViewer, setShowImmersiveViewer] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [immersiveConcept, setImmersiveConcept] = useState<DesignConcept | null>(null);

  // Sync current session ID if it gets lost
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    if (activeTab === "chat" && inputRef.current) {
        inputRef.current.focus();
    }
  }, [activeTab]);

  const startRename = (session: ProjectSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const finishRename = (session: ProjectSession) => {
    updateSession(session.id, { title: editingTitle });
    setEditingSessionId(null);
  };

  // Function to sync sessions with Supabase
  const syncWithSupabase = async (sessionsToSync: ProjectSession[]) => {
    if (!supabase) return;
    
    try {
      // For simplicity in this demo, we'll store all sessions as a single record or multiple.
      // Ideally, each session is a row. Let's try to upsert them.
      for (const session of sessionsToSync) {
        const { error } = await supabase
          .from('project_sessions')
          .upsert({
            id: session.id,
            title: session.title,
            messages: session.messages,
            design_prompt: session.designPrompt,
            design_image: session.designImage,
            design_images: session.designImages,
            cost_breakdown: session.costBreakdown,
            timestamp: session.timestamp
          });
        
        if (error) {
          // If table doesn't exist, this will fail gracefully or we log it
          if (error.code === '42P01') {
            console.warn("Supabase table 'project_sessions' not found. Falling back to local storage.");
            break;
          }
          console.error("Supabase sync error:", error.message);
        }
      }
    } catch (e) {
      console.error("Supabase communication failed", e);
    }
  };

  // Load sessions from Supabase and localStorage
  useEffect(() => {
    const loadSessions = async () => {
      try {
        let savedSessions: ProjectSession[] = [];
        
        // Try Supabase first
        if (import.meta.env.VITE_SUPABASE_URL) {
          const { data, error } = await supabase
            .from('project_sessions')
            .select('*')
            .order('timestamp', { ascending: false });
          
          if (!error && data && data.length > 0) {
            savedSessions = data.map(s => ({
              id: s.id,
              title: s.title,
              messages: s.messages,
              designPrompt: s.design_prompt,
              designImage: s.design_image,
              designImages: s.design_images || [],
              costBreakdown: s.cost_breakdown,
              timestamp: s.timestamp
            }));
            console.log("Loaded sessions from Supabase");
          }
        }

        // If Supabase empty or failed, try localStorage
        if (savedSessions.length === 0) {
          const saved = localStorage.getItem("arch_agent_sessions");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              savedSessions = parsed.map((s: any) => ({
                ...s,
                designImages: s.designImages || (s.designImage ? [s.designImage] : [])
              }));
              console.log("Loaded sessions from localStorage");
            }
          }
        }

        if (savedSessions.length > 0) {
          setSessions(savedSessions);
          setCurrentSessionId(savedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (err) {
        console.error("Session initialization failed", err);
        createNewSession();
      } finally {
        setIsInitializing(false);
      }
    };

    loadSessions();
  }, []);

  // Save sessions to localStorage and sync with Supabase
  useEffect(() => {
    if (sessions.length > 0 && !isInitializing) {
      localStorage.setItem("arch_agent_sessions", JSON.stringify(sessions));
      // Debounced sync or immediate for critical changes
      syncWithSupabase(sessions);
    }
  }, [sessions, isInitializing]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      // Scroll to bottom with a slight delay to ensure content is measured
      const timeoutId = setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [sessions, currentSessionId, streamingText, activeTab]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ProjectSession = {
      id: Math.random().toString(36).substring(7),
      title: "New Project",
      messages: [],
      designPrompt: null,
      designImage: null,
      designImages: [],
      costBreakdown: null,
      timestamp: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleSend = async (overrideMessage?: string) => {
    const textToSend = overrideMessage || input;
    if (!textToSend.trim() || isLoading) return;

    let targetSessionId = currentSessionId;

    // If no active session, create a new one instantly before proceeding
    if (!targetSessionId) {
      const newSession: ProjectSession = {
        id: Math.random().toString(36).substring(7),
        title: "New Project",
        messages: [],
        designPrompt: null,
        designImage: null,
        designImages: [],
        costBreakdown: null,
        timestamp: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      targetSessionId = newSession.id;
    }

    const currentSessionRef = sessions.find(s => s.id === targetSessionId);
    
    const userMessage: Message = { role: "user", parts: [{ text: textToSend }] };
    const baseMessages = currentSessionRef ? currentSessionRef.messages : [];
    const updatedMessages = [...baseMessages, userMessage];
    
    // Update local state immediately
    updateSession(targetSessionId, { messages: updatedMessages });
    setInput("");
    setIsLoading(true);

    try {
      const stream = await getArchitectStream(updatedMessages);
      let fullResponse = "";
      setStreamingText("");

      for await (const chunk of stream) {
        const chunkText = chunk.text || "";
        fullResponse += chunkText;
        setStreamingText(fullResponse);
      }
      
      setStreamingText(null);
      
      // Extract design prompt if present
      const promptMatch = fullResponse.match(/\[DESIGN_PROMPT\](.*?)\[\/DESIGN_PROMPT\]/s);
      const designPrompt = promptMatch ? promptMatch[1].trim() : null;
      const cleanResponse = fullResponse.replace(/\[DESIGN_PROMPT\].*?\[\/DESIGN_PROMPT\]/gs, "").trim();

      const finalModelMessage: Message = { 
        role: "model", 
        parts: [{ text: cleanResponse || (designPrompt ? "I've generated a design prompt for you. Visualizing now..." : "I'm here to help with your architectural needs.") }] 
      };
      const finalMessages = [...updatedMessages, finalModelMessage];

      updateSession(targetSessionId, { 
        messages: finalMessages, 
        designPrompt: designPrompt || (currentSessionRef ? currentSessionRef.designPrompt : null)
      });

      // Smart Title Generation if it's the first few messages
      if (finalMessages.length >= 2 && (!currentSessionRef || currentSessionRef.title === "New Project")) {
        generateProjectTitle(finalMessages).then(title => {
          updateSession(targetSessionId, { title });
        });
      }

      // AUTO-TRIGGER: If a design prompt was generated, automatically trigger image and cost
      if (designPrompt) {
        handleGenerateDesign(designPrompt, targetSessionId);
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = { role: "model", parts: [{ text: "I'm sorry, I encountered an error. Please try again." }] };
      updateSession(targetSessionId, { messages: [...updatedMessages, errorMessage] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDesign = async (prompt: string, overrideSessionId?: string) => {
    const targetSessionId = overrideSessionId || currentSessionId;
    if (!targetSessionId || !prompt?.trim()) return;
    setIsGeneratingImage(true);
    
    // AUTO-TRIGGER: Launch cost estimation entirely in parallel so it isn't blocked by image failure
    handleEstimateCost(prompt, undefined, targetSessionId);

    try {
      // Enhance the prompt using the selected style preset keywords
      let enhancedPrompt = prompt;
      try {
        const result = await enhancePrompt(prompt, selectedStyle.keywords);
        // Only use enhanced result if it's meaningful
        if (result && result.trim().length > 0) {
          enhancedPrompt = result;
          console.log(`[Style] Enhanced prompt with '${selectedStyle.name}' style`);
        }
      } catch (err) {
        console.warn('[Style] Prompt enhancement failed, using original prompt', err);
      }

      // Safety: ensure we never pass an empty prompt
      const finalPrompt = enhancedPrompt?.trim() || prompt;

      // Generate 4 design variants in parallel
      const images = await generateMultipleDesignImages(finalPrompt, 4, imageSize);
      updateSession(targetSessionId, { 
        designImages: images, 
        designImage: images[0]
      });
      triggerSuccessFeedback();
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEnterRoom = (imageUrl: string) => {
    const concept: DesignConcept = {
      id: currentSessionId || 'viewer',
      url: imageUrl,
      prompt: currentSession?.designPrompt || '',
      style: selectedStyle.name,
      timestamp: Date.now(),
    };
    setImmersiveConcept(concept);
    setShowImmersiveViewer(true);
  };

  const handleEstimateCost = async (prompt: string, constraints?: string, overrideSessionId?: string) => {
    const targetSessionId = overrideSessionId || currentSessionId;
    if (!targetSessionId) return;
    setIsEstimatingCost(true);
    try {
      const breakdown = await getCostEstimation(prompt, constraints);
      updateSession(targetSessionId, { costBreakdown: breakdown });
      
      // Delay it slightly so they don't fire at the exact same millisecond if they complete simultaneously
      setTimeout(triggerSuccessFeedback, 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsEstimatingCost(false);
    }
  };

  const updateSession = (id: string, updates: Partial<ProjectSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDownloadPDF = async (type: "Invoice" | "Payslip" | "Estimation") => {
    if (!currentSession || !currentSession.costBreakdown) return;
    setIsDownloadingPDF(true);
    setDownloadSuccess(null);
    try {
      await generateDesignPDF(
        currentSession.title,
        currentSession.designPrompt || "Architectural Design Concept",
        currentSession.costBreakdown,
        type,
        selectedStyle.name,
        user?.email || "Valued Architect",
        currentSession.designImage || (currentSession.designImages.length > 0 ? currentSession.designImages[0] : null)
      );
      setDownloadSuccess(type);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error("PDF Generation failed:", error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    localStorage.removeItem("auth_token");
    navigate("/");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans relative"
    >
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#050505] flex items-center justify-center backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-6">
              <LoadingBreadcrumb text="Synchronizing Project Sessions..." className="scale-125" />
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i} 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 bg-white rounded-full" 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background Removed from Global */}
      
      {/* Sidebar - Collapsible */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="border-r border-white/10 flex flex-col bg-black/60 backdrop-blur-3xl z-[50] relative overflow-hidden shrink-0"
          >
            <div className="p-8 flex items-center justify-between">
              <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/")}
                  className="group relative h-12 w-12 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  <ChevronLeft className="relative z-10 h-5 w-5 text-white/80 transition-colors group-hover:text-white" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
                </Button>
              </motion.div>
              <Logo iconSize={6} textSize="text-xl" />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-white/40 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* API Status Indicators */}
            <div className="px-8 mb-6 grid grid-cols-3 gap-2">
              <StatusBadge endpoint="/api/status" provider="gemini" label="Gem" />
              <StatusBadge endpoint="/api/status" provider="huggingface" label="HF" />
              <StatusBadge endpoint="/api/status" provider="twentyfirst" label="21st" />
            </div>

            <div className="px-6 mb-8">
              <Button 
                onClick={createNewSession}
                className="w-full justify-center gap-3 bg-white text-black hover:bg-white/90 h-14 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-8 mb-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="h-3 w-3" />
                Project History
              </div>
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2 py-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setCurrentSessionId(session.id)}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                        currentSessionId === session.id 
                          ? "bg-white/10 text-white border-white/20 shadow-lg" 
                          : "text-white/40 border-transparent hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate flex-1">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          currentSessionId === session.id ? "bg-white animate-pulse" : "bg-white/20"
                        )} />
                        {editingSessionId === session.id ? (
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => finishRename(session)}
                            onKeyDown={(e) => e.key === "Enter" && finishRename(session)}
                            className="h-8 bg-white/20 border-white/20 text-sm font-semibold p-2"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate text-sm font-semibold tracking-tight">{session.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); startRename(session); }}
                          className="h-8 w-8 hover:bg-white/20 rounded-xl"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteSession(session.id, e)}
                          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-white/10 shadow-md">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-white/10 text-xs font-bold"><UserProfileLogo /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight truncate max-w-[120px]">
                      {user?.email?.split('@')[0] || "Architect"}
                    </span>
                    <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider truncate max-w-[120px]">
                      {user?.email || "Enterprise Access"}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout} 
                  className="group relative h-10 w-10 overflow-hidden text-white/40 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                >
                  <LogOut className="relative z-10 h-4 w-4 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-[150%] transition-transform duration-700 ease-in-out group-hover:translate-x-[150%] z-0" />
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-4 bg-white/5 hover:bg-white/10 rounded-l-md border border-white/10 border-r-0 hidden lg:flex items-center justify-center"
            >
              <ChevronLeft className="h-3 w-3 text-white/30" />
            </Button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden z-10">
        <AnimatePresence mode="wait">
          {currentSession ? (
            <motion.div 
              key="workspace-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Workspace Top Navigation */}
              <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  {!isSidebarOpen && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <PanelLeftOpen className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2">
                    {[
                      { id: "chat", label: "Assistant", icon: Bot },
                      { id: "cost", label: "Estimation", icon: IndianRupee },
                      { id: "visual", label: "Visualizer", icon: ImageIcon }
                    ].map((tab) => (
                      <ProjectTab
                        key={tab.id}
                        id={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#A8FF00] animate-pulse" />
                    <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">Agent Synchronized</span>
                  </div>
                </div>
              </header>

              <section className="flex-1 flex overflow-hidden">
                {/* View: Architect Chatbot */}
                {activeTab === "chat" && (
                  <div className="flex-1 flex flex-col bg-black overflow-hidden relative text-white">
                    <InteractiveWaveShader />
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-md z-10 shrink-0">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-white/30" />
                        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">Technical Design Partner</h2>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                      <div className="space-y-8 max-w-2xl mx-auto py-10 relative z-10">
                        <AnimatePresence initial={false}>
                          {currentSession.messages.length === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8"
                            >
                              <div className="h-24 w-24 rounded-[2.5rem] bg-black flex items-center justify-center border border-white/10 shadow-2xl relative">
                                <Bot className="h-10 w-10 text-white/40" />
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1], opacity: [0, 0.2, 0] }}
                                  transition={{ repeat: Infinity, duration: 3 }}
                                  className="absolute inset-0 rounded-[2.5rem] bg-white/20 blur-2xl"
                                />
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-4xl font-extrabold tracking-tight text-white">Your vision, automated.</h3>
                                <p className="text-white/40 max-w-sm mx-auto text-base leading-relaxed font-light">"Architecture is the learned game, correct and magnificent, of forms assembled in the light."</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                {[
                                  { label: "Modern Living Room", prompt: "I want to design a modern minimalist living room with wood panels" },
                                  { label: "False Ceiling Design", prompt: "Give me ideas for a modern false ceiling with indirect lighting" },
                                  { label: "Luxury Flush Door", prompt: "I need a high-end flush door design with walnut finish" },
                                  { label: "Garden Villa Concept", prompt: "Help me conceptualize a sustainable glass villa in a garden" }
                                ].map((item) => (
                                  <button
                                    key={item.label}
                                    onClick={() => handleSend(item.prompt)}
                                    className="text-left p-5 rounded-2xl bg-black border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                                  >
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 group-hover:text-white transition-colors">{item.label}</div>
                                    <div className="text-xs text-white/60 group-hover:text-white transition-colors">Start designing this concept →</div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                          
                          {currentSession.messages.map((msg, i) => {
                            const msgId = `${i}-${msg.role}`;
                            return (
                              <motion.div
                                key={msgId}
                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className={cn(
                                  "flex gap-4 will-change-transform",
                                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}
                              >
                                <Avatar className={cn("h-10 w-10 border border-white/10 shadow-2xl shrink-0", msg.role === "user" ? "bg-black text-white" : "bg-black text-white/40")}>
                                  <AvatarFallback className="text-xs font-bold font-mono uppercase tracking-tighter">{msg.role === "user" ? "USR" : "AGT"}</AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                  "group p-6 rounded-[2rem] max-w-[85%] text-[15px] leading-relaxed shadow-2xl relative transition-all",
                                  msg.role === "user" 
                                    ? "bg-black text-white backdrop-blur-xl border border-white/10 font-medium rounded-tr-[4px]" 
                                    : "bg-black text-white border border-white/20 rounded-tl-[4px] font-medium shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
                                )}>
                                  {msg.parts[0].text}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.parts[0].text);
                                      setCopiedId(msgId);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className={cn(
                                      "absolute bottom-2 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl backdrop-blur-md border border-white/10 hover:border-white/30",
                                      msg.role === "user" 
                                        ? "-left-14 text-white/50 hover:text-white bg-white/10" 
                                        : "-right-14 text-white/50 hover:text-white bg-white/10"
                                    )}
                                  >
                                    {copiedId === msgId ? <Check className="h-3.5 w-3.5 text-[#A8FF00]" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}

                          {streamingText && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4 relative z-10">
                              <Avatar className="h-10 w-10 border border-white/10 bg-white/5 shrink-0">
                                <AvatarFallback className="text-xs font-bold font-mono text-white/40">AGT</AvatarFallback>
                              </Avatar>
                              <div className="p-6 rounded-[2rem] rounded-tl-[4px] bg-black text-white font-medium leading-relaxed text-[15px] shadow-2xl max-w-[85%] border border-white/20">
                                {streamingText}
                                <motion.span 
                                  animate={{ opacity: [0, 1, 0] }} 
                                  transition={{ repeat: Infinity, duration: 0.8 }}
                                  className="inline-block w-1 h-3.5 bg-white ml-1 align-middle"
                                />
                              </div>
                            </motion.div>
                          )}

                          {isLoading && !streamingText && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 relative z-10">
                               <Avatar className="h-10 w-10 border border-white/10 bg-white/5 shrink-0">
                                <AvatarFallback className="text-xs font-bold font-mono text-white/40">AGT</AvatarFallback>
                              </Avatar>
                              <div className="p-6 rounded-[2rem] rounded-tl-[4px] bg-black text-white border border-white/20 flex items-center gap-1.5 min-w-[80px] shadow-2xl">
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-white rounded-full" />
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-white rounded-full" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="p-8 bg-gradient-to-t from-black via-black/80 to-transparent relative z-10">
                      <div className="max-w-2xl mx-auto relative group">
                        <div className="relative group">
                          <ChatGPTInput
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onSubmit={() => handleSend()}
                            placeholder="Collaborate with your Architect agent..."
                            disabled={isLoading}
                            className="w-full bg-black border-white/20 text-white shadow-2xl backdrop-blur-xl"
                          />
                        </div>
                      </div>
                      <p className="text-center mt-6 text-[8px] uppercase tracking-[0.5em] font-black text-white/10">Neural Architecture Orchestration Center</p>
                    </div>
                  </div>
                )}

          {/* View: Cost Breakdown */}
          {activeTab === "cost" && (
            <div className="flex-1 flex flex-col bg-black overflow-hidden relative text-white">
              <InteractiveWaveShader />
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-white/30" />
                  <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">Cost Breakdown</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                   <span className="text-xs font-black text-green-400 tracking-tight">
                     {currentSession?.costBreakdown?.totalEstimate 
                       ? `₹ ${currentSession.costBreakdown.totalEstimate.toLocaleString('en-IN')}`
                       : "ESTIMATING..."}
                   </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-white/10">
                <div className="px-8 pt-6 max-w-3xl mx-auto w-full relative z-10">
                <div className="relative group">
                  <Input
                    placeholder="Add budget or constraints (e.g. 'Budget $5k')"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && currentSession?.designPrompt) {
                        handleEstimateCost(currentSession.designPrompt, costInput);
                        setCostInput("");
                      }
                    }}
                    className="bg-black text-white h-12 rounded-2xl text-sm pr-12 font-medium shadow-2xl border border-white/20 focus-visible:ring-offset-0 focus-visible:ring-white/10 placeholder:text-white/20 backdrop-blur-md"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 transition-colors rounded-xl"
                    onClick={() => {
                      if (currentSession?.designPrompt) {
                        handleEstimateCost(currentSession.designPrompt, costInput);
                        setCostInput("");
                      }
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
                {isEstimatingCost ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <LoadingBreadcrumb text="Parsing Material Data..." className="text-white scale-125" />
                  </div>
                ) : currentSession?.costBreakdown ? (
                  <div className="space-y-12">
                    {/* Summary Section - Primary Actions First */}
                    <div className="space-y-8">
                      <div className="p-10 rounded-[3rem] bg-black border border-white/20 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-md mx-auto text-center backdrop-blur-xl relative z-10">
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Total Estimated Investment</span>
                            <span className="text-6xl font-black tracking-tighter text-white">
                              ₹ {currentSession.costBreakdown.totalEstimate.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-4 text-[10px] text-white/50 font-bold leading-relaxed border-t border-white/5 pt-6">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>ALGORITHMIC ESTIMATE BASED ON SPECS</span>
                          </div>
                        </div>
                      </div>

                      {/* PDF Download Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4 relative z-20">
                         <Button 
                           onClick={() => handleDownloadPDF("Payslip")}
                           disabled={isDownloadingPDF}
                           className={cn(
                             "h-16 px-12 rounded-[2rem] font-bold text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 border-2 group",
                             downloadSuccess === "Payslip" 
                               ? "bg-green-500 border-green-500 text-white" 
                               : "bg-white text-black hover:bg-black hover:text-white border-white"
                           )}
                         >
                           {isDownloadingPDF ? (
                             <Loader2 className="h-5 w-5 animate-spin" />
                           ) : (
                             downloadSuccess === "Payslip" ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                           )}
                           {downloadSuccess === "Payslip" ? "Payslip Downloaded" : "Download Payslip"}
                         </Button>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      {["Design", "Material", "Construction", "Labor", "Furniture", "Contingency"].map((cat) => {
                        const items = currentSession.costBreakdown!.items.filter(i => i.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">{cat}s</h3>
                            <div className="space-y-4">
                              {items.map((item, idx) => (
                                <div key={idx} className="p-6 rounded-[2rem] bg-black border border-white/10 text-white shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all duration-300 backdrop-blur-md">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[15px] font-bold tracking-tight">{item.item}</span>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}</span>
                                  </div>
                                  <span className="text-sm font-black tracking-tighter">₹{item.total.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 text-white/10 relative z-10">
                    <div className="h-24 w-24 rounded-[2.5rem] bg-black flex items-center justify-center border border-white/20 shadow-2xl">
                      <IndianRupee className="h-12 w-12 text-white/40" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-white/20">Awaiting Specifications</h3>
                      <p className="text-xs max-w-[220px] mx-auto leading-relaxed text-white/40">Please use the chat assistant first to generate a design concept.</p>
                      <Button variant="link" onClick={() => setActiveTab("chat")} className="text-white/40 hover:text-white mt-4">Go to Chat</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* View: Visualizer */}
          {activeTab === "visual" && (
            <div className="flex-1 flex flex-col bg-black overflow-hidden relative text-white">
              <InteractiveWaveShader />
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-4 w-4 text-white/30" />
                    <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">Generated Design</h2>
                  </div>
                  <div className="flex items-center bg-black rounded-lg p-1 border border-white/20 shadow-xl">
                    {(["1K", "2K", "4K"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                          imageSize === size ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-white/40 hover:text-white"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                {currentSession?.designImage && (
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/10 bg-white/5 backdrop-blur-md rounded-xl">
                    <Download className="h-5 w-5" />
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-white/10">
                {/* ── Style Preset Selector ── */}
                <div className="px-8 pt-8 pb-10 space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-white/20" />
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Aesthetic Presets</label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {STYLE_PRESETS.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className={cn(
                          "p-4 rounded-[2rem] flex flex-col items-center gap-3 transition-all duration-300 relative overflow-hidden group border",
                          selectedStyle.id === style.id
                            ? "bg-black text-white border-white/40 shadow-[0_10px_40px_rgba(255,255,255,0.1)] scale-105"
                            : "bg-black text-white/40 border-white/10 hover:bg-black hover:text-white hover:border-white/20"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center transition-colors relative z-10",
                          selectedStyle.id === style.id ? "bg-white/10" : "bg-white/5"
                        )}>
                          <style.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{style.name}</span>
                        {selectedStyle.id === style.id && (
                          <motion.div layoutId="preset-indicator" className="absolute inset-0 border-2 border-white/50 rounded-[2rem] pointer-events-none" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

              {!currentSession?.designPrompt ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
                  <div className="h-24 w-24 rounded-[2.5rem] bg-black flex items-center justify-center border border-white/20 shadow-2xl relative">
                    <ImageIcon className="h-12 w-12 text-white/20" />
                    <Bot className="h-6 w-6 text-white/60 absolute -bottom-2 -right-2" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold tracking-tight text-white">Awaiting Visual Vision</h3>
                    <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed italic">
                      "Use chat to describe your idea, then finalize the visual render here."
                    </p>
                    <div className="pt-4">
                      <Button 
                        onClick={() => setActiveTab("chat")} 
                        className="bg-white text-black hover:bg-white/90 rounded-xl font-bold"
                      >
                        Go to Architecture Chat
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-8 flex flex-col gap-10 max-w-5xl mx-auto w-full relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                          <Bot className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Technical Design Concept</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(currentSession.designPrompt!)}
                        className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-lg"
                      >
                        {copied ? <Check className="h-4 w-4 text-[#A8FF00]" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="p-8 rounded-[2.5rem] bg-black text-white shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative overflow-hidden group backdrop-blur-xl border border-white/10">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Palette className="h-32 w-32 -rotate-12 text-white" />
                      </div>
                      <p className="text-[17px] font-medium leading-[1.6] tracking-tight relative z-10 antialiased text-white">
                        {currentSession.designPrompt}
                      </p>
                      
                      <div className="mt-8 flex flex-wrap gap-2 relative z-10 pt-6 border-t border-white/10">
                        <div className="px-4 py-1.5 rounded-full bg-black border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
                          {selectedStyle.name}
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest">
                          {imageSize} RESOLUTION
                        </div>
                      </div>
                    </div>

                    {(!currentSession.designImages || currentSession.designImages.length === 0) && !isGeneratingImage && (
                      <div className="pt-4 flex justify-center">
                         <Button 
                          onClick={() => handleGenerateDesign(currentSession.designPrompt!)}
                          className="bg-white text-black hover:bg-white/90 h-14 px-10 rounded-2xl text-md font-black shadow-2xl transition-all active:scale-95 group"
                        >
                          <Sparkles className="h-5 w-5 mr-3 group-hover:animate-pulse" />
                          Finalize Visual Render
                        </Button>
                      </div>
                    )}
                  </div>

                  {isGeneratingImage && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6 relative z-10">
                      <div className="relative h-32 w-32 mb-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                          className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-white/20"
                        />
                        <motion.div 
                          animate={{ rotate: -360 }}
                          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                          className="absolute inset-4 rounded-[2rem] border-2 border-dashed border-[#A8FF00]/40"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bot className="h-8 w-8 text-white/40" />
                        </div>
                      </div>
                      <LoadingBreadcrumb text="Simulating 4 Architectural Variations..." className="text-white scale-125" />
                      <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold animate-pulse">Running Neural Rendering Engine v4.2</p>
                    </div>
                  )}

                  {!isGeneratingImage && currentSession.designImages && currentSession.designImages.length > 0 && (
                    <div className="shrink-0 space-y-6 relative z-10">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                            Design Matrix <span className="text-white/20 ml-2">[{currentSession.designImages.length} DESIGNS]</span>
                          </h3>
                        </div>
                        <Button 
                          onClick={() => handleGenerateDesign(currentSession.designPrompt!)}
                          disabled={isGeneratingImage}
                          size="sm"
                          className="h-10 px-6 text-[10px] tracking-widest uppercase font-black bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                        >
                          ⟳ Regenerate Collection
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-2">
                        {currentSession.designImages.map((img, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateSession(currentSessionId!, { designImage: img })}
                            className={cn(
                              "relative group rounded-[2.5rem] overflow-hidden border-2 cursor-pointer transition-all aspect-square shadow-2xl",
                              currentSession.designImage === img 
                                ? "border-[#A8FF00] shadow-[#A8FF00]/10 ring-4 ring-[#A8FF00]/10 scale-[1.03] z-10" 
                                : "border-white/5 hover:border-white/20 grayscale-[0.4] hover:grayscale-0"
                            )}
                          >
                            <img src={img} alt={`Design variant ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                            
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImage(img);
                                }}
                                className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/40"
                              >
                                <Maximize size={14} />
                              </button>
                            </div>

                            {currentSession.designImage === img && (
                              <div className="absolute top-4 left-4 bg-[#A8FF00] text-black rounded-full px-3 py-1 font-black text-[9px] tracking-[0.1em] shadow-[0_0_20px_rgba(168,255,0,0.4)]">
                                SELECTED
                              </div>
                            )}

                            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between translate-y-2 group-hover:translate-y-0 transition-transform">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Variant</span>
                                <span className="text-2xl font-black text-[#A8FF00]">0{idx + 1}</span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnterRoom(img);
                                }}
                                className="h-10 w-10 rounded-full bg-[#A8FF00] text-black flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                              >
                                <Sparkles size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentSession.designImage && !isGeneratingImage && (
                    <div className="space-y-6 relative z-10 pt-10 border-t border-white/5">
                      <div className="flex items-end justify-between px-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Active Selection</span>
                          <h3 className="text-xl font-bold text-white tracking-tight">Main Visualization Focus</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            onClick={() => handleEnterRoom(currentSession.designImage!)} 
                            className="bg-[#A8FF00] text-black hover:bg-[#8CD300] h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_8px_25px_rgba(168,255,0,0.2)] transition-all active:scale-95"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            3D Immersive Flow
                          </Button>
                        </div>
                      </div>
                    
                      <motion.div 
                        layoutId="active-image"
                        className="relative rounded-[3rem] overflow-hidden border border-white/10 bg-black min-h-[500px] group shadow-[0_40px_100px_rgba(0,0,0,0.5)] cursor-pointer"
                        onClick={() => setSelectedImage(currentSession.designImage!)}
                      >
                        <img 
                          src={currentSession.designImage} 
                          alt="Main Selection" 
                          className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40" />
                        <div className="absolute bottom-10 left-10 flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A8FF00]">Master Visual</span>
                          <p className="text-white/60 text-xs font-medium max-w-md line-clamp-2 italic">
                            "{currentSession.designPrompt}"
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {!currentSession.designImage && !isGeneratingImage && (!currentSession.designImages || currentSession.designImages.length === 0) && (
                    <div className="flex-[2] relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black min-h-[500px] flex items-center justify-center relative z-10">
                      <div className="flex flex-col items-center text-white/20">
                        <ImageIcon className="h-24 w-24 mb-6 opacity-40" />
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Visualization Engine Ready</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </section>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-black/80 backdrop-blur-xl">
            <LoadingBreadcrumb text="Initializing Agent Intelligence..." className="text-white" />
          </div>
        )}
      </AnimatePresence>
    </main>

    <AnimatePresence>
      {selectedImage && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex flex-col gap-6" onClick={e => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute -top-12 -right-12 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 rounded-full h-10 w-10 backdrop-blur-md z-[110]"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative overflow-hidden rounded-[2.5rem] border border-white/20 shadow-2xl bg-black aspect-video"
            >
              <img 
                src={selectedImage} 
                alt="High Resolution Design" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            <div className="flex flex-wrap items-center justify-center gap-3 bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <Button 
                onClick={() => {
                  setSelectedImage(null);
                  handleEnterRoom(selectedImage);
                }}
                className="gap-2 h-12 px-6 rounded-xl bg-[#A8FF00] text-black hover:bg-[#8CD300] border-0"
              >
                Enter Room
              </Button>

              <Button 
                onClick={() => {
                  const text = encodeURIComponent("Check out this architectural design!");
                  const url = encodeURIComponent(window.location.href);
                  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                }}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-12 px-5 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">WhatsApp</span>
              </Button>
              
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(selectedImage);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-12 px-5 gap-2"
              >
                {copied ? <Check className="h-4 w-4 text-[#A8FF00]" /> : <Share2 className="h-4 w-4" />}
                <span className="font-bold text-xs uppercase tracking-wider">{copied ? "Copied!" : "Image Link"}</span>
              </Button>
              
              <Button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = selectedImage;
                  a.download = `arch-design-${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="bg-white text-black hover:bg-white/90 rounded-xl h-12 px-8 gap-2 ml-auto"
              >
                <Download className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Download High-Res</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* StudioAI Immersive 3D Viewer */}
    <AnimatePresence>
      {showImmersiveViewer && immersiveConcept && (
        <Viewer3D 
          design={immersiveConcept} 
          onClose={() => {
            setShowImmersiveViewer(false);
            setImmersiveConcept(null);
          }} 
        />
      )}
    </AnimatePresence>
  </motion.div>
);
}

