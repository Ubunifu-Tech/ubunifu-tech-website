'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MotionCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export const MotionCard: React.FC<MotionCardProps> = ({ children, index = 0, className }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: '0px 0px -40px' }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : index * 0.075,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};
