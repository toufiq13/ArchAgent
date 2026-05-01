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
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[50, 64, 64]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </mesh>
      <ambientLight intensity={0.5} />
    </group>
  );
};

export default function Viewer3D({ design, onClose }: Viewer3DProps) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGyro, setUseGyro] = useState(false);
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
      const targetPolar = view === 'ceiling' ? 0.01 : view === 'floor' ? Math.PI - 0.01 : Math.PI / 2;
      controlsRef.current.setPolarAngle(targetPolar);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col font-sans"
    >
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 h-16 px-8 flex justify-between items-center z-10 bg-[#0d0d0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-accent">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shadow-[0_0_8px_#06b6d4]"></div>
            Immersive Raytraced View
          </div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider truncate max-w-[200px] md:max-w-md">
            {design.style} Perspective
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white hidden md:block"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
            id="close-viewer-btn"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Floating HUD & Quick View Controls */}
      <div className="absolute top-24 left-8 flex flex-col gap-4 z-10 pointer-events-none md:pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-2 text-[10px] font-mono text-brand-accent shadow-[0_0_10px_rgba(6,182,212,0.2)]">
          ENGINE: AI-RENDER | LUMENS: ADAPTIVE
        </div>
        
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => goToView('ceiling')}
            className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all pointer-events-auto shadow-lg"
            title="Ceiling View"
          >
            <ArrowUp size={18} />
          </button>
          <button 
            onClick={() => resetCamera()}
            className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all pointer-events-auto shadow-lg"
            title="Reset Horizon"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={() => goToView('floor')}
            className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all pointer-events-auto shadow-lg"
            title="Floor View"
          >
            <ArrowDown size={18} />
          </button>
          <div className="h-4" />
          <button 
            onClick={() => setUseGyro(!useGyro)}
            className={`w-10 h-10 glass-panel rounded-lg flex items-center justify-center transition-all pointer-events-auto shadow-lg ${useGyro ? 'text-brand-accent border-brand-accent/50' : 'text-white/40'}`}
            title="Mobile Gyro"
          >
            <Smartphone size={18} />
          </button>
        </div>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing">
        <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} />
          
          <Suspense fallback={null}>
            <PanoramicRoom imageUrl={design.url} />
            <EffectComposer>
              <Bloom 
                intensity={1.0} 
                luminanceThreshold={0.8} 
                luminanceSmoothing={0.9} 
                mipmapBlur 
              />
              <Vignette eskil={false} offset={0.1} darkness={1.1} />
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
              maxDistance={5}
              rotateSpeed={-0.5} 
              autoRotate={false}
            />
          )}
        </Canvas>
      </div>

      {/* Footer Navigation Help */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 glass-panel rounded-2xl flex items-center gap-6"
          >
            <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              <Sparkles size={14} className="text-brand-accent" /> <span>Realtime GI Active</span>
            </div>
            <div className="h-4 w-px bg-white/20 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <RotateCcw size={14} /> <span>Drag to Look</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <ZoomIn size={14} /> <span>Scroll to Zoom</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <button 
              onClick={() => setShowControls(false)}
              className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="absolute bottom-6 right-6 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/60 hover:text-white shadow-xl"
        >
          <Info size={20} />
        </button>
      )}
    </motion.div>
  );
}
