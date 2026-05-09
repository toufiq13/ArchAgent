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
category must be one of: "Material", "Labor", "Furniture", "Design", "Construction", or "Contingency".`,
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
  
  // Variations tuned for absolute architectural distinctiveness and spatial realism
  const variations = [
    ", focus: Grand Open-Plan Architecture, monumental escala, quadruple-height dramatic foyer, floating spiral staircases, expansive wall-to-wall glazing, immersive natural light, panoramic 360 equirectangular render",
    ", focus: Bio-Integrated Organic Design, flowing curvilinear wooden structures, integrated indoor waterfalls and tropical greenery, soft sun-dappled interior lighting, seamless 360 perspective, hyper-realistic cozy atmosphere",
    ", focus: High-Contrast Brutalist Modernism, raw textured concrete volumes, dramatic cantilevered ceilings, floor-recessed lighting, stark geometric shadows, expansive industrial scale, immersive 360 panoramic architectural photography",
    ", focus: Minimalist Zen-Tech Sanctuary, translucent glass partitions, integrated smart-holographic interfaces, floating furniture systems, serene white-on-white palette, endless spatial depth, theoretical high-tech 360 panoramic interior"
  ];

  const seeds = Array.from({ length: count }, (_, i) => baseSeed + i * 420);
  const images: string[] = [];

  // Individual variant generation with retry
  const generateWithRetry = async (variedPrompt: string, seed: number, idx: number, maxAttempts: number) => {
    let lastError = "";
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = 4000 + (attempt * 3000);
          console.log(`[Image] Variant ${idx} retrying (attempt ${attempt+1}/${maxAttempts}) in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
        }

        console.log(`[Image] Dispatching variant ${idx}/${count} (Attempt ${attempt + 1})...`);
        const img = await generateDesignImage(variedPrompt, "1K", seed);
        if (img) return img;
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[Image] Variant ${idx} attempt ${attempt+1} failed:`, lastError);
        const isTransient = lastError.toLowerCase().includes("load") || 
                          lastError.toLowerCase().includes("capacity") || 
                          lastError.toLowerCase().includes("busy");
        if (!isTransient) throw err;
      }
    }
    return null;
  };

  // 1. Prioritize the FIRST image (Variant 1) - spend more effort on it
  try {
    const primaryImg = await generateWithRetry(prompt + variations[0], seeds[0], 1, 4);
    if (primaryImg) images.push(primaryImg);
  } catch (err) {
    console.error("[Image] Primary variant failed:", err);
  }

  // 2. Launch others with staggered starts if possible
  const variantPromises = Array.from({ length: count - 1 }).map(async (_, i) => {
    const variantIdx = i + 2;
    const variedPrompt = prompt + (variations[i + 1] || "");
    const seed = seeds[i + 1];
    
    // Stagger starts: Variant 2 at 5s, Variant 3 at 10s, Variant 4 at 15s
    await new Promise(r => setTimeout(r, i * 5000 + 2000));
    
    try {
      const img = await generateWithRetry(variedPrompt, seed, variantIdx, 2);
      return img;
    } catch (err) {
      console.warn(`[Image] Variant ${variantIdx} failed:`, err);
      return null;
    }
  });

  const remainingResults = await Promise.all(variantPromises);
  remainingResults.forEach(img => { if (img) images.push(img); });

  // Graceful degradation: If at least ONE image succeeded, return it instead of failing
  if (images.length === 0) {
    throw new Error(`The architectural synthesis cluster is currently at capacity. Please allow 30 seconds for resources to recycle and try again.`);
  }
  
  console.log(`[Image] Cluster synthesis complete: ${images.length}/${count} variants delivered.`);
  return images;
}

/**
 * Enhance a prompt via backend with a heavy focus on 360-degree panoramic architectural consistency.
 */
export async function enhancePrompt(userPrompt: string, styleKeywords: string): Promise<string> {
  if (!userPrompt?.trim()) return userPrompt || '';
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: [{ role: "user", parts: [{ text: `Original Vision: "${userPrompt}"\nArchitectural Style: "${styleKeywords}"` }] }],
        systemInstruction: "You are a world-class architectural visualization prompt engineer. Your task is to transform simple user visions into high-end technical prompts for an AI image generator. \n\nMANDATORY ARCHITECTURAL RULES:\n1. START EACH PROMPT with: 'A seamless 360-degree equirectangular panorama wide-angle interior view of [Concept]'.\n2. ENFORCE SPATIAL SCALE: Emphasize 'spacious layout', 'large architectural volume', 'high ceilings', and 'deep perspective' to prevent cramped feeling.\n3. DETAIL LIGHTING: Describe global illumination, natural light shafts, raytraced reflections, and soft ambient occlusion.\n4. SPECIFY MATERIALS: Mention premium textures like brushed titanium, honed marble, sustainable oak, or artisanal glass.\n5. ARCHITECTURAL DIVERSITY: Ensure the layout is complex and interesting, moving beyond basic rectangular rooms.\n\nOutput ONLY the final enhanced prompt string.",
        stream: false 
      })
    });

    if (!res.ok) return userPrompt;
    const data = await res.json();
    let enhanced = data.text?.trim() || userPrompt;
    
    // Safety check: Ensure the 360 keywords are present if missing
    if (!enhanced.toLowerCase().includes("panorama") && !enhanced.toLowerCase().includes("360-degree")) {
      enhanced = "A seamless 360-degree equirectangular panorama wide-angle interior of " + enhanced;
    }
    
    return enhanced;
  } catch (error) {
    return userPrompt;
  }
}
