import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, ChevronLeft, Bot, Sparkles } from "lucide-react";
import { AnimatedCharacters } from "@/components/ui/animated-characters-login-page";
import { Logo } from "@/components/Logo";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validateIdentifier = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    
    if (!value) {
      return "Please enter your email or mobile number";
    }
    if (!emailRegex.test(value) && !phoneRegex.test(value)) {
      return "Please enter a valid email or 10-digit mobile number";
    }
    return "";
  };

  const handleIdentifierSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const error = validateIdentifier(identifier);
    if (error) {
      setErrorMsg(error);
      return;
    }
    
    setErrorMsg("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
    }, 1500);
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem("auth_token", "true");
      onLogin();
      navigate("/orchestration");
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen grid lg:grid-cols-2 bg-[#050505] font-sans text-white overflow-hidden"
    >
      {/* Left Section: Animated Characters */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-black/20">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')",
            filter: "brightness(0.5) contrast(1.2)"
          }}
        />
        
        <div className="relative z-20 flex items-center gap-4">
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
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <AnimatedCharacters 
            isTyping={isTyping} 
            passwordLength={step === "otp" ? otp.length : identifier.length} 
            showPassword={step === "otp"} 
          />
        </div>

        <div className="relative z-20 flex items-center gap-8 text-xs font-bold uppercase tracking-[0.2em] text-white/20">
          <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-white transition-colors cursor-pointer">Support</span>
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="relative flex items-center justify-center p-8">
        {/* Background for mobile */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat lg:hidden opacity-10"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')",
          }}
        />

        {/* Mobile Header (Hidden on LG) */}
        <div className="absolute top-8 left-8 right-8 flex lg:hidden items-center justify-between z-20">
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
          <Logo iconSize={5} textSize="text-lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="glass-dark p-10 rounded-[3rem] border-white/10 shadow-2xl backdrop-blur-3xl relative">
            <motion.div
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-6 left-6 z-20 hidden lg:block"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")}
                className="group relative h-10 w-10 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm p-0 overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-95"
                title="Go Back"
              >
                <ChevronLeft className="relative z-10 h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
              </Button>
            </motion.div>

            <div className="flex flex-col items-center mb-10 mt-2">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 shadow-xl backdrop-blur-md"
              >
                <Bot className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Enterprise Design Portal</p>
            </div>

            <form onSubmit={step === "identifier" ? handleIdentifierSubmit : handleOtpSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {step === "identifier" ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email or Mobile Number</label>
                      <Input
                        type="text"
                        placeholder="name@company.com"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          if (errorMsg) setErrorMsg("");
                        }}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        required
                        className="h-14 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-white/20 text-lg px-6 transition-all focus:bg-white/10"
                      />
                      {errorMsg && step === "identifier" && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="text-red-400 text-xs font-medium ml-2 mt-2"
                        >
                          {errorMsg}
                        </motion.p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-[0.98] border border-white/20"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Continue"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Verification Code</label>
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        required
                        className="h-14 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-white/20 text-center text-2xl tracking-[0.5em] font-mono transition-all focus:bg-white/10"
                      />
                      <p className="text-[10px] text-center text-white/30 mt-2">Enter the 6-digit code sent to your device</p>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading || otp.length < 4}
                      className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-[0.98] border border-white/20"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify & Login"}
                    </Button>
                    <motion.button 
                      whileHover={{ x: -5 }}
                      type="button"
                      onClick={() => setStep("identifier")}
                      className="flex items-center justify-center w-full text-xs text-white/40 hover:text-white transition-colors py-2"
                    >
                      <ArrowLeft className="mr-2 h-3 w-3" />
                      Back to identifier
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
          
          <p className="mt-12 text-center text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
            Arch Agent © 2026 • Secure Enterprise Access
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
