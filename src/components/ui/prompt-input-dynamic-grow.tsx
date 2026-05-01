import React, { createContext, useContext, useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import { Plus, Send, X, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";

// ===== TYPES =====

type MenuOption = "Auto" | "Max" | "Search" | "Plan";

interface RippleEffect {
  x: number;
  y: number;
  id: number;
}

interface Position {
  x: number;
  y: number;
}

interface ChatInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  onFileDrop?: (file: File) => void;
  disabled?: boolean;
  glowIntensity?: number;
  expandOnFocus?: boolean;
  animationDuration?: number;
  textColor?: string;
  backgroundOpacity?: number;
  showEffects?: boolean;
  menuOptions?: MenuOption[];
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

interface InputAreaProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  isSubmitDisabled: boolean;
  textColor: string;
  onFocus?: () => void;
  onBlur?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface GlowEffectsProps {
  glowIntensity: number;
  mousePosition: Position;
  animationDuration: number;
  enabled: boolean;
}

interface RippleEffectsProps {
  ripples: RippleEffect[];
  enabled: boolean;
}

interface MenuButtonProps {
  toggleMenu: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isMenuOpen: boolean;
  onSelectOption: (option: MenuOption) => void;
  textColor: string;
  menuOptions: MenuOption[];
}

interface SelectedOptionsProps {
  options: MenuOption[];
  onRemove: (option: MenuOption) => void;
  textColor: string;
}

interface SendButtonProps {
  isDisabled: boolean;
  textColor: string;
}

interface OptionsMenuProps {
  isOpen: boolean;
  onSelect: (option: MenuOption) => void;
  textColor: string;
  menuOptions: MenuOption[];
}

interface OptionTagProps {
  option: MenuOption;
  onRemove: (option: MenuOption) => void;
  textColor: string;
}

// ===== CONTEXT =====

interface ChatInputContextProps {
  mousePosition: Position;
  ripples: RippleEffect[];
  addRipple: (x: number, y: number) => void;
  animationDuration: number;
  glowIntensity: number;
  textColor: string;
  showEffects: boolean;
}

const ChatInputContext = createContext<ChatInputContextProps | undefined>(undefined);

// ===== COMPONENTS =====

const SendButton = memo(({ 
  isDisabled,
  textColor
}: SendButtonProps) => {
  return (
    <button
      type="submit"
      aria-label="Send message"
      disabled={isDisabled}
      className={cn(
        "ml-auto self-center h-8 w-8 flex items-center justify-center rounded-full border-0 p-0 transition-all z-20",
        isDisabled
          ? "opacity-40 cursor-not-allowed bg-white/10 text-white/40"
          : "opacity-90 bg-white text-black hover:opacity-100 cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
});

const OptionsMenu = memo(({ 
  isOpen, 
  onSelect,
  textColor,
  menuOptions 
}: OptionsMenuProps) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-zinc-900/90 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-30 min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <ul className="py-2">
        {menuOptions.map((option) => (
          <li
            key={option}
            className="px-4 py-2 hover:bg-white/10 cursor-pointer text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
            onClick={() => onSelect(option)}
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
});

const OptionTag = memo(({ 
  option, 
  onRemove,
  textColor 
}: OptionTagProps) => (
  <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/5">
    <span>{option}</span>
    <button
      type="button"
      onClick={() => onRemove(option)}
      aria-label={`Remove ${option}`}
      className="h-3 w-3 flex items-center justify-center rounded-full hover:bg-white/20 text-white/50 hover:text-white transition-colors"
    >
      <X size={10} />
    </button>
  </div>
));

const GlowEffects = memo(({ 
  glowIntensity, 
  mousePosition,
  animationDuration,
  enabled
}: GlowEffectsProps) => {
  if (!enabled) return null;
  
  return (
    <>
      <div 
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `
            0 0 20px rgba(168, 85, 247, ${0.15 * glowIntensity}),
            0 0 40px rgba(59, 130, 246, ${0.1 * glowIntensity})
          `,
        }}
      />
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none blur-xl"
        style={{
          background: `radial-gradient(circle 100px at ${mousePosition.x}% ${mousePosition.y}%, rgba(168,85,247,0.15) 0%, transparent 100%)`,
        }}
      />
    </>
  );
});

const RippleEffects = memo(({ ripples, enabled }: RippleEffectsProps) => {
  if (!enabled || ripples.length === 0) return null;
  
  return (
    <>
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none"
          style={{
            left: ripple.x - 25,
            top: ripple.y - 25,
            width: 50,
            height: 50,
          }}
        >
          <div className="w-full h-full rounded-full bg-white/10 animate-ping" />
        </div>
      ))}
    </>
  );
});

const InputArea = memo(({ 
  value,
  setValue,
  placeholder,
  handleKeyDown,
  disabled,
  isSubmitDisabled,
  textColor,
  onFocus,
  onBlur,
  textareaRef
}: InputAreaProps) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRefCombined = textareaRef || internalRef;
  
  useEffect(() => {
    if (textareaRefCombined.current) {
      textareaRefCombined.current.style.height = "auto";
      const scrollHeight = textareaRefCombined.current.scrollHeight;
      const maxHeight = 160;
      textareaRefCombined.current.style.height = Math.min(scrollHeight, maxHeight) + "px";
    }
  }, [value, textareaRefCombined]);
  
  return (
    <div className="flex-1 relative h-full flex items-center">
      <textarea
        ref={textareaRefCombined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={1}
        className="w-full min-h-[40px] max-h-40 bg-transparent text-sm font-medium text-white placeholder-white/20 border-0 outline-none px-3 py-2.5 z-20 relative resize-none overflow-y-auto leading-relaxed"
        disabled={disabled}
      />
      <SendButton isDisabled={isSubmitDisabled} textColor={textColor} />
    </div>
  );
});

const MenuButton = memo(({ 
  toggleMenu,
  menuRef,
  isMenuOpen,
  onSelectOption,
  textColor,
  menuOptions
}: MenuButtonProps) => (
  <div className="relative h-full flex items-center" ref={menuRef}>
    <button
      type="button"
      onClick={toggleMenu}
      className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all ml-1"
    >
      <Plus size={16} />
    </button>
    <OptionsMenu 
      isOpen={isMenuOpen} 
      onSelect={onSelectOption} 
      textColor={textColor}
      menuOptions={menuOptions}
    />
  </div>
));

export default function ChatGPTInput({
  value: externalValue,
  onChange: externalOnChange,
  onKeyDown: externalOnKeyDown,
  placeholder = "Describe your concept...",
  onSubmit = () => {},
  disabled = false,
  glowIntensity = 0.4,
  expandOnFocus = true,
  animationDuration = 500,
  textColor = "#FFFFFF",
  backgroundOpacity = 0.1,
  showEffects = true,
  menuOptions = ["Auto", "Max", "Search", "Plan"] as MenuOption[],
  inputRef,
  className
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = externalValue !== undefined ? externalValue : internalValue;
  
  const setValue = useCallback((val: string | ((prev: string) => string)) => {
    if (externalValue === undefined) {
      setInternalValue(val);
    }
    // Note: externalOnChange expects an event, we handle it in InputArea
  }, [externalValue]);
  const [isFocused, setIsFocused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([]);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 50, y: 50 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const throttleRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      if (externalValue === undefined) {
        setInternalValue("");
      }
    }
  }, [value, onSubmit, disabled, externalValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (externalOnKeyDown) {
      externalOnKeyDown(e);
      // If external handled it, we might still want to prevent default if they didn't
    }
    
    if (e.key === "Enter" && !e.shiftKey && !e.defaultPrevented) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, externalOnKeyDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showEffects || !containerRef.current) return;
    if (!throttleRef.current) {
      throttleRef.current = window.setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setMousePosition({ x, y });
        }
        throttleRef.current = null;
      }, 30);
    }
  }, [showEffects]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: Date.now() };
      setRipples(prev => [...prev.slice(-3), newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
  }, []);

  const isSubmitDisabled = disabled || !value.trim();
  const isExpanded = expandOnFocus ? (isFocused || value.trim().length > 0) : true;

  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload only image files.");
      return;
    }
    // Logic to handle image upload, run processing, estimate costs
    console.log("Processing image:", file);
    // ...
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileChange(file);
    }
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative mx-auto transition-all duration-500 ease-out z-10 w-full animate-in fade-in slide-in-from-bottom-4 shadow-2xl",
        isExpanded ? "max-w-2xl" : "max-w-md",
        isDragging && "ring-2 ring-cyan-500 ring-offset-2 ring-offset-black",
        className
      )}
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        className={cn(
          "relative flex flex-col w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 overflow-visible group transition-all duration-300",
          "hover:bg-white/[0.08]"
        )}
      >
        <GlowEffects 
          glowIntensity={glowIntensity} 
          mousePosition={mousePosition} 
          animationDuration={animationDuration}
          enabled={showEffects}
        />
        
        <RippleEffects ripples={ripples} enabled={showEffects} />
        
        <div className="flex items-start relative z-20">
          <MenuButton
            toggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            menuRef={menuRef}
            isMenuOpen={isMenuOpen}
            onSelectOption={(opt) => {
              if (!selectedOptions.includes(opt)) setSelectedOptions([...selectedOptions, opt]);
              setIsMenuOpen(false);
            }}
            textColor={textColor}
            menuOptions={menuOptions}
          />
          
          <InputArea
            value={value}
            setValue={(val) => {
              if (typeof val === 'string') {
                if (externalOnChange) {
                  const event = { target: { value: val } } as React.ChangeEvent<HTMLTextAreaElement>;
                  externalOnChange(event);
                }
              }
              setValue(val);
            }}
            placeholder={placeholder}
            handleKeyDown={handleKeyDown as any}
            disabled={disabled}
            isSubmitDisabled={isSubmitDisabled}
            textColor={textColor}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            textareaRef={inputRef}
          />
        </div>
        
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 px-3 pb-2 z-20 relative animate-in fade-in slide-in-from-top-1">
            {selectedOptions.map((option) => (
              <OptionTag 
                key={option} 
                option={option} 
                onRemove={(opt) => setSelectedOptions(selectedOptions.filter(o => o !== opt))} 
                textColor={textColor}
              />
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
