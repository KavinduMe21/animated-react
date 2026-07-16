import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import Particle from "../three/Particle";

function Box() {
  const mesh = useRef<any>(null);

  useFrame(() => {
    mesh.current.rotation.x += 0.01;
    mesh.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

export default function Scene() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        zIndex: -1,
      }}
    >
      <Canvas>
        <ambientLight />

        <pointLight position={[5, 5, 5]} />

        <Box />

        <OrbitControls />
        <Particle />
      </Canvas>
    </div>
  );
}
