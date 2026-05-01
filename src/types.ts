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
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, neutral palette, and functional furniture.',
    keywords: 'modern interior design, clean lines, floor to ceiling windows, high-end materials'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Stripped-back luxury focusing on space and light.',
    keywords: 'minimalist architecture, monochromatic, spacious, serene atmosphere, essentialist'
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Extravagant materials, rich textures, and dramatic lighting.',
    keywords: 'ultra-luxury interior, gold accents, marble surfaces, ambient lighting, opulent decor'
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Warm woods, cozy textiles, and natural light.',
    keywords: 'scandinavian design, hygge, light wood, natural textures, bright and airy'
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic details, dark woods, and ornate patterns.',
    keywords: 'traditional home design, ornate molding, rich mahogany, classic furniture pieces'
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Organic shapes, integrated tech, and experimental lighting.',
    keywords: 'futuristic architectural design, biomorphic shapes, integrated smart technology, neon accents, avant-garde'
  }
];
