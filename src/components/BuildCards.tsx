'use client';

import React from 'react';
import { MotionCard } from './MotionCard';

interface BuildCardsProps {
  children: React.ReactNode[];
  className?: string;
}

export const BuildCards: React.FC<BuildCardsProps> = ({ children, className }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <MotionCard key={index} index={index}>
          {child}
        </MotionCard>
      ))}
    </div>
  );
};
