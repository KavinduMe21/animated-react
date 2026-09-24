import { useRef, useEffect, useMemo, useState, Suspense, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture, Billboard, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Error boundary – renders nothing if texture fails to load         */
/* ------------------------------------------------------------------ */
class TextureErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Smooth scroll progress (rAF, no re-renders)                       */
/* ------------------------------------------------------------------ */
function useSmoothScrollProgress(
  sectionRef: React.RefObject<HTMLElement | null>,
  progressRef: React.MutableRefObject<number>,
) {
  const rafRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tick = () => {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const raw = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0;
      progressRef.current += (raw - progressRef.current) * 0.06;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sectionRef, progressRef]);
}

/* ------------------------------------------------------------------ */
/*  Scroll-synchronized music with a smooth whale/flame crossfade     */
/* ------------------------------------------------------------------ */
function useScrollAudio(progressRef: React.MutableRefObject<number>) {
  const [isPlaying, setIsPlaying] = useState(true);
  const controlsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const whaleAudio = new Audio("/whale.mp3");
    const flameAudio = new Audio("/flame.mp3");
    whaleAudio.loop = true;
    flameAudio.loop = true;
    whaleAudio.preload = "auto";
    flameAudio.preload = "auto";
    whaleAudio.volume = 0;
    flameAudio.volume = 0;

    let audioStarted = false;
    let manuallyPaused = false;
    let animationFrame = 0;

    const updateAudio = () => {
      const progress = progressRef.current;
      const crossfade = THREE.MathUtils.smoothstep(progress, 0.62, 0.78);
      const whaleVolume = 0.8 * (1 - crossfade);
      const flameVolume = 0.8 * crossfade;

      whaleAudio.volume = whaleVolume;
      flameAudio.volume = flameVolume;

      if (audioStarted) {
        if (whaleVolume > 0.001 && whaleAudio.paused) void whaleAudio.play();
        if (flameVolume > 0.001 && flameAudio.paused) void flameAudio.play();
        if (whaleVolume <= 0.001) whaleAudio.pause();
        if (flameVolume <= 0.001) flameAudio.pause();
      }

      animationFrame = requestAnimationFrame(updateAudio);
    };

    const startAudio = () => {
      if (audioStarted || manuallyPaused) return;
      audioStarted = true;
      const activeAudio = progressRef.current >= 0.7 ? flameAudio : whaleAudio;
      void activeAudio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        audioStarted = false;
      });
    };

    controlsRef.current = () => {
      if (audioStarted) {
        manuallyPaused = true;
        audioStarted = false;
        whaleAudio.pause();
        flameAudio.pause();
        setIsPlaying(false);
        return;
      }

      manuallyPaused = false;
      startAudio();
    };

    // Try autoplay immediately; interaction listeners remain as the fallback.
    startAudio();
    window.addEventListener("scroll", startAudio, { passive: true });
    window.addEventListener("wheel", startAudio, { passive: true });
    animationFrame = requestAnimationFrame(updateAudio);

    return () => {
      window.removeEventListener("scroll", startAudio);
      window.removeEventListener("wheel", startAudio);
      cancelAnimationFrame(animationFrame);
      controlsRef.current = null;
      whaleAudio.pause();
      flameAudio.pause();
      whaleAudio.src = "";
      flameAudio.src = "";
    };
  }, [progressRef]);

  return { isPlaying, toggleAudio: () => controlsRef.current?.() };
}

