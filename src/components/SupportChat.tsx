import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "bot";
  text: string;
}

export interface SupportChatRef {
  openChat: (initialMessage?: string) => void;
}

export default forwardRef<SupportChatRef, {}>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi there! I'm your Arch Agent support assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openChat: (initialMessage?: string) => {
      setIsOpen(true);
      if (initialMessage) {
        setMessages(prev => [...prev, { role: "bot", text: initialMessage }]);
      }
    }
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user" as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botMsg = { 
        role: "bot" as const, 
        text: "I've received your message. Our technical team is looking into it. Is there anything else you'd like to specify?" 
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Shortcut Icon */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-[100] h-12 w-12 rounded-full bg-white/10 text-white shadow-2xl flex items-center justify-center border border-white/20 group overflow-hidden backdrop-blur-md transition-all duration-300 hover:bg-white/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <MessageSquare className="h-5 w-5 relative z-10" />
        <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-28 right-8 z-[100] w-96 h-[500px] glass-dark rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 backdrop-blur-3xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Support</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Always Online</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef} data-lenis-prevent>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i.toString() + msg.role}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className={cn("h-8 w-8 border border-white/10 shrink-0", msg.role === "user" ? "bg-white text-black" : "bg-white/10")}>
                      <AvatarFallback className="text-[10px] font-bold">{msg.role === "user" ? "U" : "A"}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "p-4 rounded-2xl text-xs leading-relaxed max-w-[80%] shadow-sm border",
                      msg.role === "user" ? "bg-white text-black font-semibold border-white rounded-tr-sm" : "bg-white/5 border-white/10 text-white/90 rounded-tl-sm"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="flex gap-3"
                  >
                    <Avatar className="h-8 w-8 border border-white/10 bg-white/10 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold">A</AvatarFallback>
                    </Avatar>
                    <div className="px-4 py-5 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex items-center justify-center">
                      <div className="flex gap-1.5 items-center">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: 0 }} className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }} className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: 0.4 }} className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="relative">
                <Input
                  placeholder="Type your problem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="bg-white/5 border-white/10 h-12 rounded-xl focus-visible:ring-white/20 text-xs px-4 pr-12"
                />
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1 h-10 w-10 bg-white text-black hover:bg-white/90 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
