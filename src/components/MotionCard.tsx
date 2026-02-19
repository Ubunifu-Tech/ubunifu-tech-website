'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MotionCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export const MotionCard: React.FC<MotionCardProps> = ({ children, index = 0, className }) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};