/* ------------------------------------------------------------------ */
/*  3D Whale – GLB model that orbits the scene                        */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  3D Whale – GLB model with swimming animation + orbit              */
/* ------------------------------------------------------------------ */
function Whale({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/white_mesh.glb");

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const angle = p * Math.PI * 2;
    const radius = 3.6;
    const t = state.clock.elapsedTime;

    // Orbit
    groupRef.current.position.x = Math.cos(angle) * radius;
    groupRef.current.position.z = Math.sin(angle) * radius;
    
    // One full orbit while the whale climbs in a gentle screw pattern.
    groupRef.current.position.y = p * 4.2 + Math.sin(t * 0.8) * 0.18 + Math.sin(t * 1.4) * 0.12;

    // Face direction
    groupRef.current.rotation.y = -angle - Math.PI / 2;
    
    // FASTER undulation (increased multipliers)
    groupRef.current.rotation.z = Math.sin(t * 1.4) * 0.08 + Math.cos(t * 3.6) * 0.05;
    groupRef.current.rotation.x = Math.sin(t * 0.8) * 0.1 +
      Math.sin(t * 1.4) * 0.06;

    // FASTER tail wag (increased multiplier)
    groupRef.current.rotation.y += Math.sin(t * 2.0) * 0.15;

    // FASTER breathing
    const breathe = 1 + Math.sin(t * 4.0) * 0.03;
    groupRef.current.scale.set(breathe, breathe, breathe);

    // FASTER swaying
    groupRef.current.position.x += Math.sin(t * 1.5) * 0.15;
  });

  return (
    <group ref={groupRef} scale={1.1}>
      <primitive object={clonedScene} scale={1} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  3D flame – rises from below as the whale climbs                   */
/* ------------------------------------------------------------------ */
function Flame({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/simple_flame.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const progress = progressRef.current;
    const time = state.clock.elapsedTime;
    const flameOrbitProgress = THREE.MathUtils.clamp((progress - 0.7) / 0.3, 0, 1);
    const angle = flameOrbitProgress * Math.PI * 2;
    const radius = 3.6;
    const flameProgress = THREE.MathUtils.smoothstep(flameOrbitProgress, 0, 0.18);

    // Orbit around the man on the same scroll-driven path as the whale.
    groupRef.current.position.x = Math.cos(angle) * radius;
    groupRef.current.position.z = Math.sin(angle) * radius;
    groupRef.current.position.y = -4.2 + flameOrbitProgress * 5.4;
    groupRef.current.rotation.y = -angle - Math.PI / 2;
    groupRef.current.scale.setScalar(flameProgress * (0.9 + Math.sin(time * 2.5) * 0.06));
  });

  return (
    <group ref={groupRef} position={[0, -5.2, 0]}>
      <primitive object={clonedScene} scale={1.4} />
      <pointLight color="#ff4d16" intensity={5} distance={5} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  2D Human – textured billboard at center                           */
/* ------------------------------------------------------------------ */
function Human() {
  const humanTexture = useTexture("/human.PNG");

  // Man image aspect ratio (~0.76:1 portrait)
  const manHeight = 4.8;
  const manWidth = manHeight * .76;

  return (
    <group position={[0, 1.2, 0]}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[manWidth, manHeight]} />
          <meshBasicMaterial
            map={humanTexture}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
      {/* Rim light */}
      <pointLight color="#6688bb" intensity={2} distance={3} position={[0, 0, -0.5]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating Particles                                                */
/* ------------------------------------------------------------------ */
function Particles({ count = 3000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, opacities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const op = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const r = 4 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      op[i] = Math.random();
    }
    return [pos, op];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.008) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-opacity" args={[opacities, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#5599ff"
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating light orbs – volumetric accent lights                    */
/* ------------------------------------------------------------------ */
function LightOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  const orbs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        radius: 5 + Math.random() * 2,
        y: (Math.random() - 0.5) * 4,
        size: 0.04 + Math.random() * 0.06,
        intensity: 2 + Math.random() * 3,
      })),
    [],
  );

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <group key={i} position={[Math.cos(orb.angle) * orb.radius, orb.y, Math.sin(orb.angle) * orb.radius]}>
          <mesh>
            <sphereGeometry args={[orb.size, 12, 12]} />
            <meshBasicMaterial color="#4488ff" transparent opacity={0.6} />
          </mesh>
          <pointLight color="#4488ff" intensity={orb.intensity} distance={3} decay={2} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Orbit ring – subtle visual guide                                  */
