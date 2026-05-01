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

  app.post("/api/generate-image", async (req, res) => {
    const { prompt, seed } = req.body;
    const useSeed = seed || Math.floor(Math.random() * 999999);

    try {
      const fullPrompt = `Architectural photography, professional visualization: ${prompt}, 8k, photorealistic, cinematic lighting, highly detailed materials.`;
      
      // OPTION 1: Hugging Face (PRO)
      if (HF_API_KEY && HF_API_KEY !== "YOUR_HUGGINGFACE_API_KEY") {
        console.log(`[Image] Generating via Hugging Face (FLUX.1)...`);
        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              headers: { 
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({ inputs: fullPrompt, parameters: { seed: useSeed } }),
            }
          );

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = response.headers.get("content-type") || "image/webp";
            const dataUrl = `data:${mimeType};base64,${base64}`;
            console.log(`[Image] ✅ Generated via HF: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
            return res.json({ imageUrl: dataUrl, provider: "huggingface" });
          } else {
            const err = await response.text();
            console.warn(`[Image] HF failed: ${err.substring(0, 100)}. Falling back to Pollinations.`);
          }
        } catch (hfErr) {
          console.error("[Image] HF Exception:", hfErr);
        }
      }

      // OPTION 2: Pollinations (FREE Fallback)
      console.log(`[Image] Generating via Pollinations.ai (seed=${useSeed})...`);
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${useSeed}&width=1024&height=1024&nologo=true`;
      
      const pollRes = await fetch(imageUrl);
      if (!pollRes.ok) {
        throw new Error(`Pollinations failure: ${pollRes.statusText}`);
      }

      const arrayBuffer = await pollRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = pollRes.headers.get("content-type") || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64}`;

      console.log(`[Image] ✅ Generated via Pollinations: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
      res.json({ imageUrl: dataUrl, provider: "pollinations" });
    } catch (e: any) {
      console.error("[Image] Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Status Check (For Debugging) ────────────────────────────────
  app.get("/api/status", (req, res) => {
    res.json({
      gemini: !!ai,
      huggingface: !!(HF_API_KEY && HF_API_KEY !== "YOUR_HUGGINGFACE_API_KEY"),
      twentyfirst: !!(process.env.API_KEY_21ST && process.env.API_KEY_21ST !== "YOUR_21ST_API_KEY"),
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
