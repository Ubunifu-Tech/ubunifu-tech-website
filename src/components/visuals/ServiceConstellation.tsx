'use client';

// Interactive map of the six service pillars orbiting an Arusha "U" hub.
// Canvas-drawn on a transparent background so it sits on the page's own
// backdrop. Nodes are clickable (scroll to the matching service section) and
// keyboard/screen-reader accessible via the visually-hidden link list.

import React, { useEffect, useRef } from 'react';
import styles from './ServiceConstellation.module.css';

type Node = { key: string; label: string };

const NODES: ReadonlyArray<Node> = [
  { key: 'web', label: 'Web' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'data', label: 'Data' },
  { key: 'ai', label: 'AI' },
  { key: 'branding', label: 'Branding' },
  { key: 'strategy', label: 'Strategy' },
];

function scrollToSection(key: string) {
  const el = document.getElementById(key);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export const ServiceConstellation: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let t0 = 0;
    let a = -0.5;
    const ease = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const pointer = { x: -1e4, y: -1e4, inside: false };
    let hover = -1;
    let screenNodes: { x: number; y: number; r: number; k: number }[] = [];

    const setSize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const draw = (ts: number) => {
      if (!t0) t0 = ts;
      const time = (ts - t0) / 1000;

      ease.x += (target.x - ease.x) * 0.06;
      ease.y += (target.y - ease.y) * 0.06;
      if (!reduce) a += 0.0022;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2 + ease.x * 14;
      const cy = H / 2 + ease.y * 10;
      const R = Math.min(W, H) * 0.33;
      const Rx = R;
      const Ry = R * (0.44 + ease.y * 0.05);
      const hub = { x: cx, y: cy };

      // Faint orbit ellipse
      ctx.save();
      ctx.strokeStyle = 'rgba(109,63,232,0.13)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Rx, Math.abs(Ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const nodes = NODES.map((n, k) => {
        const ang = a + (k * Math.PI * 2) / NODES.length;
        const x = cx + Math.cos(ang) * Rx;
        const y = cy + Math.sin(ang) * Ry;
        const f = (Math.sin(ang) + 1) / 2; // 0 = back, 1 = front
        return { n, k, x, y, f };
      });
      const order = [...nodes].sort((p, q) => p.f - q.f);

      // Hover (recompute each frame so it tracks moving nodes)
      hover = -1;
      if (pointer.inside) {
        let best = 22;
        for (const nd of nodes) {
          const dd = Math.hypot(nd.x - pointer.x, nd.y - pointer.y);
          if (dd < best) {
            best = dd;
            hover = nd.k;
          }
        }
      }
      canvas.style.cursor = hover >= 0 ? 'pointer' : 'default';

      // Hub -> node spokes + travelling pulses
      nodes.forEach((nd) => {
        const hovered = hover === nd.k;
        const al = hovered ? 0.75 : 0.12 + 0.33 * nd.f;
        const grd = ctx.createLinearGradient(hub.x, hub.y, nd.x, nd.y);
        grd.addColorStop(0, `rgba(255,107,44,${al})`);
        grd.addColorStop(1, `rgba(109,63,232,${al})`);
        ctx.strokeStyle = grd;
        ctx.lineWidth = hovered ? 2 : 1.1;
        ctx.beginPath();
        ctx.moveTo(hub.x, hub.y);
        ctx.lineTo(nd.x, nd.y);
        ctx.stroke();

        if (!reduce) {
          const tt = (time * 0.5 + nd.k / NODES.length) % 1;
          const px = hub.x + (nd.x - hub.x) * tt;
          const py = hub.y + (nd.y - hub.y) * tt;
          ctx.save();
          ctx.globalAlpha = (1 - tt) * (0.4 + 0.5 * nd.f);
          ctx.fillStyle = '#FF8F5A';
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, 6.283);
          ctx.fill();
          ctx.restore();
        }
      });

      // Ring edges between adjacent service nodes (the "interconnected" web)
      ctx.strokeStyle = 'rgba(31,26,54,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      nodes.forEach((nd, i) => {
        const nx = nodes[(i + 1) % nodes.length];
        if (i === 0) ctx.moveTo(nd.x, nd.y);
        ctx.lineTo(nx.x, nx.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Nodes (back to front)
      screenNodes = [];
      order.forEach((nd) => {
        const hovered = hover === nd.k;
        const r = (5 + 3 * nd.f) * (hovered ? 1.3 : 1);
        screenNodes.push({ x: nd.x, y: nd.y, r: Math.max(r, 10), k: nd.k });

        ctx.save();
        ctx.shadowColor = hovered ? 'rgba(255,107,44,0.55)' : 'rgba(109,63,232,0.32)';
        ctx.shadowBlur = hovered ? 18 : 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, r, 0, 6.283);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 2;
        ctx.strokeStyle = hovered ? '#FF6B2C' : 'rgba(109,63,232,0.55)';
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, r, 0, 6.283);
        ctx.stroke();

        ctx.fillStyle = hovered ? '#FF6B2C' : '#6D3FE8';
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, Math.max(2, r * 0.32), 0, 6.283);
        ctx.fill();

        const label = nd.n.label;
        ctx.font = `${hovered ? '600' : '500'} 12px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width;
        const padX = 7;
        const bh = 19;
        const bw = tw + padX * 2;
        let bx = nd.x + r + 6;
        const by = nd.y - bh / 2;
        if (bx + bw > W - 4) bx = nd.x - r - 6 - bw;
        ctx.globalAlpha = 0.45 + 0.55 * nd.f;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        rr(bx, by, bw, bh, 7);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(31,26,54,0.08)';
        rr(bx, by, bw, bh, 7);
        ctx.stroke();
        ctx.fillStyle = hovered ? '#C44615' : '#1F1A36';
        ctx.fillText(label, bx + padX, by + bh / 2 + 0.5);
        ctx.globalAlpha = 1;
      });

      // Hub: the brand "U" mark
      const hs = Math.max(18, Math.min(24, R * 0.16));
      ctx.save();
      ctx.shadowColor = 'rgba(255,107,44,0.4)';
      ctx.shadowBlur = 16;
      const hg = ctx.createLinearGradient(hub.x - hs, hub.y - hs, hub.x + hs, hub.y + hs);
      hg.addColorStop(0, '#FF6B2C');
      hg.addColorStop(1, '#6D3FE8');
      ctx.fillStyle = hg;
      rr(hub.x - hs, hub.y - hs, hs * 2, hs * 2, 12);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(hs * 1.1)}px Poppins, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('U', hub.x, hub.y + 1);
      ctx.textAlign = 'left';

      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    const renderOnce = () => {
      if (!running) draw(performance.now());
    };

    const start = () => {
      if (running) return;
      running = true;
      if (reduce) {
        // Static frame; redraw only on interaction/resize.
        running = false;
        draw(performance.now());
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
      target.x = (pointer.x / W - 0.5) * 2;
      target.y = (pointer.y / H - 0.5) * 2;
      if (reduce) renderOnce();
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.x = -1e4;
      pointer.y = -1e4;
      target.x = 0;
      target.y = 0;
      if (reduce) renderOnce();
    };
    const onClick = () => {
      if (hover >= 0) scrollToSection(NODES[hover].key);
    };

    setSize();

    const ro = new ResizeObserver(() => {
      setSize();
      renderOnce();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);

    // First paint (in case IO fires late)
    draw(performance.now());

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <ul className={styles.srOnly}>
        {NODES.map((n) => (
          <li key={n.key}>
            <a href={`#${n.key}`}>{n.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};
