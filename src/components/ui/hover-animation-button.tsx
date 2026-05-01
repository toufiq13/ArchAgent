import React from 'react';
import { cn } from "@/lib/utils";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const HoverAnimationButton: React.FC<ButtonProps> = ({ children = "Button", onClick, className }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group inline-flex items-center justify-center overflow-hidden rounded-2xl px-12 py-4 font-bold text-white transition-all hover:scale-105 active:scale-95 bg-zinc-900 border border-white/10",
        className
      )}
    >
      <span className="relative z-10 transition-transform duration-500 group-hover:-translate-y-full flex flex-col items-center">
        <span>{children}</span>
        <span className="absolute top-full">{children}</span>
      </span>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </button>
  );
}

export default HoverAnimationButton;
