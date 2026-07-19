import { useRef, useEffect, useMemo, Suspense, Component, type ReactNode } from "react";
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
/*  3D Whale – GLB model that orbits the scene                        */
/* ------------------------------------------------------------------ */
function Whale({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/white_mesh.glb");

  // Clone the scene so it can be reused without conflicts
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
    groupRef.current.position.y = Math.sin(t * 0.7) * 0.18;

    // Face movement direction (flipped)
    groupRef.current.rotation.y = -angle - Math.PI / 2;
    // Gentle body roll
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.04;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.02;
  });

  return (
    <group ref={groupRef} scale={1.1}>
      <primitive object={clonedScene} scale={1} />
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

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: "700vh" }}
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 z-10 pointer-events-none">
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