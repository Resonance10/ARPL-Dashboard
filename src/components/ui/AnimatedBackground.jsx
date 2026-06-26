import React, { useRef, useEffect } from 'react';

const MAX_TRAIL = 50;
const WAKE_ANGLE = 0.4;
const WAVE_COUNT = 10;

export default function AnimatedBackground({ theme = 'light' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let trail = [];
    const isDark = theme === 'dark';
    const waveColor = isDark ? '255,255,255' : '100,130,200';

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      while (trail.length > 0 && now - trail[0].time > 2200) trail.shift();

      if (trail.length > 3) {
        for (let i = 2; i < trail.length; i++) {
          const p = trail[i];
          const pp = trail[i - 1];
          const dx = p.x - pp.x;
          const dy = p.y - pp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) continue;
          const angle = Math.atan2(dy, dx);
          const speed = Math.min(dist / 15, 1);
          const age = (now - p.time) / 2200;
          const life = Math.max(0, 1 - age);
          if (life <= 0) continue;

          for (let w = 0; w < WAVE_COUNT; w++) {
            const progress = w / WAVE_COUNT;
            const offset = 4 + progress * 30 * speed;
            const alpha = life * (1 - progress) * 0.08;

            for (let side = -1; side <= 1; side += 2) {
              const wa = angle + side * WAKE_ANGLE * (0.5 + speed * 0.5);
              const perpAngle = wa + Math.PI / 2;
              const endX = pp.x + Math.cos(wa) * offset;
              const endY = pp.y + Math.sin(wa) * offset;

              ctx.beginPath();
              ctx.moveTo(pp.x, pp.y);
              const steps = 20;
              for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const x = pp.x + (endX - pp.x) * t;
                const y = pp.y + (endY - pp.y) * t;
                const amp = (1 - t) * 3 * speed;
                const wave = Math.sin(t * Math.PI * 2 - w * 0.8) * amp;
                const wx = x + Math.cos(perpAngle) * wave;
                const wy = y + Math.sin(perpAngle) * wave;
                ctx.lineTo(wx, wy);
              }
              ctx.strokeStyle = `rgba(${waveColor},${alpha.toFixed(4)})`;
              ctx.lineWidth = 1.5 + life * 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      trail.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, time: Date.now() });
      while (trail.length > MAX_TRAIL) trail.shift();
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', width: '100vw', height: '100vh',
      }}
    />
  );
}
