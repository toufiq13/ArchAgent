import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // ─── AI Chat via Google Gemini API ────────────────────────────────
  const GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  
  // Dynamic model fallback list based on environment probe
  const MODELS_TO_TRY = [
    "gemini-3-flash-preview", 
    "gemini-2.5-flash", 
    "gemini-flash-latest", 
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  let ai: any = null;

  if (GENAI_API_KEY && GENAI_API_KEY.trim() !== "" && GENAI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
      console.log(`[AI] Gemini SDK initialized (Modern @google/genai)`);
    } catch (e) {
      console.error("[AI] Failed to initialize Gemini SDK:", e);
    }
  }

  app.post("/api/chat", async (req, res) => {
    const { messages, systemInstruction, stream } = req.body;

    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please add GOOGLE_GENAI_API_KEY to secrets." });
    }

    // Helper to generate content with fallback
    async function generateWithFallback(isStream: boolean) {
      const contents = messages.map((msg: any) => ({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.parts?.[0]?.text || msg.content || "" }],
      }));

      let lastError: any = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          if (isStream) {
            return await ai.models.generateContentStream({ 
              model: modelName,
              contents: contents,
              config: { systemInstruction: systemInstruction }
            });
          } else {
            return await ai.models.generateContent({ 
              model: modelName,
              contents: contents,
              config: { systemInstruction: systemInstruction }
            });
          }
        } catch (error: any) {
          lastError = error;
          const isQuotaError = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
          if (isQuotaError) {
            console.warn(`[AI] Model ${modelName} quota exceeded. Trying next model...`);
            continue;
          }
          throw error; // Rethrow if not a quota error
        }
      }
      throw lastError;
    }

    try {
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const result = await generateWithFallback(true);

        for await (const chunk of result) {
          const chunkText = chunk.text;
          if (chunkText) {
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        const result = await generateWithFallback(false);
        res.json({ text: result.text });
      }
    } catch (error: any) {
      console.error("[AI] Chat error after fallbacks:", error);
      
      const isQuotaError = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
      if (isQuotaError) {
        return res.status(429).json({ 
          error: "All Gemini models are temporarily at capacity. Please try again in a few minutes.",
          details: error.message 
        });
      }
      
      res.status(500).json({ error: error.message || "Internal AI Error" });
    }
  });

  // ─── Image Generation ───────────────────────────────────────────
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

  async function fetchWithRetry(url: string, options: any = {}, retries = 3, backoff = 1500): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        
        // Handle Rate Limiting (429) specifically
        if (response.status === 429) {
          const wait = backoff * Math.pow(2, i) + Math.random() * 1500;
          console.warn(`[Image] Provider rate limited (429). Retrying in ${wait.toFixed(0)}ms... attempt ${i + 1}/${retries}`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        // Handle Overloaded/Busy (503) specifically for HF
        if (response.status === 503) {
          const wait = 3000 * Math.pow(1.5, i);
          console.warn(`[Image] HF model loading or busy (503). Waiting ${wait.toFixed(0)}ms...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        // Return other failures directly to allow the caller to switch providers or return error
        return response; 
      } catch (err: any) {
        if (i === retries - 1) throw err;
        const wait = backoff * Math.pow(2, i);
        console.warn(`[Image] Network error: ${err.message}. Retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    throw new Error("Maximum retries reached for image provider");
  }

  app.post("/api/generate-image", async (req, res) => {
    const { prompt, seed } = req.body;
    const useSeed = seed || Math.floor(Math.random() * 999999);

    try {
      const fullPrompt = `${prompt}, high-end architectural photography, 8k visualization, cinematic lighting, sharp materials, professional architectural render, global illumination, photorealistic.`;
      
      // ─── OPTION 1: Hugging Face (Primary) ────────────────────────
      if (HF_API_KEY && HF_API_KEY.trim() !== "" && HF_API_KEY !== "YOUR_HUGGINGFACE_API_KEY") {
        console.log(`[Image] Pinging HF (FLUX.1-schnell)...`);
        
        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              headers: { 
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
                "X-Wait-For-Model": "true",
                "X-Use-Cache": "false" 
              },
              method: "POST",
              body: JSON.stringify({ 
                inputs: fullPrompt, 
                parameters: { 
                  seed: useSeed,
                  width: 1024,
                  height: 1024,
                  num_inference_steps: 4 
                } 
              }),
            }
          );

          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("image")) {
              const arrayBuffer = await response.arrayBuffer();
              if (arrayBuffer.byteLength > 1000) { // Verify it's not a tiny placeholder or error bit
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                const dataUrl = `data:${contentType};base64,${base64}`;
                console.log(`[Image] ✅ PRO SUCCESS (HF): ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
                return res.json({ imageUrl: dataUrl, provider: "huggingface" });
              }
            }
            console.warn(`[Image] HF returned non-image or invalid buffer (Content-Type: ${contentType})`);
          } else {
            console.warn(`[Image] HF Status: ${response.status}`);
          }
        } catch (hfErr: any) {
          console.error("[Image] HF Failure:", hfErr.message);
        }
      }

      // ─── OPTION 2: Pollinations (Stable Fallback) ───────────────────────
      console.log(`[Image] Attempting Pollinations (Fallback)...`);
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${useSeed}&width=1280&height=1280&nologo=true&enhance=true&model=flux`;
      
      const pollRes = await fetchWithRetry(imageUrl);
      
      if (!pollRes.ok) {
        throw new Error(`Visual rendering failed across all providers (Status: ${pollRes.status})`);
      }

      const pollContentType = pollRes.headers.get("content-type") || "image/jpeg";
      if (!pollContentType.includes("image")) {
        throw new Error("Provider returned invalid content type");
      }

      const arrayBuffer = await pollRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${pollContentType};base64,${base64}`;

      console.log(`[Image] ✅ FALLBACK SUCCESS (Pollinations): ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
      res.json({ imageUrl: dataUrl, provider: "pollinations" });
      
    } catch (e: any) {
      console.error("[Image] PIPELINE_CRASH:", e.message);
      res.status(500).json({ error: "Architectural synthesis failed. Our rendering cluster is currently under high load." });
    }
  });

  // ─── Status Check (For Debugging) ────────────────────────────────
  app.get("/api/status", (req, res) => {
    res.json({
      gemini: !!ai,
      huggingface: !!(HF_API_KEY && HF_API_KEY !== "YOUR_HUGGINGFACE_API_KEY"),
      twentyfirst: !!(process.env.API_KEY_21ST && process.env.API_KEY_21ST !== "YOUR_21ST_API_KEY"),
      supabase: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.includes("supabase.co")),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