/* ------------------------------------------------------------------ */
function OrbitRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2 + 0.14, 0, 0]} position={[0, 1, 0]}>
      {/* <ringGeometry args={[3.5, 3.65, 128]} /> */}
      <meshBasicMaterial
        color="#3366cc"
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Ground plane – subtle reflective floor                            */
/* ------------------------------------------------------------------ */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshPhysicalMaterial
        color="#050816"
        metalness={0.8}
        roughness={0.6}
        transparent
        opacity={0.4}
        envMapIntensity={0.3}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene content – assembles everything                              */
/* ------------------------------------------------------------------ */
function SceneContent({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  return (
    <>
      {/* Fog for depth */}
      <fog attach="fog" args={["#050816", 12, 35]} />

      {/* Lighting */}
      <ambientLight intensity={0.08} color="#334466" />
      <directionalLight position={[5, 8, 3]} intensity={0.4} color="#4477aa" />
      <pointLight position={[-4, 6, -4]} intensity={0.6} color="#2255aa" decay={2} />
      <pointLight position={[3, -2, 5]} intensity={0.3} color="#3366bb" decay={2} />
      <spotLight
        position={[0, 12, 4]}
        angle={0.25}
        penumbra={1}
        intensity={1.5}
        color="#3366aa"
        distance={25}
        decay={2}
      />
      {/* Key backlight */}
      <spotLight
        position={[0, 3, -6]}
        angle={0.4}
        penumbra={0.8}
        intensity={0.8}
        color="#2244aa"
        distance={15}
        decay={2}
      />

      {/* Environment for glass reflections */}
      <Environment preset="night" environmentIntensity={0.6} />

      {/* Scene objects */}
      <group position={[0, -1, 0]}>
        <TextureErrorBoundary>
          <Suspense fallback={null}>
            <Human />
          </Suspense>
        </TextureErrorBoundary>
        <OrbitRing />
        <Ground />

        {/* Whale orbits on a slightly tilted plane */}
        <group position={[0, 1.2, 0]} rotation={[-0.14, 0, 0]}>
          <Whale progressRef={progressRef} />
        </group>
      </group>

      <Particles count={2500} />
      <LightOrbs />
      <Flame progressRef={progressRef} />

      {/* Post-processing */}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={2.8}
          luminanceThreshold={0.05}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Hero export                                                  */
/* ------------------------------------------------------------------ */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);

  useSmoothScrollProgress(sectionRef, progressRef);
  const { isPlaying, toggleAudio } = useScrollAudio(progressRef);

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: "700vh" }}
    >
      <div className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden">
        <button
          type="button"
          onClick={toggleAudio}
          aria-label={isPlaying ? "Pause music" : "Play music"}
          title={isPlaying ? "Pause music" : "Play music"}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 touch-manipulation select-none items-center justify-center rounded-full border border-blue-200/30 bg-slate-950/60 text-sm text-blue-100 backdrop-blur-md transition hover:border-blue-200/70 hover:bg-slate-900/80 sm:right-6 sm:top-6"
        >
          <span aria-hidden="true">{isPlaying ? "||" : ">"}</span>
        </button>
        <Canvas
          camera={{ position: [0, 0.8, 8.5], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          }}
          style={{ background: "#050816" }}
        >
          <SceneContent progressRef={progressRef} />
        </Canvas>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 pointer-events-none flex-col items-center gap-2 opacity-40 sm:bottom-8">
          <span className="text-[10px] tracking-[0.35em] uppercase text-blue-200/50 font-light">
            Scroll to explore
          </span>
          <div
            className="w-[1px] h-10 overflow-hidden"
            style={{ background: "linear-gradient(180deg, rgba(100,180,255,0.4), transparent)" }}
          >
            <div
              className="w-full h-3 animate-bounce"
              style={{ background: "rgba(140,200,255,0.5)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}