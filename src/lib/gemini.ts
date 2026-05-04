// ─── AI Operations via Backend Proxy ────────────────────────────────
// Client calls the /api/chat endpoint which uses the server-side GEMINI_API_KEY.

export interface DesignConstraints {
  projectType: string;
  dimensions?: string;
  materials?: string[];
  colorPalette?: string[];
  style?: string;
}

export interface CostItem {
  item: string;
  category: "Material" | "Labor" | "Contingency";
  quantity: string;
  unitPrice: number;
  total: number;
}

export interface CostBreakdown {
  items: CostItem[];
  totalEstimate: number;
  currency: string;
}

const ARCHITECT_SYSTEM_INSTRUCTION = `You are "Arch Agent", a professional architectural design partner. 
Your goal is to gather design constraints efficiently and provide a detailed design prompt for image generation.

BE PROACTIVE:
- If a user mentions a specific design task (e.g., "I want a ceiling design"), do not ask open-ended questions. 
- Instead, ask for specific, targeted constraints immediately. For a ceiling design, only ask for "Paint Color" and "Room Size/Dimensions".

Once you have enough information, generate a highly detailed, professional design prompt wrapped in [DESIGN_PROMPT] tags.
Example: [DESIGN_PROMPT]A minimalist modern living room with floor-to-ceiling glass walls, white oak flooring, and a recessed tray ceiling with warm LED strip lighting...[/DESIGN_PROMPT]

Be concise, professional, and technical.`;

/**
 * Streams the architect chat response via backend.
 */
export async function* getArchitectStream(history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      messages: history, 
      systemInstruction: ARCHITECT_SYSTEM_INSTRUCTION,
      stream: true 
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6);
        if (dataStr === "[DONE]") return;
        try {
          const json = JSON.parse(dataStr);
          if (json.text) {
            yield { text: json.text };
          }
        } catch (e) {
          // Partial JSON segment - ignore
        }
      }
    }
  }
}

/**
 * Generate a concise project title via backend.
 */
export async function generateProjectTitle(history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: history, 
        systemInstruction: "Analyze the architectural design conversation and generate a concise, professional project title. Return ONLY the title string.",
        stream: false 
      })
    });

    if (!res.ok) return "New Project";
    const data = await res.json();
    return data.text?.trim() || "New Project";
  } catch (error) {
    return "New Project";
  }
}

/**
 * Get cost estimation via backend.
 */
export async function getCostEstimation(designPrompt: string, userConstraints?: string): Promise<CostBreakdown> {
  const prompt = `Based on this architectural design prompt and optional user constraints, provide a structured financial breakdown in Indian Rupees (INR).
          
Design Prompt: "${designPrompt}"
${userConstraints ? `User Constraints/Budget: "${userConstraints}"` : ""}

IMPORTANT: Use current market rates in India. Return ONLY a valid JSON object.`;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      messages: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: `Return ONLY a valid JSON object matching this structure:
{
  "items": [
    { "item": "string", "category": "Material", "quantity": "string", "unitPrice": 100, "total": 100 }
  ],
  "totalEstimate": 0,
  "currency": "INR"
}
category must be one of: "Material", "Labor", or "Contingency".`,
      stream: false 
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  const data = await res.json();
  let text = data.text || "";
  
  // Robust JSON Extraction: Find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.substring(firstBrace, lastBrace + 1);
  } else {
    // If no braces found, cleaning markdown as fallback
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse failed for cost estimation:", text);
    throw new Error("Failed to parse cost breakdown. The agent returned an invalid format.");
  }
}

/**
 * Generate a SINGLE architectural design image via our server.
 */
export async function generateDesignImage(prompt: string, _size: "1K" | "2K" | "4K" = "1K", seed?: number): Promise<string> {
  const useSeed = seed ?? Math.floor(Math.random() * 999999);
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, seed: useSeed })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  const data = await res.json();
  return data.imageUrl;
}

/**
 * Generate MULTIPLE design image variants.
 */
export async function generateMultipleDesignImages(
  prompt: string,
  count: number = 4,
  _size: "1K" | "2K" | "4K" = "1K"
): Promise<string[]> {
  const baseSeed = Math.floor(Math.random() * 1000000);
  
  // Variations to ensure diversity across the 4 images
  const variations = [
    ", 360 degree equirectangular panorama, cinematic wide-angle, hyper-realistic, 8k, architectural digest, sharp focus, natural daylight",
    ", equirectangular 360 degree view, eye-level perspective, master-crafted materials, twilight lighting, professional visualization, high detail",
    ", 360 panoramic architectural render, blueprint focus, detailed textures, warm interior glow, luxury aesthetic, ultra-sharp",
    ", full 360 degree immersive panorama, dramatic architectural lighting, morning mist, high contrast, obsidian and wood textures, premium render"
  ];

  const seeds = Array.from({ length: count }, (_, i) => baseSeed + i * 420);

  const images: string[] = [];
  const errors: string[] = [];

  // Run in sequence with significant stagger to avoid cascading 429s
  for (let i = 0; i < count; i++) {
    try {
      const variedPrompt = prompt + (variations[i] || "");
      
      // Delay: 0s for first, then smaller increments to speed up generation
      if (i > 0) {
        const delay = 1000 + (i * 400) + (Math.random() * 500); 
        console.log(`[Image] Staggering variant ${i+1}/${count} by ${delay.toFixed(0)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
      
      const img = await generateDesignImage(variedPrompt, "1K", seeds[i]);
      if (img) images.push(img);
    } catch (err: any) {
      console.warn(`[Image] Variant ${i+1} synthesis failed:`, err.message);
      errors.push(err.message);
    }
  }

  // Graceful degradation: If at least ONE image succeeded, return it instead of failing
  if (images.length === 0) {
    throw new Error(`Architectural synthesis cluster is busy. All attempts were rejected: ${errors[0]}`);
  }
  
  console.log(`[Image] Cluster synthesis complete: ${images.length}/${count} variants delivered.`);
  return images;
}

/**
 * Enhance a prompt via backend.
 */
export async function enhancePrompt(userPrompt: string, styleKeywords: string): Promise<string> {
  if (!userPrompt?.trim()) return userPrompt || '';
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: [{ role: "user", parts: [{ text: `User Wish: ${userPrompt}\nStyle: ${styleKeywords}` }] }],
        systemInstruction: "You are a professional architectural prompt engineer. Enhance the user prompt with details about lighting, materials, and composition for a stunning visualization. Return ONLY the enhanced string.",
        stream: false 
      })
    });

    if (!res.ok) return userPrompt;
    const data = await res.json();
    return data.text?.trim() || userPrompt;
  } catch (error) {
    return userPrompt;
  }
}
