export default function Particle() {
  const positions = new Float32Array(3000);

  for (let i = 0; i < 3000; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>

      <pointsMaterial size={0.03} color="white" />
    </points>
  );
}
