import React from 'react';
import type { ReviewStatus } from '@/generated/prisma/client';
import { formatDate } from '@/lib/console/money';
import { CLIENT_REVIEW_LABEL, REVIEW_LABEL } from '@/lib/console/reviews';
import forms from '@/styles/forms.module.css';
import styles from './Review.module.css';

export type ReviewView = {
  round: number;
  title: string;
  previewUrl: string | null;
  note: string | null;
  status: ReviewStatus;
  createdAt: Date;
  answeredAt: Date | null;
  answer: string | null;
  askedBy?: { name: string } | null;
  answeredBy?: { name: string } | null;
};

const TONE: Record<ReviewStatus, string> = {
  open: forms.badgeWarn,
  approved: forms.badgeGood,
  changes_requested: forms.badgeWarn,
  withdrawn: '',
};

/**
 * One round as both sides read it: what was sent to look at, and the answer.
 * The words differ by who is reading; the facts do not.
 */
export function ReviewRound({
  review,
  audience,
  children,
}: {
  review: ReviewView;
  audience: 'staff' | 'client';
  /** The answer form, for the client, while the round is open. */
  children?: React.ReactNode;
}) {
  const label = audience === 'staff' ? REVIEW_LABEL : CLIENT_REVIEW_LABEL;
  const who = review.answeredBy?.name ?? (audience === 'staff' ? 'The client' : 'Your team');

  return (
    <div className={styles.round}>
      <div className={styles.head}>
        <h3 className={styles.title}>{review.title}</h3>
        <span className={`${forms.badge} ${TONE[review.status]}`}>{label[review.status]}</span>
      </div>
      <p className={styles.meta}>
        Round {review.round}, sent {formatDate(review.createdAt)}
        {audience === 'staff' && review.askedBy ? ` by ${review.askedBy.name}` : ''}
        {review.previewUrl && (
          <>
            {' · '}
            <a
              href={review.previewUrl}
              className={forms.link}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open the preview
            </a>
          </>
        )}
      </p>

      {review.note && (
        <div className={styles.note}>
          {review.note
            .split(/\n{2,}/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block, index) => (
              <p key={index}>{block}</p>
            ))}
        </div>
      )}

      {review.answeredAt && (
        <div className={styles.answer}>
          <p className={styles.answerWho}>
            {who} {review.status === 'approved' ? 'approved it' : 'asked for changes'} on{' '}
            {formatDate(review.answeredAt)}
            {review.answer ? ':' : '.'}
          </p>
          {review.answer && <p className={styles.answerText}>{review.answer}</p>}
        </div>
      )}

      {children}
    </div>
  );
}

/** Earlier rounds, one line each, newest first. */
export function EarlierRounds({
  reviews,
  audience,
}: {
  reviews: ReviewView[];
  audience: 'staff' | 'client';
}) {
  if (reviews.length === 0) return null;
  const label = audience === 'staff' ? REVIEW_LABEL : CLIENT_REVIEW_LABEL;
  return (
    <ul className={styles.earlier}>
      {reviews.map((review) => (
        <li key={review.round} className={styles.earlierItem}>
          Round {review.round}: {review.title}. {label[review.status]}
          {review.answeredAt ? `, ${formatDate(review.answeredAt)}` : ''}.
        </li>
      ))}
    </ul>
  );
}
