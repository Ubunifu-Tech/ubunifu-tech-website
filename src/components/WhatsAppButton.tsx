'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import styles from './WhatsAppButton.module.css';

export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href="https://wa.me/255748548816"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.button}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={24} strokeWidth={2} />
    </a>
  );
};
