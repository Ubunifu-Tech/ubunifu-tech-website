'use client';

import React from 'react';
import { ScrollReveal } from './ScrollReveal';

interface BuildCardsProps {
  children: React.ReactNode[];
  className?: string;
}

export const BuildCards: React.FC<BuildCardsProps> = ({ children, className }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <ScrollReveal key={index} delay={index * 75}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
};
