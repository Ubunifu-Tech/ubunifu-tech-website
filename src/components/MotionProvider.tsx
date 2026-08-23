'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';

export const MotionProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
