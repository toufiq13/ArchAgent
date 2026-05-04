import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  DeviceOrientationControls,
  Environment 
} from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { LoadingBreadcrumb } from './ui/animated-loading-svg-text-shimmer';
import { 
  X, 
  RotateCcw, 
  ZoomIn, 
  Info, 
  Maximize, 
  Minimize, 
  ArrowUp, 
  ArrowDown, 
  Smartphone,
  Sparkles
} from 'lucide-react';
import { DesignConcept } from '../types';

interface Viewer3DProps {
  design: DesignConcept;
  onClose: () => void;
}

const PanoramicRoom = ({ imageUrl }: { imageUrl: string }) => {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  return (
    <group>
      {/* Primary Environment Sphere - Massive radius to flatten projection and create room-scale depth */}
      <mesh scale={[-1, 1, 1]} rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[1000, 128, 128]} />
        <meshBasicMaterial 
          map={texture} 
          side={THREE.BackSide} 
          transparent={false}
        />
      </mesh>

      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </group>
  );
};

export default function Viewer3D({ design, onClose }: Viewer3DProps) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGyro, setUseGyro] = useState(false);
  const [viewMode, setViewMode] = useState<'orbit' | 'first-person'>('orbit');
  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const goToView = (view: 'ceiling' | 'floor' | 'horizon') => {
    if (controlsRef.current) {
      const ceilingLimit = Math.PI / 4 + 0.1;
      const floorLimit = Math.PI * 0.75 - 0.1;
      const targetPolar = view === 'ceiling' ? ceilingLimit : view === 'floor' ? floorLimit : Math.PI / 2;
      
      controlsRef.current.setPolarAngle(targetPolar);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
    >
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 h-20 px-10 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
              LuminaAI Immersive Core
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
              {design.style} <span className="text-white/40 font-light">Visualization</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-xl mr-4">
            <button 
              onClick={() => setViewMode('orbit')}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'orbit' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
              )}
            >
              Orbit
            </button>
            <button 
              onClick={() => setViewMode('first-person')}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'first-person' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
              )}
            >
              Immersive
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="h-10 w-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white border border-white/5"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center bg-white text-black hover:bg-white/90 rounded-xl transition-all shadow-xl active:scale-95"
            id="close-viewer-btn"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Side HUD */}
      <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-6 z-10">
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => goToView('ceiling')}
            className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all backdrop-blur-md group"
            title="Tilt Up"
          >
            <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
          </button>
          <button 
            onClick={() => resetCamera()}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all backdrop-blur-md"
            title="Reset Orientation"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => goToView('floor')}
            className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all backdrop-blur-md group"
            title="Tilt Down"
          >
            <ArrowDown size={20} className="group-hover:translate-y-1 transition-transform" />
          </button>
        </div>

        <div className="h-px w-full bg-white/10" />

        <button 
          onClick={() => setUseGyro(!useGyro)}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border",
            useGyro 
              ? "bg-[#A8FF00]/20 border-[#A8FF00]/50 text-[#A8FF00] shadow-[0_0_20px_rgba(168,255,0,0.2)]" 
              : "bg-white/5 border-white/10 text-white/40"
          )}
          title="Motion Control"
        >
          <Smartphone size={20} />
        </button>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing">
        {/* Loading Overlay */}
        <Suspense fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
            <div className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="h-8 w-8 text-[#A8FF00]" />
            </div>
            <LoadingBreadcrumb text="Constructing 3D Spatial Mesh..." className="text-white scale-125" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Awaiting High-Fidelity Texture Streaming</p>
          </div>
        }>
          <Canvas 
          dpr={window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio} 
          gl={{ 
            antialias: true, 
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance",
            precision: "highp",
            stencil: false,
            depth: true
          }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor('#000000');
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            const handleContextLost = (event: Event) => {
              event.preventDefault();
              console.warn("WebGL Context Lost. Cleaning up resources...");
            };
            
            const handleContextRestored = () => {
              console.log("WebGL Context Restored. Scene state preserved.");
            };

            const canvas = gl.domElement;
            canvas.addEventListener("webglcontextlost", handleContextLost, false);
            canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

            // AUTO-DISPOSAL: The Canvas handles its own disposal, but we add an explicit observer for the container
            return () => {
              canvas.removeEventListener("webglcontextlost", handleContextLost);
              canvas.removeEventListener("webglcontextrestored", handleContextRestored);
              
              // Resource deep-clearing
              scene.traverse((object: any) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                  const materials = Array.isArray(object.material) ? object.material : [object.material];
                  materials.forEach((mat: any) => {
                    // Dispose textures
                    Object.keys(mat).forEach(key => {
                      if (mat[key] && mat[key].isTexture) mat[key].dispose();
                    });
                    mat.dispose();
                  });
                }
              });
              gl.renderLists.dispose();
              gl.dispose();
            };
          }}
        >
          <PerspectiveCamera 
            makeDefault 
            position={[0, 0, 0]} 
            fov={viewMode === 'first-person' ? 75 : 60} 
            near={0.01}
            far={2000}
          />
          
          <Suspense fallback={null}>
            <PanoramicRoom imageUrl={design.url} />
            <EffectComposer multisampling={8}>
              <Bloom 
                intensity={0.3} 
                luminanceThreshold={1.0} 
                luminanceSmoothing={0} 
                mipmapBlur 
              />
              <Vignette eskil={false} offset={0.1} darkness={0.8} />
            </EffectComposer>
          </Suspense>

          {useGyro ? (
            <DeviceOrientationControls />
          ) : (
            <OrbitControls 
              ref={controlsRef}
              enablePan={false} 
              enableZoom={true} 
              minDistance={0.01} 
              maxDistance={0.5} // Keep viewer close to center for best panorama fidelity
              rotateSpeed={-0.3} 
              panSpeed={0.5}
              zoomSpeed={0.6}
              dampingFactor={0.08}
              enableDamping={true}
              autoRotate={false}
              minPolarAngle={Math.PI / 4} // Restrict polar to prevent extreme top/bottom distortion
              maxPolarAngle={Math.PI * 0.75}
              target={[0, 0, 0]}
            />
          )}
        </Canvas>
      </Suspense>
    </div>

      {/* Data HUD Overlay */}
      <div className="absolute top-24 right-10 flex flex-col gap-4 pointer-events-none text-right">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Spatial Analysis</span>
          <span className="text-xs font-mono text-white/40">Z-DEPTH: INFINITE</span>
          <span className="text-xs font-mono text-white/40">FOV: {viewMode === 'first-person' ? '75°' : '60°'}</span>
          <span className="text-xs font-mono text-white/40">RENDER: RAYTRACED_V4</span>
        </div>
      </div>

      {/* Footer Info */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex items-center gap-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <div className="h-2 w-2 rounded-full bg-[#A8FF00]" />
              Spatial Immersion Active
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors cursor-default">
              <RotateCcw size={14} /> <span>360° Drag</span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors cursor-default">
              <ZoomIn size={14} /> <span>Scroll Zoom</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <button 
              onClick={() => setShowControls(false)}
              className="text-white/20 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="absolute bottom-10 right-10 h-12 w-12 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all shadow-2xl"
        >
          <Info size={20} />
        </button>
      )}
    </motion.div>
  );
}

// Utility function used in the modified code
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
