import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, DoorOpen, Layout, Grid, Monitor, Sparkles, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Logo } from "@/components/Logo";

const ARCH_IMAGES = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628592102144-8da059286f7b?q=80&w=2070&auto=format&fit=crop"
];

const TEMPLATE_DATA: Record<string, string[]> = {
  door: [
    "https://images.unsplash.com/photo-1506377295352-e3154d43ea9e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1527030280862-64139fba04ca?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7eaa511?auto=format&fit=crop&w=400&q=80"
  ],
  ceiling: [
    "https://image.pollinations.ai/prompt/luxury-modern-tray-ceiling-led-lighting?width=400&height=400&nologo=true&seed=1",
    "https://image.pollinations.ai/prompt/minimalist-wood-beam-ceiling-design?width=400&height=400&nologo=true&seed=2",
    "https://image.pollinations.ai/prompt/architectural-concrete-ceiling-loft?width=400&height=400&nologo=true&seed=3",
    "https://image.pollinations.ai/prompt/coffered-ceiling-classic-luxury?width=400&height=400&nologo=true&seed=4"
  ],
  wall: [
    "https://image.pollinations.ai/prompt/modern-wall-paneling-wood-texture?width=400&height=400&nologo=true&seed=5",
    "https://image.pollinations.ai/prompt/abstract-geometric-3d-wall-art?width=400&height=400&nologo=true&seed=6",
    "https://image.pollinations.ai/prompt/exposed-brick-industrial-wall?width=400&height=400&nologo=true&seed=7",
    "https://image.pollinations.ai/prompt/textured-plaster-minimalist-wall?width=400&height=400&nologo=true&seed=8"
  ],
  tv: [
    "https://image.pollinations.ai/prompt/modern-tv-wall-showcase-minimalist?width=400&height=400&nologo=true&seed=9",
    "https://image.pollinations.ai/prompt/luxury-media-center-floating-shelves?width=400&height=400&nologo=true&seed=10",
    "https://image.pollinations.ai/prompt/industrial-tv-entertainment-unit?width=400&height=400&nologo=true&seed=11",
    "https://image.pollinations.ai/prompt/integrated-tv-cabinetry-living-room?width=400&height=400&nologo=true&seed=12"
  ],
  window: [
    "https://image.pollinations.ai/prompt/modern-interior-window-natural-light?width=400&height=400&nologo=true&seed=1",
    "https://image.pollinations.ai/prompt/floor-to-ceiling-glass-window-scenic?width=400&height=400&nologo=true&seed=2",
    "https://image.pollinations.ai/prompt/minimalist-window-frame-architecture?width=400&height=400&nologo=true&seed=3",
    "https://image.pollinations.ai/prompt/circular-architectural-window-design?width=400&height=400&nologo=true&seed=4"
  ]
};

const TEMPLATE_CATEGORIES = [
  { id: "door", name: "Door Designs", icon: DoorOpen },
  { id: "ceiling", name: "Ceiling Designs", icon: Layout },
  { id: "wall", name: "Wall Designs", icon: Grid },
  { id: "tv", name: "TV Showcase", icon: Monitor },
  { id: "window", name: "Window Designs", icon: Maximize }
];

export default function ShowcasePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("door");
  const [bgImage, setBgImage] = useState(ARCH_IMAGES[0]);
  const [selectedImages, setSelectedImages] = useState<{ images: { src: string, title: string }[], index: number } | null>(null);

  const galleryImages = (TEMPLATE_DATA[activeCategory] || []).map((url, i) => ({
    src: url,
    title: `${TEMPLATE_CATEGORIES.find(c => c.id === activeCategory)?.name || 'Design'} #${i + 1}`
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen w-full bg-[#050505] text-white overflow-x-hidden"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={bgImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bgImage})`,
              filter: "brightness(0.3) contrast(1.2)"
            }}
          />
        </AnimatePresence>
      </div>

      <header className="relative z-50 flex h-24 items-center justify-between px-8 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-12 w-12 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Logo />
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <h2 className="text-5xl font-bold tracking-tight">Showcase</h2>
          <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10 backdrop-blur-3xl">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold transition-all",
                  activeCategory === cat.id ? "bg-white text-black" : "text-white/40 hover:text-white"
                )}
              >
                <cat.icon className="h-4 w-4" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4x4 Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryImages.map((img, i) => (
            <motion.div
              key={img.src + i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="group relative aspect-square rounded-3xl overflow-hidden cursor-pointer border border-white/5 bg-white/5 shadow-2xl"
              onClick={() => setSelectedImages({ images: galleryImages, index: i })}
            >
              <img
                src={img.src}
                alt={img.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                <Maximize className="h-8 w-8 text-white/80" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-32 flex justify-center pb-24">
          <Button
            onClick={() => navigate("/orchestration")}
            className="rounded-full px-12 py-6 text-lg bg-white text-black hover:bg-white/90 transition-all active:scale-95"
          >
            Request Custom Template <Sparkles className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </main>

      {selectedImages && (
        <ImageLightbox
          images={selectedImages.images}
          initialIndex={selectedImages.index}
          onClose={() => setSelectedImages(null)}
        />
      )}
    </motion.div>
  );
}