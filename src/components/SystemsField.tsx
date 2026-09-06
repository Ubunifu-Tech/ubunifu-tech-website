'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import styles from './SystemsField.module.css';

type Point = {
  edge: number;
  offset: number;
  phase: number;
  bend: number;
  size: number;
  color: string;
};

const palette = ['#FF6B2C', '#6D3FE8', '#2E5BFF', '#FFFFFF'] as const;

const points: Point[] = Array.from({ length: 36 }, (_, index) => ({
  edge: index % 4,
  offset: ((index * 37) % 101) / 100,
  phase: ((index * 29) % 97) / 97,
  bend: (((index * 17) % 41) - 20) / 20,
  size: 1.2 + (index % 4) * 0.42,
  color: palette[index % palette.length],
}));

const modules = [
  { x: -0.19, y: -0.08, color: '#FF6B2C' },
  { x: 0.02, y: -0.2, color: '#6D3FE8' },
  { x: 0.22, y: -0.04, color: '#2E5BFF' },
  { x: -0.15, y: 0.16, color: '#6D3FE8' },
  { x: 0.08, y: 0.18, color: '#FF6B2C' },
  { x: 0.27, y: 0.16, color: '#2E5BFF' },
] as const;

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function hexToRgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * A lightweight 2.5D system diagram for the homepage hero. It deliberately
 * stays decorative: the hero copy carries the meaning for assistive tech.
 */
export const SystemsField: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let visible = true;
    let pageVisible = document.visibilityState === 'visible';
    let compact = false;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      compact = width < 760;
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const startPoint = (point: Point) => {
      if (point.edge === 0) return { x: point.offset * width, y: -20 };
      if (point.edge === 1) return { x: width + 20, y: point.offset * height };
      if (point.edge === 2) return { x: point.offset * width, y: height + 20 };
      return { x: -20, y: point.offset * height };
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);

      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;

      const centreX = width * (0.5 + pointerX * 0.018);
      const centreY = height * (0.57 + pointerY * 0.018);
      const scale = Math.min(width, height);
      const staticScene = reduceMotion || compact;
      const clock = staticScene ? 0.72 : time * 0.000055;
      const rotation = -0.055 + pointerX * 0.025;

      context.save();
      context.translate(centreX, centreY);
      context.rotate(rotation);

      // Quiet contour rings give the assembly a spatial field without WebGL.
      for (let ring = 0; ring < 7; ring += 1) {
        context.beginPath();
        context.ellipse(
          0,
          ring * 2 - 8,
          scale * (0.13 + ring * 0.052),
          scale * (0.07 + ring * 0.029),
          0,
          0,
          Math.PI * 2,
        );
        context.strokeStyle = `rgba(255,255,255,${0.12 - ring * 0.009})`;
        context.lineWidth = 1;
        context.stroke();
      }

      // The six coloured modules form one stable, connected operating system.
      modules.forEach((module, index) => {
        const x = module.x * scale;
        const y = module.y * scale * 0.72;
        const depth = 1 + (index % 3) * 0.08;

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(x, y);
        context.strokeStyle = hexToRgba(module.color, 0.42);
        context.lineWidth = 1;
        context.stroke();

        context.save();
        context.translate(x, y);
        context.transform(1, -0.28, 0.55, 0.72, 0, 0);
        context.fillStyle = hexToRgba(module.color, 0.2);
        context.strokeStyle = hexToRgba(module.color, 0.92);
        context.lineWidth = 1.15 / depth;
        context.fillRect(-10 * depth, -10 * depth, 20 * depth, 20 * depth);
        context.strokeRect(-10 * depth, -10 * depth, 20 * depth, 20 * depth);
        context.restore();
      });

      context.save();
      context.transform(1, -0.28, 0.55, 0.72, 0, 0);
      context.fillStyle = 'rgba(31,26,54,0.72)';
      context.strokeStyle = 'rgba(255,255,255,0.9)';
      context.lineWidth = 1.4;
      context.fillRect(-18, -18, 36, 36);
      context.strokeRect(-18, -18, 36, 36);
      context.restore();
      context.restore();

      // Inputs follow curved paths into the assembly, then begin again.
      const scenePoints = compact ? points.slice(0, 20) : points;
      scenePoints.forEach((point, index) => {
        const start = startPoint(point);
        const destination = modules[index % modules.length];
        const moduleX = destination.x * scale;
        const moduleY = destination.y * scale * 0.72;
        const endX = centreX + moduleX * Math.cos(rotation) - moduleY * Math.sin(rotation);
        const endY = centreY + moduleX * Math.sin(rotation) + moduleY * Math.cos(rotation);
        const raw = staticScene ? 0.92 : (clock + point.phase) % 1;
        const progress = easeInOut(raw);
        const controlX = (start.x + endX) * 0.5 + point.bend * width * 0.08;
        const controlY = (start.y + endY) * 0.5 - Math.abs(point.bend) * height * 0.12;
        const inverse = 1 - progress;
        const x = inverse * inverse * start.x + 2 * inverse * progress * controlX + progress * progress * endX;
        const y = inverse * inverse * start.y + 2 * inverse * progress * controlY + progress * progress * endY;

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.quadraticCurveTo(controlX, controlY, endX, endY);
        context.strokeStyle = hexToRgba(point.color, 0.055);
        context.lineWidth = 0.8;
        context.stroke();

        context.beginPath();
        context.arc(x, y, point.size, 0, Math.PI * 2);
        context.fillStyle = hexToRgba(point.color, 0.72 * (1 - raw * 0.38));
        context.fill();
      });
    };

    const animate = (time: number) => {
      draw(time);
      if (visible && pageVisible && !reduceMotion && !compact) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    const begin = () => {
      window.cancelAnimationFrame(frame);
      if (visible && pageVisible && !reduceMotion && !compact) {
        frame = window.requestAnimationFrame(animate);
      } else {
        draw();
      }
    };

    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || compact || !visible || !pageVisible) return;
      const bounds = canvas.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (outside) {
        targetX = 0;
        targetY = 0;
        return;
      }

      targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    };

    const handleVisibility = () => {
      pageVisible = document.visibilityState === 'visible';
      begin();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      begin();
    });
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        begin();
      },
      { threshold: 0.02 },
    );

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    window.addEventListener('pointermove', handlePointer, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    resize();
    begin();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', handlePointer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className ?? ''}`}
      aria-hidden="true"
    />
  );
};
