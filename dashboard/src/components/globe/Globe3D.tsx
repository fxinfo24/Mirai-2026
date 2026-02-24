'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface BotLocation {
  lat: number;
  lon: number;
  count: number;
  country: string;
}

interface Globe3DProps {
  bots?: BotLocation[];
  autoRotate?: boolean;
}

function GlobeModel({ bots = [] }: { bots: BotLocation[] }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Auto-rotate globe
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.001;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
  });

  // Convert lat/lon to 3D coordinates
  const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    
    return new THREE.Vector3(x, y, z);
  };

  // Create bot markers
  const botMarkers = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    
    bots.forEach((bot) => {
      const pos = latLonToVector3(bot.lat, bot.lon, 1.01);
      positions.push(pos.x, pos.y, pos.z);
      
      // Color based on bot count (green to red)
      const intensity = Math.min(bot.count / 100, 1);
      colors.push(0, 1 - intensity, intensity);
      
      // Size based on count
      sizes.push(Math.max(0.02, bot.count / 50));
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    return geometry;
  }, [bots]);

  return (
    <group>
      {/* Main globe sphere */}
      <Sphere ref={globeRef} args={[1, 64, 64]}>
        <meshPhongMaterial
          color="#0a0e27"
          emissive="#00ff9f"
          emissiveIntensity={0.1}
          shininess={100}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Wireframe overlay */}
      <Sphere args={[1.005, 32, 32]}>
        <meshBasicMaterial
          color="#00ff9f"
          wireframe
          transparent
          opacity={0.1}
        />
      </Sphere>

      {/* Bot markers */}
      {bots.length > 0 && (
        <points ref={pointsRef} geometry={botMarkers}>
          <pointsMaterial
            size={0.05}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      )}

      {/* Atmosphere glow */}
      <Sphere args={[1.1, 64, 64]}>
        <meshBasicMaterial
          color="#00ff9f"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

export const Globe3D = ({ bots = [], autoRotate = true }: Globe3DProps) => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-primary-bg-secondary to-primary-bg">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ff9f" />

        {/* Globe */}
        <GlobeModel bots={bots} />

        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1.5}
          maxDistance={5}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};
