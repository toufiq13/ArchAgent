import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, DoorOpen, Layout, Grid, Monitor, Sparkles, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Logo } from "@/components/Logo";

const ARCH_IMAGES = [
  "/showcase/ceiling.webp",
  "/showcase/door.webp"
];

const TEMPLATE_DATA: Record<string, string[]> = {
  door: [
    "/showcase/showcase/Door Designs/Door Design 1",
    "/showcase/showcase/Door Designs/Door Design 2",
    "/showcase/showcase/Door Designs/Door Design 3",
    "/showcase/showcase/Door Designs/Door Design 4",
    "/showcase/showcase/Door Designs/Door Design 5",
    "/showcase/showcase/Door Designs/Door Design 6"
  ],
  ceiling: [
    "/showcase/showcase/ceiling designs/ceiling design 1",
    "/showcase/showcase/ceiling designs/ceiling design 2",
    "/showcase/showcase/ceiling designs/ceiling design 3",
    "/showcase/showcase/ceiling designs/ceiling design 4",
    "/showcase/showcase/ceiling designs/ceiling design 5",
    "/showcase/showcase/ceiling designs/ceiling design 6"
  ],
  wall: [
    "/showcase/showcase/wall designs/Wall Design 1",
    "/showcase/showcase/wall designs/Wall Design 2",
    "/showcase/showcase/wall designs/Wall Design 3",
    "/showcase/showcase/wall designs/Wall Design 4",
    "/showcase/showcase/wall designs/Wall Design 5",
    "/showcase/showcase/wall designs/Wall Design 6"
  ],
  tv: [
    "/showcase/showcase/tv showcase/tv showcase 1",
    "/showcase/showcase/tv showcase/tv showcase 2",
    "/showcase/showcase/tv showcase/tv showcase 3",
    "/showcase/showcase/tv showcase/tv showcase 4",
    "/showcase/showcase/tv showcase/tv showcase 5",
    "/showcase/showcase/tv showcase/tv showcase 6"
  ],
  window: [
    "/showcase/showcase/window designs/window design 1",
    "/showcase/showcase/window designs/window design 2",
    "/showcase/showcase/window designs/window design 3",
    "/showcase/showcase/window designs/window design 4",
    "/showcase/showcase/window designs/window design 5",
    "/showcase/showcase/window designs/window design 6"
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