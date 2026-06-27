'use client';

// Transparent animated service constellation for the Services hero.
// It keeps the original rotating-orbit idea, but uses depth, scale, alpha,
// and layered shadows so it reads as a 3D object sitting in the page hero.

import React, { useEffect, useRef } from 'react';
import styles from './ServiceConstellation.module.css';

type Node = {
  key: string;
  label: string;
  detail: string;
  color: string;
};

const NODES: ReadonlyArray<Node> = [
  { key: 'web', label: 'Web', detail: 'Sites & apps', color: '#FF6B2C' },
  { key: 'hosting', label: 'Hosting', detail: 'Domains & email', color: '#2E5BFF' },
  { key: 'data', label: 'Data', detail: 'Dashboards', color: '#6D3FE8' },
  { key: 'ai', label: 'AI', detail: 'Automation', color: '#FF8F5A' },
  { key: 'branding', label: 'Branding', detail: 'Identity', color: '#C2693B' },
  { key: 'strategy', label: 'Strategy', detail: 'Roadmaps', color: '#3D1FA0' },
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
    let angle = -0.58;
    const ease = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const pointer = { x: -1e4, y: -1e4, inside: false };
    let hover = -1;

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    const drawOrbit = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      alpha: number,
      width: number,
      color = '109,63,232',
    ) => {
      ctx.save();
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawNode = (
      node: Node,
      x: number,
      y: number,
      depth: number,
      active: boolean,
      compact: boolean,
    ) => {
      const scale = compact ? 0.84 + depth * 0.14 : 0.88 + depth * 0.2;
      const w = (compact ? 88 : 118) * scale;
      const h = (compact ? 34 : 44) * scale;
      const r = compact ? 12 : 14;
      const bx = Math.max(8, Math.min(W - w - 8, x - w / 2));
      const by = Math.max(8, Math.min(H - h - 8, y - h / 2));
      const alpha = active ? 1 : 0.46 + depth * 0.42;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = active ? 'rgba(255,107,44,0.36)' : 'rgba(31,26,54,0.16)';
      ctx.shadowBlur = active ? 24 : 12 + depth * 10;
      ctx.shadowOffsetY = active ? 12 : 5 + depth * 7;
      ctx.fillStyle = active ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.82)';
      rr(bx, by - (active ? 4 : 0), w, h, r);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.strokeStyle = active ? node.color : 'rgba(31,26,54,0.1)';
      rr(bx, by - (active ? 4 : 0), w, h, r);
      ctx.stroke();

      const dotX = bx + 15 * scale;
      const dotY = by - (active ? 4 : 0) + h / 2;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, active ? 5.2 * scale : 4.3 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = active ? '#1F1A36' : 'rgba(31,26,54,0.86)';
      ctx.font = `${active ? 760 : 650} ${Math.round((compact ? 11 : 12) * scale)}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = compact ? 'middle' : 'alphabetic';
      ctx.fillText(node.label, bx + 27 * scale, compact ? dotY + 0.5 : by - (active ? 4 : 0) + 18 * scale);

      if (!compact) {
        ctx.fillStyle = 'rgba(90,81,112,0.88)';
        ctx.font = `550 ${Math.round(10 * scale)}px Inter, system-ui, sans-serif`;
        ctx.fillText(node.detail, bx + 27 * scale, by - (active ? 4 : 0) + 32 * scale);
      }
      ctx.restore();
    };

    const draw = (ts: number) => {
      if (!t0) t0 = ts;
      const time = (ts - t0) / 1000;

      ease.x += (target.x - ease.x) * 0.055;
      ease.y += (target.y - ease.y) * 0.055;
      if (!reduce) angle += 0.0019;

      ctx.clearRect(0, 0, W, H);

      const compact = W < 430;
      const cx = W / 2 + ease.x * 16;
      const cy = H / 2 + ease.y * 12;
      const base = Math.min(W, H);
      const rx = base * (compact ? 0.35 : 0.36);
      const ry = base * (compact ? 0.2 : 0.19);

      // Ground shadow and layered orbits, transparent over the page background.
      ctx.save();
      const ground = ctx.createRadialGradient(cx, cy + ry * 0.7, 4, cx, cy + ry * 0.7, rx * 1.18);
      ground.addColorStop(0, 'rgba(31,26,54,0.12)');
      ground.addColorStop(0.44, 'rgba(109,63,232,0.055)');
      ground.addColorStop(1, 'rgba(31,26,54,0)');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.7, rx * 1.18, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawOrbit(cx, cy, rx, ry, 0.22, 1.4);
      drawOrbit(cx, cy, rx * 0.72, ry * 0.72, 0.11, 1);
      drawOrbit(cx, cy, rx * 0.46, ry * 0.46, 0.09, 1, '255,107,44');

      const nodes = NODES.map((node, k) => {
        const a = angle + (k * Math.PI * 2) / NODES.length;
        const depth = (Math.sin(a) + 1) / 2;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        return { node, k, a, depth, x, y };
      });

      hover = -1;
      if (pointer.inside) {
        let best = compact ? 48 : 62;
        for (const n of nodes) {
          const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
          if (d < best) {
            best = d;
            hover = n.k;
          }
        }
      }
      canvas.style.cursor = hover >= 0 ? 'pointer' : 'default';

      const front = nodes.reduce((best, n) => (n.depth > best.depth ? n : best), nodes[0]);
      const activeKey = hover >= 0 ? hover : front.k;

      // Spokes and animated travelling pulses.
      nodes.forEach((n) => {
        const active = activeKey === n.k;
        const alpha = active ? 0.62 : 0.1 + n.depth * 0.25;
        const gradient = ctx.createLinearGradient(cx, cy, n.x, n.y);
        gradient.addColorStop(0, `rgba(255,107,44,${alpha})`);
        gradient.addColorStop(1, `rgba(109,63,232,${alpha})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = active ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();

        if (!reduce) {
          const p = (time * 0.45 + n.k / NODES.length) % 1;
          const px = cx + (n.x - cx) * p;
          const py = cy + (n.y - cy) * p;
          ctx.save();
          ctx.globalAlpha = (1 - p) * (active ? 0.9 : 0.42) * (0.45 + n.depth * 0.55);
          ctx.fillStyle = active ? n.node.color : '#FF8F5A';
          ctx.beginPath();
          ctx.arc(px, py, active ? 3 : 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Thin ring joining the services.
      ctx.save();
      ctx.strokeStyle = 'rgba(31,26,54,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      nodes.forEach((n, i) => {
        if (i === 0) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Hub behind the cards.
      const hubW = compact ? 138 : 176;
      const hubH = compact ? 72 : 86;
      ctx.save();
      ctx.shadowColor = 'rgba(31,26,54,0.18)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      rr(cx - hubW / 2, cy - hubH / 2, hubW, hubH, compact ? 18 : 22);
      ctx.fill();
      ctx.restore();

      const mark = compact ? 34 : 42;
      const markGradient = ctx.createLinearGradient(cx - mark, cy - mark, cx + mark, cy + mark);
      markGradient.addColorStop(0, '#FF6B2C');
      markGradient.addColorStop(1, '#6D3FE8');
      ctx.fillStyle = markGradient;
      rr(cx - mark / 2, cy - hubH * 0.28, mark, mark, compact ? 10 : 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${compact ? 19 : 24}px Poppins, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('U', cx, cy - hubH * 0.28 + mark / 2 + 1);

      ctx.fillStyle = '#1F1A36';
      ctx.font = `800 ${compact ? 13 : 15}px Inter, system-ui, sans-serif`;
      ctx.fillText('Digital side', cx, cy + hubH * 0.22);
      ctx.fillStyle = 'rgba(90,81,112,0.9)';
      ctx.font = `650 ${compact ? 9 : 10}px Inter, system-ui, sans-serif`;
      ctx.fillText('Build / Host / Run', cx, cy + hubH * 0.42);
      ctx.textAlign = 'left';

      // Cards are sorted by depth so the front cards sit on top.
      [...nodes]
        .sort((a, b) => a.depth - b.depth)
        .forEach((n) => {
          drawNode(n.node, n.x, n.y, n.depth, activeKey === n.k, compact);
        });

      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    const renderOnce = () => {
      if (!running) draw(performance.now());
    };

    const start = () => {
      if (running) return;
      running = true;
      if (reduce) {
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
        {NODES.map((node) => (
          <li key={node.key}>
            <a href={`#${node.key}`}>{node.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};
