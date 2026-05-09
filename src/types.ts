import { LucideIcon, Layout, Monitor, Sparkle, Wind, DoorOpen, Zap } from "lucide-react";

export interface DesignConcept {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: number;
}

export type AppView = 'generator' | 'gallery' | 'viewer';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, neutral palette, and functional furniture.',
    keywords: 'modern interior design, clean lines, floor to ceiling windows, high-end materials, expansive architectural perspective, wide-angle',
    icon: Layout
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Stripped-back luxury focusing on space and light.',
    keywords: 'minimalist architecture, monochromatic, spacious, serene atmosphere, essentialist, expansive architectural perspective, wide-angle',
    icon: Wind
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Extravagant materials, rich textures, and dramatic lighting.',
    keywords: 'ultra-luxury interior, gold accents, marble surfaces, ambient lighting, opulent decor, expansive architectural perspective, wide-angle',
    icon: Sparkle
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Warm woods, cozy textiles, and natural light.',
    keywords: 'scandinavian design, hygge, light wood, natural textures, bright and airy, expansive architectural perspective, wide-angle',
    icon: DoorOpen
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic details, dark woods, and ornate patterns.',
    keywords: 'traditional home design, ornate molding, rich mahogany, classic furniture pieces, expansive architectural perspective, wide-angle',
    icon: Monitor
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Organic shapes, integrated tech, and experimental lighting.',
    keywords: 'futuristic architectural design, biomorphic shapes, integrated smart technology, neon accents, avant-garde, expansive architectural perspective, wide-angle',
    icon: Zap
  }
];
