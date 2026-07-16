import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

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
/*  3D Whale – procedural geometry with glass material                */
/* ------------------------------------------------------------------ */
function Whale({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  const whaleMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#2266dd"),
        transmission: 0.88,
        roughness: 0.05,
        metalness: 0,
        thickness: 2,
        ior: 1.4,
        transparent: true,
        opacity: 0.9,
        envMapIntensity: 2,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
        attenuationColor: new THREE.Color("#1144aa"),
        attenuationDistance: 3,
      }),
    [],
  );

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

    // Face movement direction
    groupRef.current.rotation.y = -angle + Math.PI / 2;
    // Gentle body roll
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.04;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.02;

    // Tail wag
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 2.8) * 0.22;
      tailRef.current.rotation.x = Math.sin(t * 1.4) * 0.05;
    }
  });

  return (
    <group ref={groupRef} scale={1.1}>
      {/* Main body – elongated ellipsoid */}
      <mesh scale={[0.72, 0.52, 1.85]} material={whaleMat}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>

      {/* Head/melon bulge */}
      <mesh position={[0, 0.14, 1.6]} scale={[0.52, 0.42, 0.55]} material={whaleMat}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>

      {/* Lower jaw */}
      <mesh position={[0, -0.18, 1.35]} scale={[0.42, 0.2, 0.65]} material={whaleMat}>
        <sphereGeometry args={[1, 32, 24]} />
      </mesh>

      {/* Rostrum (snout tip) */}
      <mesh position={[0, 0.0, 2.0]} scale={[0.3, 0.22, 0.3]} material={whaleMat}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>

      {/* Eyes – emissive */}
      <mesh position={[0.4, 0.1, 1.2]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#bbddff" emissive="#4499ff" emissiveIntensity={4} />
      </mesh>
      <mesh position={[-0.4, 0.1, 1.2]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#bbddff" emissive="#4499ff" emissiveIntensity={4} />
      </mesh>

      {/* Dorsal fin */}
      <mesh position={[0, 0.58, -0.15]} rotation={[0.2, 0, 0]} scale={[0.06, 0.35, 0.3]} material={whaleMat}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>

      {/* Left pectoral fin */}
      <mesh position={[0.6, -0.18, 0.5]} rotation={[0.2, 0.2, 0.7]} scale={[0.04, 0.45, 0.2]} material={whaleMat}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>

      {/* Right pectoral fin */}
      <mesh position={[-0.6, -0.18, 0.5]} rotation={[0.2, -0.2, -0.7]} scale={[0.04, 0.45, 0.2]} material={whaleMat}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>

      {/* Tail section */}
      <group ref={tailRef} position={[0, 0.0, -2.0]}>
        {/* Peduncle */}
        <mesh scale={[0.25, 0.22, 0.75]} material={whaleMat}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
        {/* Left fluke */}
        <mesh position={[0.45, 0.05, -0.65]} rotation={[0.08, 0.25, 0.1]} scale={[0.55, 0.04, 0.3]} material={whaleMat}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        {/* Right fluke */}
        <mesh position={[-0.45, 0.05, -0.65]} rotation={[0.08, -0.25, -0.1]} scale={[0.55, 0.04, 0.3]} material={whaleMat}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      </group>

      {/* Belly ridges – subtle geometry detail */}
      {[0, 0.15, 0.3, 0.45, 0.6].map((offset, i) => (
        <mesh key={i} position={[0, -0.42 + i * 0.02, 0.3 + offset]} scale={[0.5 - i * 0.05, 0.01, 0.12]} material={whaleMat}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}

      {/* Inner glow light */}
      <pointLight color="#3388ff" intensity={5} distance={5} decay={2} position={[0, 0, 0.5]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  3D Human – mannequin style with metallic material                 */
/* ------------------------------------------------------------------ */
function Human() {
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#667799"),
        metalness: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 0.82,
        envMapIntensity: 1.5,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      }),
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 2.1, 0]} material={mat}>
        <sphereGeometry args={[0.2, 32, 32]} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.84, 0]} material={mat}>
        <capsuleGeometry args={[0.07, 0.12, 8, 16]} />
      </mesh>
      {/* Upper torso / chest */}
      <mesh position={[0, 1.52, 0]} material={mat}>
        <capsuleGeometry args={[0.24, 0.3, 8, 16]} />
      </mesh>
      {/* Lower torso / abdomen */}
      <mesh position={[0, 1.1, 0]} material={mat}>
        <capsuleGeometry args={[0.2, 0.22, 8, 16]} />
      </mesh>
      {/* Hips */}
      <mesh position={[0, 0.85, 0]} material={mat}>
        <capsuleGeometry args={[0.22, 0.08, 8, 16]} />
      </mesh>

      {/* Left shoulder */}
      <mesh position={[0.3, 1.7, 0]} material={mat}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      {/* Left upper arm */}
      <mesh position={[0.34, 1.48, 0]} rotation={[0, 0, 0.12]} material={mat}>
        <capsuleGeometry args={[0.055, 0.32, 8, 12]} />
      </mesh>
      {/* Left lower arm */}
      <mesh position={[0.38, 1.1, 0]} rotation={[0, 0, 0.06]} material={mat}>
        <capsuleGeometry args={[0.048, 0.3, 8, 12]} />
      </mesh>
      {/* Left hand */}
      <mesh position={[0.39, 0.88, 0]} material={mat}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>

      {/* Right shoulder */}
      <mesh position={[-0.3, 1.7, 0]} material={mat}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      {/* Right upper arm */}
      <mesh position={[-0.34, 1.48, 0]} rotation={[0, 0, -0.12]} material={mat}>
        <capsuleGeometry args={[0.055, 0.32, 8, 12]} />
      </mesh>
      {/* Right lower arm */}
      <mesh position={[-0.38, 1.1, 0]} rotation={[0, 0, -0.06]} material={mat}>
        <capsuleGeometry args={[0.048, 0.3, 8, 12]} />
      </mesh>
      {/* Right hand */}
      <mesh position={[-0.39, 0.88, 0]} material={mat}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>

      {/* Left upper leg */}
      <mesh position={[0.12, 0.55, 0]} material={mat}>
        <capsuleGeometry args={[0.09, 0.4, 8, 12]} />
      </mesh>
      {/* Left lower leg */}
      <mesh position={[0.12, 0.1, 0]} material={mat}>
        <capsuleGeometry args={[0.07, 0.4, 8, 12]} />
      </mesh>
      {/* Left foot */}
      <mesh position={[0.12, -0.16, 0.04]} scale={[0.7, 0.35, 1.2]} material={mat}>
        <sphereGeometry args={[0.08, 12, 12]} />
      </mesh>

      {/* Right upper leg */}
      <mesh position={[-0.12, 0.55, 0]} material={mat}>
        <capsuleGeometry args={[0.09, 0.4, 8, 12]} />
      </mesh>
      {/* Right lower leg */}
      <mesh position={[-0.12, 0.1, 0]} material={mat}>
        <capsuleGeometry args={[0.07, 0.4, 8, 12]} />
      </mesh>
      {/* Right foot */}
      <mesh position={[-0.12, -0.16, 0.04]} scale={[0.7, 0.35, 1.2]} material={mat}>
        <sphereGeometry args={[0.08, 12, 12]} />
      </mesh>

      {/* Rim light */}
      <pointLight color="#6688bb" intensity={2} distance={3} position={[0, 1.3, -0.5]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass Pole                                                        */
/* ------------------------------------------------------------------ */
function GlassPole() {
  return (
    <group position={[0, 1, 0]}>
      {/* Main pole */}
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 9, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#5599dd"
          transmission={0.94}
          roughness={0.02}
          metalness={0}
          thickness={0.4}
          ior={1.5}
          transparent
          opacity={0.55}
          envMapIntensity={2.5}
          clearcoat={1}
          clearcoatRoughness={0.02}
          side={THREE.DoubleSide}
          attenuationColor={new THREE.Color("#2266aa")}
          attenuationDistance={5}
        />
      </mesh>
      {/* Inner glow core */}
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, 9, 8]} />
        <meshBasicMaterial color="#66aaff" transparent opacity={0.35} />
      </mesh>
      {/* Top cap glow */}
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#88bbff" emissive="#4488ff" emissiveIntensity={3} transparent opacity={0.6} />
      </mesh>
      {/* Bottom cap glow */}
      <mesh position={[0, -4.5, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#88bbff" emissive="#4488ff" emissiveIntensity={3} transparent opacity={0.6} />
      </mesh>
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
      <ringGeometry args={[3.5, 3.65, 128]} />
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
        <Human />
        <GlassPole />
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
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.95}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.75} />
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
      style={{ height: "300vh" }}
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