import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 80;

    // Grid geometry — dots in a grid
    const gridSize = 28;
    const spacing = 6;
    const positions: number[] = [];
    const colors: number[] = [];

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        positions.push(x * spacing, y * spacing, 0);
        // Cool indigo-violet color with randomized brightness
        const brightness = 0.04 + Math.random() * 0.12;
        colors.push(0.3 * brightness * 6, 0.15 * brightness * 6, 1.0 * brightness * 6);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Connection lines — sparse glowing lines between nearby dots
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.06,
    });

    const linePositions: number[] = [];
    const step = spacing;
    for (let x = -gridSize; x < gridSize; x++) {
      for (let y = -gridSize; y < gridSize; y++) {
        if (Math.random() > 0.92) {
          linePositions.push(x * step, y * step, 0, (x + 1) * step, y * step, 0);
        }
        if (Math.random() > 0.92) {
          linePositions.push(x * step, y * step, 0, x * step, (y + 1) * step, 0);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMaterial);
    scene.add(lines);

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener('resize', resize);

    let mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / width - 0.5) * 2;
      mouse.y = -(e.clientY / height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    let frame = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame += 0.003;

      // Subtle parallax on mouse
      points.rotation.x += (mouse.y * 0.04 - points.rotation.x) * 0.02;
      points.rotation.y += (mouse.x * 0.04 - points.rotation.y) * 0.02;
      lines.rotation.x = points.rotation.x;
      lines.rotation.y = points.rotation.y;

      // Slow drift
      points.position.z = Math.sin(frame) * 2;

      // Pulse opacity
      material.opacity = 0.6 + Math.sin(frame * 2) * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
