'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { site } from '@/content/site';
import styles from './WhatsAppButton.module.css';

export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={`https://wa.me/${site.contact.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.button}
      aria-label="Chat on WhatsApp (opens in a new tab)"
    >
      <MessageCircle size={20} strokeWidth={2} />
      <span>WhatsApp</span>
    </a>
  );
};
