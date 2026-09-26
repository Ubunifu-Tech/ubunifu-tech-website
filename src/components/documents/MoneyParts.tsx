import React from 'react';
import { BrandLockup } from '@/components/BrandMark';
import type { Org } from '@/lib/console/org';
import money from './Money.module.css';

/** A value for a CSS string: quotes, backslashes and line breaks made safe. */
function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
}

/**
 * Paper only: A4, margins, and the footer on every page. Written in the
 * sheet rather than a stylesheet so it applies only while this document is
 * on the page.
 */
export function PageFurniture({ footer }: { footer: string }) {
  return (
    <style>{`@page { size: A4; margin: 14mm 14mm 18mm;
  @bottom-left { content: ${cssString(footer)}; font-family: Inter, system-ui, sans-serif; font-size: 8pt; color: #6d6975; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: Inter, system-ui, sans-serif; font-size: 8pt; color: #6d6975; } }`}</style>
  );
}

/**
 * The top of an invoice, receipt or refund note: the lockup, the kind of
 * document and its number, a two-tone title and the facts.
 */
export function MoneyBand({
  kind,
  number,
  title,
  accent,
  facts,
}: {
  kind: string;
  number: string;
  /** The first line of the title, in dark. */
  title: string;
  /** The second line, in violet: usually who it is for. */
  accent: string;
  facts: [label: string, value: React.ReactNode][];
}) {
  return (
    <header className={money.band}>
      <div className={money.bandTop}>
        <BrandLockup />
        <div>
          <p className={money.kind}>{kind}</p>
          <p className={money.number}>{number}</p>
        </div>
      </div>
      <h1 className={money.title}>
        {title}
        <span className={money.titleAccent}>{accent}</span>
      </h1>
      <dl className={money.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={money.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <svg className={money.watermark} viewBox="0 0 64 64" aria-hidden="true">
        <g opacity="0.18" fill="none" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round">
          <path d="M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5" stroke="#FF6B2C" />
          <path d="M43 13v23c0 11 6 18 14 18" stroke="#6D3FE8" />
          <path d="M29 16 57 10" stroke="#6D3FE8" />
        </g>
      </svg>
    </header>
  );
}

/** Who the document is from, and how to reach them. */
export function MoneyClosing({ org }: { org: Org }) {
  const website = org.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? 'ubunifutech.com';
  return (
    <footer className={money.closing}>
      <div>
        <BrandLockup className={money.closingLockup} />
        <p className={money.closingText}>
          {org.addressLines || org.tin
            ? `${org.legalName}${
                org.addressLines ? `, ${org.addressLines.split('\n').join(', ')}` : ''
              }${org.tin ? `. TIN ${org.tin}` : ''}${org.vrn ? `, VRN ${org.vrn}` : ''}.`
            : 'Building software and web platforms for how organisations in Tanzania work.'}
        </p>
      </div>
      <p className={money.closingContact}>
        {website}
        <br />
        {org.email}
        {org.phone && (
          <>
            <br />
            WhatsApp {org.phone}
          </>
        )}
      </p>
    </footer>
  );
}
