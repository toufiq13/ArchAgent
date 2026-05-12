# ArchAgent 🏛️

**ArchAgent** is a premium, AI-powered architectural visualization platform designed to generate spacious, realistic, and highly diverse architectural concepts. With its built-in immersive 360-degree panorama viewer, users can instantly step into the generated interiors and explore spatial dimensions like never before.

## 📸 See It In Action

### 1. Generating Diverse Architectural Concepts
> Enter a simple prompt and watch the neural engine synthesize 4 highly distinct, spacious architectural variations.

<!-- Add your image here: ![Generation Process](path/to/generation-screenshot.png) -->
<div align="center">
  <img src="https://placehold.co/800x400/111111/cyan?text=Architectural+Generation+Screenshot" alt="Generation UI" width="100%"/>
</div>

### 2. Immersive 360° Viewing Experience
> Click into any generated design to explore a true-to-scale, wide-angle 360-degree environment with depth perception.

<!-- Add your video/GIF here: ![Immersive 360 Demo](path/to/immersive-demo.gif) -->
<div align="center">
  <img src="https://placehold.co/800x450/111111/a8ff00?text=360+Degree+Immersive+Viewer+Demo+GIF" alt="Immersive 360 Viewer" width="100%"/>
</div>

## 🚀 Features

- **AI Concept Generation:** Transform simple prompt ideas into sophisticated architectural visualizations.
- **High-Diversity Output:** Every prompt synthesizes into 4 highly distinct and creative room designs covering multiple styles (Modern, Brutalist, Biophilic, Minimalist).
- **Realistic Room Scale:** Utilizing wide-angle synthesis and careful spatial prompt engineering to guarantee spacious and true-to-life architectural proportions.
- **True Immersive 360° Viewing:** Explore generated architecture in an interactive 360-degree mode leveraging `three.js` and `@react-three/fiber` with real-time bloom and vignette effects.
- **Mobile Gyroscope Support:** Fully immersive exploration on mobile devices with device orientation controls.
- **Beautiful Glassmorphic UI:** A dark-themed, highly polished user interface with cinematic animations, high-end typography, and intuitive UX flows.

## 🛠️ Tech Stack

- **Frontend Framework:** React 19, Vite, TypeScript
- **Styling & UI:** Tailwind CSS v4, Motion (Framer Motion), class-variance-authority, clsx, tailwind-merge
- **Icons:** Lucide React
- **3D & Rendering:** Three.js, React Three Fiber, React Three Drei, React Three Postprocessing
- **AI / Generative:** Google Gen AI SDK (`@google/genai`) - powered by Google Gemini Models

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/arch-agent.git
cd arch-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory of your project.

```bash
touch .env
```

Add your Google Gemini API key to the `.env` file for the AI generation capabilities:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the development server

```bash
npm run dev
```

The application will be running locally at `http://localhost:3000`.

## 🎮 How to use

1. **Prompt your vision:** Enter an interior or architectural design prompt into the generator (e.g., "A modern luxury living room in a high-rise").
2. **Select a Style:** Choose a stylistic direction or let the neural engine suggest a diverse set.
3. **Generate:** Watch the engine synthesize 4 unique, spatially vast 360° concepts.
4. **Immerse:** Click the **Enter Room** or **3D Immersive Flow** button on any concept to dive into a full 360-degree panorama perspective. Scroll to zoom and drag to orbit around the room.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
