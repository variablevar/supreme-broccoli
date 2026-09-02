'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, ContactShadows } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

const METAL = '#3f3f46';
const DARK_METAL = '#27272a';
const PCB = '#18181b';
const ACCENT = '#84cc16';

function Fan({ position }: { position: [number, number, number] }) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.z -= delta * 10;
  });

  return (
    <group position={position}>
      {/* housing ring */}
      <mesh>
        <torusGeometry args={[0.44, 0.045, 16, 48]} />
        <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* spinning blades */}
      <group ref={bladesRef}>
        {Array.from({ length: 9 }).map((_, i) => (
          <group key={i} rotation={[0, 0, (i / 9) * Math.PI * 2]}>
            <mesh position={[0, 0.24, 0]} rotation={[0, 0, 0.35]}>
              <boxGeometry args={[0.09, 0.34, 0.02]} />
              <meshStandardMaterial color={DARK_METAL} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}
        {/* hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.06, 24]} />
          <meshStandardMaterial color={ACCENT} metalness={0.4} roughness={0.4} emissive={ACCENT} emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

function GraphicsCard() {
  return (
    <group rotation={[0.1, -0.4, 0]}>
      {/* backplate */}
      <mesh position={[0, 0, -0.16]}>
        <boxGeometry args={[3.6, 1.55, 0.05]} />
        <meshStandardMaterial color={METAL} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* PCB */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[3.55, 1.5, 0.06]} />
        <meshStandardMaterial color={PCB} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* heatsink fins */}
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={i} position={[-1.65 + i * 0.144, -0.82, -0.05]}>
          <boxGeometry args={[0.05, 0.16, 0.22]} />
          <meshStandardMaterial color="#71717a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* cooler shroud */}
      <mesh>
        <boxGeometry args={[3.5, 1.45, 0.22]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.75} roughness={0.3} />
      </mesh>

      {/* three fans on the shroud face */}
      <Fan position={[-1.15, 0, 0.13]} />
      <Fan position={[0, 0, 0.13]} />
      <Fan position={[1.15, 0, 0.13]} />

      {/* LED accent strip along the top edge */}
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[3.3, 0.035, 0.035]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.6} />
      </mesh>

      {/* brand plate */}
      <mesh position={[-1.45, 0.55, 0.13]}>
        <boxGeometry args={[0.5, 0.22, 0.02]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* PCIe connector */}
      <mesh position={[-0.4, -0.85, 0]}>
        <boxGeometry args={[1.9, 0.14, 0.1]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* IO bracket */}
      <mesh position={[1.83, 0, -0.05]}>
        <boxGeometry args={[0.06, 1.7, 0.3]} />
        <meshStandardMaterial color="#71717a" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* 8-pin power connector */}
      <mesh position={[1.2, 0.78, -0.02]}>
        <boxGeometry args={[0.32, 0.12, 0.16]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function GpuClusterCanvas() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0.6, 6.5], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <pointLight position={[-6, -4, 4]} intensity={0.4} color={ACCENT} />
          <pointLight position={[6, 3, -4]} intensity={0.3} color="#e4e4e7" />

          <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.8}>
            <GraphicsCard />
          </Float>

          {/* data particles drifting through the scene */}
          <Sparkles count={120} scale={[14, 8, 8]} size={2} speed={0.4} opacity={0.5} color={ACCENT} />
          <Sparkles count={80} scale={[16, 10, 10]} size={1.2} speed={0.25} opacity={0.35} color="#d4d4d8" />

          <ContactShadows position={[0, -2.2, 0]} opacity={0.35} scale={12} blur={2.5} far={4} />

          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
        </Suspense>
      </Canvas>
    </div>
  );
}
