import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  transparent?: boolean;
}

export function Logo({ className, iconSize = 8, textSize = "text-2xl", transparent = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative group">
        {!transparent && <div className="absolute -inset-2 bg-gradient-to-r from-white/40 to-white/0 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-1000" />}
        <div className={cn(
          "relative h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
          transparent 
            ? "bg-transparent border-none shadow-none" 
            : "bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-2xl backdrop-blur-xl group-hover:border-white/40"
        )}>
          <Bot className={cn("text-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", `h-${iconSize} w-${iconSize}`)} />
        </div>
      </div>
      <div className="flex flex-col">
        <LiquidButton 
          className="pointer-events-none px-0 h-auto bg-transparent border-none shadow-none" 
          size="default"
        >
          <h1 className={cn("font-black tracking-tighter font-sans leading-none bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]", textSize)}>
            Arch Agent
          </h1>
        </LiquidButton>
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 mt-1.5 ml-0.5">Autonomous AI Agent</span>
      </div>
    </div>
  );
}
