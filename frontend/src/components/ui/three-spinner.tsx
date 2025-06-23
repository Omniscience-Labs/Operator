'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ThreeSpinner({ 
  size = 32, 
  color = 'currentColor',
  className = '' 
}: ThreeSpinnerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'low-power'
    });
    
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    mountRef.current.appendChild(renderer.domElement);

    // Create wireframe geometry - icosphere for clean look
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    
    // Parse color - black in light mode, muted in dark mode
    let threeColor = new THREE.Color(0x000000); // black fallback for light mode
    if (color === 'currentColor') {
      // Detect dark mode
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (isDarkMode) {
        // Use muted foreground color in dark mode
        threeColor = new THREE.Color(0x9ca3af); // gray-400
      } else {
        // Use black in light mode for better visibility and energy
        threeColor = new THREE.Color(0x000000);
      }
    } else {
      try {
        threeColor = new THREE.Color(color);
      } catch {
        // Fallback to black for light mode
        threeColor = new THREE.Color(0x000000);
      }
    }

    // Create wireframe material
    const material = new THREE.MeshBasicMaterial({
      color: threeColor,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    // Create mesh
    const wireframe = new THREE.Mesh(geometry, material);
    scene.add(wireframe);

    // Add some inner structure for more interesting visual
    const innerGeometry = new THREE.OctahedronGeometry(0.6, 0);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: threeColor,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const innerWireframe = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerWireframe);

    // Position camera
    camera.position.z = 2.5;

    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Physics-based spinning animation
    let currentSpeed = 0;
    let targetSpeed = 0.12; // Initial high speed
    let acceleration = 0.002;
    let deceleration = 0.0008;
    let isAccelerating = true;
    let cycleTime = 0;
    let spinDirection = { x: 1, y: 1, z: 0.3 }; // Primary spin axes
    
    const animate = () => {
      cycleTime += 0.016; // ~60fps
      
      // Physics-based speed control - energetic spin that slows down then speeds up again
      if (isAccelerating) {
        currentSpeed += acceleration;
        if (currentSpeed >= targetSpeed) {
          isAccelerating = false;
          // Start deceleration after a moment at max speed
          setTimeout(() => {
            targetSpeed = 0.005; // Very slow, almost stopped
          }, 800 + Math.random() * 1200); // Random duration at high speed (0.8-2s)
        }
      } else {
        if (currentSpeed > targetSpeed) {
          currentSpeed = Math.max(currentSpeed - deceleration, targetSpeed);
        }
        
        // When nearly stopped, start new cycle with burst of energy
        if (currentSpeed <= 0.008 && Math.random() < 0.008) { // 0.8% chance per frame when slow
          isAccelerating = true;
          targetSpeed = 0.08 + Math.random() * 0.08; // Randomize next max speed (0.08-0.16)
          acceleration = 0.001 + Math.random() * 0.003; // Randomize acceleration
          // Vary the spin direction slightly for more organic feel
          spinDirection.x = 0.8 + Math.random() * 0.4; // 0.8-1.2
          spinDirection.y = 0.8 + Math.random() * 0.4; // 0.8-1.2
          spinDirection.z = 0.1 + Math.random() * 0.4; // 0.1-0.5
        }
      }
      
      // Apply rotation with variable speed and direction
      wireframe.rotation.x += currentSpeed * spinDirection.x;
      wireframe.rotation.y += currentSpeed * spinDirection.y;
      wireframe.rotation.z += currentSpeed * spinDirection.z;
      
      // Counter-rotate inner structure with different physics for visual depth
      const innerSpeed = currentSpeed * 0.6; // Slower than outer
      innerWireframe.rotation.x -= innerSpeed * 0.7;
      innerWireframe.rotation.y += innerSpeed * 1.2;
      innerWireframe.rotation.z -= innerSpeed * 0.4;

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup function
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        // Dispose of geometries and materials
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size, color]);

  return (
    <div 
      ref={mountRef} 
      className={className}
      style={{ 
        width: size, 
        height: size,
        display: 'inline-block'
      }} 
    />
  );
} 