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
import { cn } from '@/lib/utils';
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
      {/* Primary Environment Sphere - Radius set to 50 for optimal depth/warping ratio */}
      <mesh scale={[-1, 1, 1]} rotation={[0, -Math.PI, 0]}>
        <sphereGeometry args={[50, 128, 128]} />
        <meshBasicMaterial 
          map={texture} 
          side={THREE.BackSide} 
          transparent={false}
        />
      </mesh>

      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </group>
  );
};

export default function Viewer3D({ design, onClose }: Viewer3DProps) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGyro, setUseGyro] = useState(false);
  const [viewMode, setViewMode] = useState<'orbit' | 'first-person'>('first-person');
  const [targetFov, setTargetFov] = useState(90);
  const [currentFov, setCurrentFov] = useState(120); // Start very wide for entry effect

  useEffect(() => {
    setTargetFov(viewMode === 'first-person' ? 90 : 70);
  }, [viewMode]);

  useEffect(() => {
    // Smooth FOV transitions
    const interval = setInterval(() => {
      setCurrentFov(prev => {
        if (Math.abs(prev - targetFov) < 0.1) return targetFov;
        return prev + (targetFov - prev) * 0.1;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [targetFov]);
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
      if (view === 'horizon') {
        controlsRef.current.setPolarAngle(Math.PI / 2);
      } else {
        const targetPolar = view === 'ceiling' ? 0.01 : Math.PI - 0.01;
        controlsRef.current.setPolarAngle(targetPolar);
      }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col font-sans"
    >
      {/* HUD - Glassmorphism Headers */}
      <div className="absolute top-0 left-0 right-0 h-24 px-10 flex justify-between items-center z-10 bg-gradient-to-b from-[#0a0a0c]/90 to-transparent">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
              AI Neural System V2.0
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter mt-1 italic uppercase">
              {design.style} <span className="text-cyan-500 opacity-80">Panorama</span>
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('orbit')}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'orbit' ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "text-white/40 hover:text-white"
              )}
            >
              Control
            </button>
            <button 
              onClick={() => setViewMode('first-person')}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                viewMode === 'first-person' ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "text-white/40 hover:text-white"
              )}
            >
              Immersive
            </button>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-white/40 hover:text-white backdrop-blur-md"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          
          <button
            onClick={onClose}
            className="group relative h-12 w-12 flex items-center justify-center bg-cyan-500 text-black hover:bg-cyan-400 rounded-2xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)] active:scale-95"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Navigation Matrix */}
      <div className="absolute top-1/2 -translate-y-1/2 left-10 flex flex-col gap-6 z-10">
        <div className="p-2 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl flex flex-col gap-3">
          <button 
            onClick={() => goToView('ceiling')}
            className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-cyan-400 hover:bg-white/5 rounded-2xl transition-all group"
            title="Snap Ceiling"
          >
            <ArrowUp size={22} className="group-hover:-translate-y-1 transition-transform" />
          </button>
          <button 
            onClick={() => resetCamera()}
            className="w-12 h-12 flex items-center justify-center text-white hover:text-cyan-400 bg-white/5 rounded-2xl transition-all"
            title="Reset Horizon"
          >
            <RotateCcw size={22} />
          </button>
          <button 
            onClick={() => goToView('floor')}
            className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-cyan-400 hover:bg-white/5 rounded-2xl transition-all group"
            title="Snap Floor"
          >
            <ArrowDown size={22} className="group-hover:translate-y-1 transition-transform" />
          </button>
        </div>

        <button 
          onClick={() => setUseGyro(!useGyro)}
          className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center transition-all backdrop-blur-2xl border-2",
            useGyro 
              ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]" 
              : "bg-white/5 border-white/10 text-white/30 hover:border-white/30"
          )}
          title="Toggle Gyroscope"
        >
          <Smartphone size={24} />
        </button>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c]">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-cyan-400" />
            </div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500/50">Streaming High-Fidelity Panorama</p>
          </div>
        }>
          <Canvas 
            dpr={[1, 2]} 
            gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
            camera={{ fov: currentFov, position: [0, 0, 0.1] }}
          >
            <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={currentFov} near={0.1} far={1000} />
            
            <Suspense fallback={null}>
              <PanoramicRoom imageUrl={design.url} />
              <EffectComposer>
                <Bloom intensity={0.8} luminanceThreshold={0.9} luminanceSmoothing={0.1} mipmapBlur />
                <Noise opacity={0.02} />
                <Vignette eskil={false} offset={0.1} darkness={0.9} />
              </EffectComposer>
            </Suspense>

            {useGyro ? (
              <DeviceOrientationControls />
            ) : (
              <OrbitControls 
                ref={controlsRef}
                enablePan={false} 
                rotateSpeed={-0.5} 
                dampingFactor={0.1}
                enableDamping={true}
                minDistance={0.01}
                maxDistance={1}
                target={[0, 0, 0]}
              />
            )}
          </Canvas>
        </Suspense>
      </div>

      {/* Technical Matrix HUD Overlay */}
      <div className="absolute top-28 left-10 pointer-events-none flex flex-col gap-6 z-10">
        <div className="flex flex-col gap-1 p-4 bg-white/5 border-l border-cyan-500/50 backdrop-blur-md">
          <div className="text-[9px] font-black text-cyan-500/60 uppercase tracking-[0.5em]">Engine Status</div>
          <div className="text-[10px] font-mono text-white/50 tracking-wider">CORE: AI-RENDER_LUMINA_V4</div>
          <div className="text-[10px] font-mono text-white/50 tracking-wider uppercase">Cluster: 16x Neural Synthesis Nodes</div>
          <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Scale: Architectural 1:1</div>
          <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Latency: 12ms</div>
        </div>

        <div className="flex flex-col gap-1 p-4 bg-white/5 border-l border-white/20 backdrop-blur-md">
          <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Optical Data</div>
          <div className="text-[10px] font-mono text-white/50 tracking-wider">FOV: {currentFov.toFixed(2)}°</div>
          <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Projection: Equirectangular</div>
          <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Mapping: Inverted Sphere</div>
        </div>
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex items-center gap-10 shadow-2xl"
          >
            <div className="flex items-center gap-4 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em]">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
              360° Immersive Logic Engaged
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-4">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-widest shrink-0">Interaction:</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white/60 text-[9px] font-bold uppercase tracking-widest"><RotateCcw size={12}/> Drag</div>
                <div className="flex items-center gap-2 text-white/60 text-[9px] font-bold uppercase tracking-widest"><ZoomIn size={12}/> Scroll</div>
              </div>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <button 
              onClick={() => setShowControls(false)}
              className="text-white/20 hover:text-white transition-colors text-[10px] font-black uppercase tracking-tighter"
            >
              Exterminate HUD
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
