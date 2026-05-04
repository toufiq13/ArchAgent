import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bot, User, LogOut, Settings, HelpCircle, Mail, Phone, ArrowRight, ChevronLeft, Sparkles, Eye, MessageSquare } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { Button } from "@/components/ui/button";
import SupportChat from "@/components/SupportChat";
import ContactDialog from "@/components/ContactDialog";
import { Logo } from "@/components/Logo";
import { RevealText } from "@/components/ui/reveal-text";
import Lenis from '@studio-freight/lenis';
import { StarButton } from "@/components/ui/star-button";
import HoverAnimationButton from "@/components/ui/hover-animation-button";
import { HoverButton } from "@/components/ui/hover-glow-button";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const ARCH_IMAGES = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628592102144-8da059286f7b?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541888941-252f1239ce3b?q=80&w=2070&auto=format&fit=crop"
];

const FEATURED_DESIGNS = [
  {
    title: "Minimalist Glass Villa",
    location: "Zurich, Switzerland",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    category: "Architecture"
  },
  {
    title: "Luxury Penthouse",
    location: "Dubai, UAE",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
    category: "Interior"
  },
  {
    title: "Brutalist Concrete Home",
    location: "Tokyo, Japan",
    image: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop",
    category: "Architecture"
  },
  {
    title: "Modern Multi-Level Ceiling",
    location: "Oslo, Norway",
    image: "/showcase/ceiling.webp",
    category: "Ceiling"
  },
  {
    title: "High-End Walnut Door Interior",
    location: "Milan, Italy",
    image: "/showcase/door.webp",
    category: "Doors"
  },
  {
    title: "Glass Office Complex",
    location: "London, UK",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
    category: "Architecture"
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [isAuthenticated] = useState(() => {
    const token = localStorage.getItem("auth_token");
    return token === "true" || token === "mock";
  });
  const [bgImage, setBgImage] = useState(ARCH_IMAGES[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, title: string} | null>(null);
  const supportRef = useRef<{openChat: (msg: string) => void}>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgImage(prev => {
        const currentIndex = ARCH_IMAGES.indexOf(prev);
        return ARCH_IMAGES[(currentIndex + 1) % ARCH_IMAGES.length];
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    localStorage.removeItem("auth_token");
    window.location.reload();
  };

  const handleLaunchWorkspace = () => {
    const randomImg = ARCH_IMAGES[Math.floor(Math.random() * ARCH_IMAGES.length)];
    setBgImage(randomImg);
    setTimeout(() => navigate("/orchestration"), 300);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen w-full overflow-x-hidden bg-black font-sans text-white"
    >
      {/* Background Image with Overlay */}
      <AnimatePresence mode="popLayout">
        <motion.div 
          key={bgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat will-change-[opacity]"
          style={{ 
            backgroundImage: `url('${bgImage}')`,
            filter: "brightness(0.6) contrast(1.1)"
          }}
        />
      </AnimatePresence>
      
      {/* Global Header */}
      <header className="relative z-50 flex h-24 items-center justify-between px-8 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-6">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="group relative h-14 w-14 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95" />}>
              <MenuToggleIcon open={isMenuOpen} className="relative z-10 h-6 w-6 text-white/80 transition-colors group-hover:text-white" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
            </SheetTrigger>
            <SheetContent side="left" className="bg-black/60 border-white/5 text-white backdrop-blur-3xl">
              <SheetHeader>
                <SheetTitle className="mb-8">
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    supportRef.current?.openChat("Wts the issue?");
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group w-full text-left"
                >
                  <HelpCircle className="h-5 w-5 text-white/30 group-hover:text-white" />
                  <span className="font-medium">Support</span>
                </button>
                <button 
                  onClick={() => {
                    setIsContactOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group w-full text-left"
                >
                  <Mail className="h-5 w-5 text-white/30 group-hover:text-white" />
                  <span className="font-medium">Contact Us</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="opacity-60 hover:opacity-100 transition-all duration-700 cursor-pointer hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">
            <Logo transparent />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button 
                  variant="ghost" 
                  className="group relative h-14 w-14 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95" 
                />
              }>
                <User className="relative z-10 h-6 w-6 text-white/80 transition-colors group-hover:text-white" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black/60 border-white/10 text-white backdrop-blur-3xl rounded-2xl p-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-red-400/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={() => navigate("/login")} 
              className="group relative overflow-hidden bg-white text-black font-semibold rounded-full px-8 h-12 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-[150%] transition-transform duration-700 ease-in-out group-hover:translate-x-[150%] z-0" />
            </Button>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl"
        >
          <div className="mb-8">
            <RevealText 
              text="AUTONOMOUS"
              fontSize="text-6xl md:text-8xl"
              className="mb-2"
            />
            <RevealText 
              text="DESIGN & ESTIMATION"
              fontSize="text-4xl md:text-6xl"
              textColor="text-white/80"
              letterDelay={0.05}
            />
          </div>
          <p className="text-xl md:text-2xl text-white/40 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Empowering architects with agentic workflows for rapid conceptualization and precision cost analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <HoverAnimationButton 
              onClick={handleLaunchWorkspace}
              className="h-[72px] px-12 text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 min-w-[280px] flex items-center justify-center !p-0"
            >
              Launch Workspace
            </HoverAnimationButton>
            <HoverButton 
              onClick={() => navigate("/showcase")}
              className="h-[72px] px-12 text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 min-w-[280px] flex items-center justify-center"
              glowColor="#ffffff"
              hoverTextColor="#ffffff"
              backgroundColor="rgba(255,255,255,0.03)"
            >
              View Showcase
            </HoverButton>
          </div>
        </motion.div>

        {/* Featured Designs Gallery */}
        <section className="mt-32 w-full max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-white/40" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Curated Gallery</span>
              </div>
              <h2 className="text-5xl font-bold tracking-tight mb-4">Featured Designs</h2>
              <p className="text-white/40 max-w-md text-lg font-light">Explore high-end architectural masterpieces and detailed interior concepts.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Button 
                variant="ghost" 
                onClick={() => navigate("/showcase")}
                className="text-white/40 hover:text-white group"
              >
                Explore Full Showcase <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {FEATURED_DESIGNS.map((design, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="group relative aspect-[16/10] rounded-[3rem] overflow-hidden border border-white/5 bg-white/5 cursor-pointer will-change-transform"
                onClick={() => setSelectedImage({ src: design.image, title: design.title })}
              >
                <img 
                  src={design.image} 
                  alt={design.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-white/50 mb-2">{design.category}</p>
                      <h4 className="text-3xl font-bold tracking-tight">{design.title}</h4>
                      <p className="text-white/40 mt-1 font-light">{design.location}</p>
                    </div>
                    <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                      <Eye className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-6xl w-full pb-32">
          {[
            { title: "Architect AI", desc: "Intelligent design partner that understands constraints and generates professional prompts." },
            { title: "Visual Generation", desc: "State-of-the-art image generation for architectural concepts and interior designs." },
            { title: "Cost Estimation", desc: "Automated material parsing and itemized financial breakdowns for every project." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.08)" }}
              onClick={() => navigate("/orchestration")}
              className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-md transition-all text-left group cursor-pointer will-change-transform"
            >
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-500">
                <ArrowRight className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-white/40 font-light leading-relaxed text-lg">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 flex flex-col items-center gap-8 text-center text-white/20 text-xs tracking-widest uppercase bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.href = "mailto:support@archagent.ai"}
            className="group relative flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] active:scale-95 text-white/70 hover:text-white font-semibold"
          >
            <Mail className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Email Us</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
          </button>
          <button 
            onClick={() => setIsContactOpen(true)}
            className="group relative flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] active:scale-95 text-white/70 hover:text-white font-semibold"
          >
            <Phone className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Call Us</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
          </button>
        </div>
        <p className="opacity-60">© 2026 Arch Agent. All rights reserved.</p>
      </footer>

      {/* Support & Contact Components */}
      <SupportChat ref={supportRef} />
      <ContactDialog isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      {selectedImage && (
        <ImageLightbox 
          images={[selectedImage]} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </motion.div>
  );
}