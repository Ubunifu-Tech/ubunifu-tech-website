'use client';

// Particles that drift in scattered, then assemble into the "U" mark when the
// CtaBand scrolls into view. Target points are sampled from an offscreen render
// of the letter, so the shape stays crisp at any size.

import React, { useEffect, useRef } from 'react';
import styles from './LogoConstellation.module.css';

type Particle = { x: number; y: number; tx: number; ty: number; c: string; ph: number };

export const LogoConstellation: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let t0 = 0;
    let parts: Particle[] = [];

    const build = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (W < 2 || H < 2) return;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Sample the glyph from an offscreen render. Cap by width too so it stays
      // a backdrop accent (not an overpowering overlay) on narrow screens.
      const boxH = Math.min(H * 0.72, W * 0.72, 300);
      const off = document.createElement('canvas');
      const ow = Math.ceil(boxH * 0.92);
      const oh = Math.ceil(boxH * 1.06);
      off.width = ow;
      off.height = oh;
      const o = off.getContext('2d');
      if (!o) return;
      o.fillStyle = '#fff';
      o.font = `800 ${Math.round(boxH)}px Poppins, system-ui, sans-serif`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillText('U', ow / 2, oh / 2);
      const data = o.getImageData(0, 0, ow, oh).data;

      const step = Math.max(4, Math.round(boxH / 48));
      const offX = (W - ow) / 2;
      const offY = (H - oh) / 2;
      const next: Particle[] = [];
      for (let y = 0; y < oh; y += step) {
        for (let x = 0; x < ow; x += step) {
          if (data[(y * ow + x) * 4 + 3] > 130) {
            const tx = x + offX;
            const ty = y + offY;
            next.push({
              x: reduce ? tx : Math.random() * W,
              y: reduce ? ty : Math.random() * H,
              tx,
              ty,
              c: tx / W < 0.5 ? '#FF6B2C' : '#6D3FE8',
              ph: Math.random() * 6.283,
            });
          }
        }
      }
      parts = next;
    };

    const dot = (x: number, y: number, c: string) => {
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = 5;
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, 6.283);
      ctx.fill();
      ctx.restore();
    };

    const draw = (ts: number) => {
      if (!t0) t0 = ts;
      const time = (ts - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (reduce) {
          dot(p.x, p.y, p.c);
        } else {
          p.x += (p.tx - p.x) * 0.05;
          p.y += (p.ty - p.y) * 0.05;
          dot(p.x + Math.sin(time * 1.2 + p.ph) * 0.6, p.y + Math.cos(time + p.ph) * 0.6, p.c);
        }
      }
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (reduce) {
        draw(performance.now());
        return;
      }
      if (running) return;
      running = true;
      t0 = 0;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    build();
    if (reduce) draw(performance.now());

    const ro = new ResizeObserver(() => {
      build();
      if (reduce) draw(performance.now());
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(wrap);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.layer} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
