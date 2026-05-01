import { useState, useEffect, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import Viewer3D from "@/components/Viewer3D";
import { Waves } from "@/components/ui/wave-background";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import { getArchitectStream, getCostEstimation, generateDesignImage, generateMultipleDesignImages, generateProjectTitle, enhancePrompt, type CostBreakdown } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import AnoAI from "@/components/ui/animated-shader-background";
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

const StatusBadge = ({ endpoint, provider, label }: { endpoint: string, provider: string, label: string }) => {
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
};

const UserProfileLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-2 text-white">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function OrchestrationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"chat" | "cost" | "visual">("chat");
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEstimatingCost, setIsEstimatingCost] = useState(false);
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

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("arch_agent_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (err) {
      console.error("Failed to parse sessions from localStorage", err);
      createNewSession();
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("arch_agent_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
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

      <Waves className="opacity-30" />
      <AnoAI />
      {/* Subtle Architectural Backdrop */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{ 
          backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
        }}
      />

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
                    <span className="text-sm font-bold tracking-tight">John Doe</span>
                    <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Enterprise Plan</span>
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
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all",
                          activeTab === tab.id 
                            ? "bg-white text-black shadow-lg" 
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
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
                  <div className="flex-1 flex flex-col bg-black/10 backdrop-blur-sm relative">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md z-10">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-white/40" />
                        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/40">Technical Design Partner</h2>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                      <div className="space-y-8 max-w-2xl mx-auto py-10">
                        <AnimatePresence initial={false}>
                          {currentSession.messages.length === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8"
                            >
                              <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl relative">
                                <Bot className="h-10 w-10 text-white/20" />
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1], opacity: [0, 0.2, 0] }}
                                  transition={{ repeat: Infinity, duration: 3 }}
                                  className="absolute inset-0 rounded-[2.5rem] bg-white blur-2xl"
                                />
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-4xl font-extrabold tracking-tight">Your vision, automated.</h3>
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
                                    className="text-left p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                                  >
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-2 group-hover:text-white transition-colors">{item.label}</div>
                                    <div className="text-xs text-white/40 group-hover:text-white/80 transition-colors">Start designing this concept →</div>
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
                                <Avatar className={cn("h-10 w-10 border border-white/10 shadow-2xl shrink-0", msg.role === "user" ? "bg-white text-black" : "bg-white/10")}>
                                  <AvatarFallback className="text-xs font-bold font-mono uppercase tracking-tighter">{msg.role === "user" ? "USR" : "AGT"}</AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                  "group p-6 rounded-[1.75rem] max-w-[85%] text-[14px] leading-relaxed shadow-2xl border backdrop-blur-3xl relative transition-all",
                                  msg.role === "user" 
                                    ? "bg-white text-black font-semibold border-white/20 rounded-tr-[4px]" 
                                    : "bg-white/5 border-white/10 text-white/90 rounded-tl-[4px] font-medium"
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
                                        ? "-left-14 text-white/30 hover:text-white bg-white/5" 
                                        : "-right-14 text-white/30 hover:text-white bg-white/5"
                                    )}
                                  >
                                    {copiedId === msgId ? <Check className="h-3.5 w-3.5 text-[#A8FF00]" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}

                          {streamingText && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4">
                              <Avatar className="h-10 w-10 border border-white/10 bg-white/10 shrink-0">
                                <AvatarFallback className="text-xs font-bold font-mono">AGT</AvatarFallback>
                              </Avatar>
                              <div className="p-6 rounded-[1.75rem] rounded-tl-[4px] bg-white/5 border border-white/5 text-white/90 font-medium italic leading-relaxed text-[14px] backdrop-blur-3xl shadow-2xl max-w-[85%]">
                                {streamingText}
                                <motion.span 
                                  animate={{ opacity: [0, 1, 0] }} 
                                  transition={{ repeat: Infinity, duration: 0.8 }}
                                  className="inline-block w-1 h-3.5 bg-[#A8FF00] ml-1 align-middle"
                                />
                              </div>
                            </motion.div>
                          )}

                          {isLoading && !streamingText && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                               <Avatar className="h-10 w-10 border border-white/10 bg-white/10 shrink-0">
                                <AvatarFallback className="text-xs font-bold font-mono">AGT</AvatarFallback>
                              </Avatar>
                              <div className="p-6 rounded-[1.75rem] rounded-tl-[4px] bg-white/5 border border-white/5 flex items-center gap-1.5 min-w-[80px]">
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-white rounded-full" />
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-white rounded-full" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <div className="max-w-2xl mx-auto relative group">
                        <div className="relative group">
                          <ChatGPTInput
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onSubmit={() => handleSend()}
                            placeholder="Collaborate with your Architect agent..."
                            disabled={isLoading}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <p className="text-center mt-6 text-[8px] uppercase tracking-[0.5em] font-black text-white/10">Neural Architecture Orchestration Center</p>
                    </div>
                  </div>
                )}

          {/* View: Cost Breakdown */}
          {activeTab === "cost" && (
            <div className="flex-1 flex flex-col bg-black/30 backdrop-blur-2xl">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-white/40" />
                  <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/40">Cost Breakdown</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                   <span className="text-xs font-black text-green-400 tracking-tight">
                     {currentSession?.costBreakdown?.totalEstimate 
                       ? `₹ ${currentSession.costBreakdown.totalEstimate.toLocaleString('en-IN')}`
                       : "ESTIMATING..."}
                   </span>
                </div>
              </div>

              <div className="px-8 pt-6 max-w-3xl mx-auto w-full">
                <div className="relative">
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
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-xs pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 text-white/40 hover:text-white"
                    onClick={() => {
                      if (currentSession?.designPrompt) {
                        handleEstimateCost(currentSession.designPrompt, costInput);
                        setCostInput("");
                      }
                    }}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-8 max-w-4xl mx-auto w-full">
                {isEstimatingCost ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <LoadingBreadcrumb text="Parsing Material Data..." className="text-white scale-125" />
                  </div>
                ) : currentSession?.costBreakdown ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {["Material", "Labor", "Contingency"].map((cat) => {
                        const items = currentSession.costBreakdown!.items.filter(i => i.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">{cat}s</h3>
                            <div className="space-y-3">
                              {items.map((item, idx) => (
                                <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all hover:translate-x-1">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold tracking-tight">{item.item}</span>
                                    <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}</span>
                                  </div>
                                  <span className="text-sm font-black tracking-tighter">₹{item.total.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl max-w-md mx-auto">
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col text-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Total Estimated Investment</span>
                          <span className="text-7xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            ₹ {currentSession.costBreakdown.totalEstimate.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-white/20 font-medium leading-relaxed border-t border-white/5 pt-6">
                          <div className="h-2 w-2 rounded-full bg-green-500/40" />
                          <span>Prices are algorithmic estimates based on specs.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 text-white/10">
                    <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/5">
                      <IndianRupee className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-white/20">Awaiting Specifications</h3>
                      <p className="text-xs max-w-[220px] mx-auto leading-relaxed">Please use the chat assistant first to generate a design concept.</p>
                      <Button variant="link" onClick={() => setActiveTab("chat")} className="text-white/40 hover:text-white mt-4">Go to Chat</Button>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* View: Visualizer */}
          {activeTab === "visual" && (
            <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-xl">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-4 w-4 text-white/40" />
                    <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/40">Generated Design</h2>
                  </div>
                  <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                    {(["1K", "2K", "4K"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                          imageSize === size ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
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

              {/* ── Style Preset Selector (from StudioAI) ── */}
              <div className="px-8 pt-5 pb-3 border-b border-white/5 bg-black/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-cyan-400" />
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Style Preset</label>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-semibold italic">{selectedStyle.name} Selected</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                        selectedStyle.id === style.id
                          ? "bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                          : "bg-white/5 border border-white/5 text-white/40 hover:border-white/20 hover:text-white/70"
                      )}
                      title={style.description}
                      id={`style-${style.id}`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {!currentSession?.designPrompt ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl relative">
                    <ImageIcon className="h-12 w-12 text-white/10" />
                    <Bot className="h-6 w-6 text-white/40 absolute -bottom-2 -right-2" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold tracking-tight">Image Gen model offline</h3>
                    <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed italic">
                      "Use chat to describe your idea"
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
                <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto max-w-5xl mx-auto w-full">
                  <Card className="bg-white/5 border-white/10 text-white overflow-hidden rounded-3xl shadow-2xl shrink-0">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Technical Design Prompt</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(currentSession.designPrompt!)}
                        className="h-6 w-6 rounded-lg hover:bg-white/10"
                      >
                        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-white/40" />}
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <p className="text-xs font-mono text-white/60 leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/5">
                          "{currentSession.designPrompt}"
                        </p>
                      </div>
                      {(!currentSession.designImages || currentSession.designImages.length === 0) && !isGeneratingImage && (
                        <div className="mt-3">
                           <Button 
                            onClick={() => handleGenerateDesign(currentSession.designPrompt!)}
                            className="bg-white text-black hover:bg-white/90 w-full rounded-lg text-xs font-bold h-9"
                          >
                            Generate 4 Design Variants
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Thumbnail Gallery: 4 Variants ── */}
                  {isGeneratingImage && (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <LoadingBreadcrumb text="Generating 4 Design Variants..." className="text-white scale-125" />
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">This may take 15–30 seconds</p>
                    </div>
                  )}

                  {!isGeneratingImage && currentSession.designImages && currentSession.designImages.length > 0 && (
                    <div className="shrink-0 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                          Select Your Favorite — {currentSession.designImages.length} Variants
                        </h3>
                        <Button 
                          onClick={() => handleGenerateDesign(currentSession.designPrompt!)}
                          disabled={isGeneratingImage}
                          size="sm"
                          className="h-7 text-[10px] tracking-wider uppercase font-bold bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        >
                          ⟳ Regenerate All
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {currentSession.designImages.map((img, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => updateSession(currentSessionId!, { designImage: img })}
                            className={cn(
                              "relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-square shadow-lg",
                              currentSession.designImage === img 
                                ? "border-[#A8FF00] shadow-[0_0_25px_rgba(168,255,0,0.25)] ring-2 ring-[#A8FF00]/20" 
                                : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100"
                            )}
                          >
                            <img src={img} alt={`Design variant ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {currentSession.designImage === img && (
                              <div className="absolute top-2 right-2 bg-[#A8FF00] text-black rounded-full p-1.5 shadow-lg">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">Variant {idx + 1}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Selected Design Preview + Enter Room (StudioAI 3D View) ── */}
                  {currentSession.designImage && !isGeneratingImage && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Selected Design Preview</h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => handleEnterRoom(currentSession.designImage!)} 
                            size="sm" 
                            className="h-7 text-[10px] tracking-wider uppercase font-bold bg-[#A8FF00] text-black hover:bg-[#8CD300] transition-colors"
                          >
                            Enter Room
                          </Button>
                        </div>
                      </div>
                    
                      <div 
                        className="flex-[2] relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 min-h-[500px] group shadow-2xl cursor-pointer"
                        onClick={() => {
                            if (currentSession?.designImage) {
                              setSelectedImage(currentSession.designImage);
                            }
                          }}>
                        <img 
                          src={currentSession.designImage} 
                          alt="Selected Design" 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </>
                  )}

                  {/* Empty state when no images yet and not generating */}
                  {!currentSession.designImage && !isGeneratingImage && (!currentSession.designImages || currentSession.designImages.length === 0) && (
                    <div className="flex-[2] relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 min-h-[500px] flex items-center justify-center">
                      <div className="flex flex-col items-center text-white/10">
                        <ImageIcon className="h-24 w-24 mb-6 opacity-50" />
                        <p className="text-sm font-bold uppercase tracking-[0.2em]">Visualization Engine Ready</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-black/40 backdrop-blur-xl">
            <LoadingBreadcrumb text="Initializing Agent Intelligence..." />
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

