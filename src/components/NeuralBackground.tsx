import React, { useEffect, useRef } from 'react';

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler with debounce
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }, 200);
    };

    // Initial size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Reduced number of nodes for better performance
    const nodes: Array<{x: number, y: number, vx: number, vy: number}> = [];
    const connections: Array<{from: number, to: number, strength: number}> = [];

    // Create fewer nodes for better performance
    const nodeCount = window.innerWidth < 768 ? 20 : 30;
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, // Reduced velocity
        vy: (Math.random() - 0.5) * 0.3  // Reduced velocity
      });
    }

    // Create connections with distance optimization
    const maxDistance = window.innerWidth < 768 ? 100 : 150;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        if (distance < maxDistance) {
          connections.push({
            from: i,
            to: j,
            strength: 1 - distance / maxDistance
          });
        }
      }
    }

    // Use requestAnimationFrame with throttling
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(animate);
        return;
      }
      
      lastFrameTime = currentTime;
      
      // Clear with reduced opacity for trail effect
      ctx.fillStyle = 'rgba(13, 27, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2); // Smaller nodes
        ctx.fillStyle = '#00FFAA';
        ctx.fill();
      });

      // Draw connections with opacity based on distance
      connections.forEach(conn => {
        const nodeA = nodes[conn.from];
        const nodeB = nodes[conn.to];
        
        // Skip rendering connections that are too faint
        if (conn.strength < 0.15) return;
        
        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
        ctx.strokeStyle = `rgba(0, 255, 170, ${conn.strength * 0.2})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      requestAnimationFrame(animate);
    };

    animate(0);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-30"
      style={{ 
        background: 'radial-gradient(ellipse at center, rgba(13, 27, 42, 0.8) 0%, rgba(0, 0, 0, 0.95) 70%)',
        willChange: 'transform' // Optimize for animations
      }}
    />
  );
}