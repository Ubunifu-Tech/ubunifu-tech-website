'use client';

// "From raw data to decisions" — the Data Analytics + AI story as a living
// pipeline. The stage cards are real, accessible HTML content; a canvas behind
// them animates particles flowing through the stages. Particles are hidden
// under the (opaque) cards, so each stage reads as "processing" the stream.

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Database, Filter, Sparkles, LineChart } from 'lucide-react';
import styles from './DataFlow.module.css';

const ease = [0.16, 1, 0.3, 1] as const;

const STAGES = [
  { icon: Database, step: '01', title: 'Inputs', sub: 'Sales, stock, sensors, documents — however your data arrives.' },
  { icon: Filter, step: '02', title: 'Clean & organise', sub: 'Tidied, structured, and made trustworthy.' },
  { icon: Sparkles, step: '03', title: 'Models & AI', sub: 'Patterns surfaced, predictions, grounded assistants.' },
  { icon: LineChart, step: '04', title: 'Decisions', sub: 'Live dashboards and answers your team acts on.' },
];

const Arrow: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export const DataFlow: React.FC = () => {
  const flowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flow = flowRef.current;
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!flow || !canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let last = 0;
    let centers: { x: number; y: number }[] = [];
    let gradients: CanvasGradient[] = [];

    // Brand stops, orange -> purple
    const C0 = [255, 107, 44];
    const C1 = [109, 63, 232];

    const particles = Array.from({ length: 20 }, (_, i) => ({
      p: i / 20,
      speed: 0.05 + (i % 5) * 0.012,
    }));

    const measure = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const rect = flow.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // Layout-box centers via offsets (transform-independent), so connectors
      // stay aligned even while the cards are animating in. The grid's own
      // offset is included so this holds whether the grid is full-width or a
      // centered, max-width column.
      const gx = grid.offsetLeft;
      const gy = grid.offsetTop;
      centers = Array.from(grid.children).map((el) => {
        const c = el as HTMLElement;
        return { x: gx + c.offsetLeft + c.offsetWidth / 2, y: gy + c.offsetTop + c.offsetHeight / 2 };
      });
      // Cache one gradient per segment; endpoints only change here (on resize).
      gradients = [];
      for (let i = 0; i < centers.length - 1; i++) {
        const g = ctx.createLinearGradient(centers[i].x, centers[i].y, centers[i + 1].x, centers[i + 1].y);
        g.addColorStop(0, `rgba(${C0[0]},${C0[1]},${C0[2]},0.28)`);
        g.addColorStop(1, `rgba(${C1[0]},${C1[1]},${C1[2]},0.28)`);
        gradients.push(g);
      }
    };

    const posAt = (p: number) => {
      const n = centers.length;
      if (n < 2) return centers[0] || { x: 0, y: 0 };
      const seg = Math.min(Math.floor(p * (n - 1)), n - 2);
      const lt = p * (n - 1) - seg;
      return {
        x: lerp(centers[seg].x, centers[seg + 1].x, lt),
        y: lerp(centers[seg].y, centers[seg + 1].y, lt),
      };
    };

    const drawConnectors = () => {
      ctx.lineWidth = 2;
      for (let i = 0; i < centers.length - 1; i++) {
        ctx.strokeStyle = gradients[i] || `rgba(${C0[0]},${C0[1]},${C0[2]},0.28)`;
        ctx.beginPath();
        ctx.moveTo(centers[i].x, centers[i].y);
        ctx.lineTo(centers[i + 1].x, centers[i + 1].y);
        ctx.stroke();
      }
    };

    const dot = (p: number) => {
      const pos = posAt(p);
      const r = Math.round(lerp(C0[0], C1[0], p));
      const g = Math.round(lerp(C0[1], C1[1], p));
      const b = Math.round(lerp(C0[2], C1[2], p));
      ctx.save();
      ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.6, 0, 6.283);
      ctx.fill();
      ctx.restore();
    };

    const frame = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      ctx.clearRect(0, 0, W, H);
      drawConnectors();
      for (const pt of particles) {
        pt.p += pt.speed * dt;
        if (pt.p > 1) pt.p -= 1;
        dot(pt.p);
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, W, H);
      drawConnectors();
      for (let i = 0; i < 12; i++) dot(i / 12);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    measure();
    if (reduce) renderStatic();

    const ro = new ResizeObserver(() => {
      measure();
      if (reduce || !running) renderStatic();
    });
    ro.observe(flow);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(flow);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.introGrid}>
          <motion.div
            className={styles.head}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <span className="eyebrow">Data &amp; AI</span>
            <h2 className={styles.heading}>From raw data to decisions</h2>
            <p className={styles.sub}>
              The analytics and AI side of what we do: we take raw, messy data and
              turn it into models and live dashboards your team actually uses.
            </p>
          </motion.div>

          <motion.div
            className={styles.visual}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: 0.08, ease }}
          >
            <Image
              src="/editorial/data-to-decisions.png"
              alt="Editorial illustration of unstructured documents and data flowing into clean dashboard-like decision panels"
              fill
              sizes="(max-width: 900px) 100vw, 560px"
              className={styles.visualImg}
            />
          </motion.div>
        </div>

        <div className={styles.flow} ref={flowRef}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <div className={styles.grid} ref={gridRef}>
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease }}
                >
                  <span className={styles.icon}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <span className={styles.step}>{s.step}</span>
                    <h3 className={styles.ctitle}>{s.title}</h3>
                    <p className={styles.csub}>{s.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <Link href="/build#data" className={styles.link}>
          Explore data &amp; AI <Arrow />
        </Link>
      </div>
    </section>
  );
};
