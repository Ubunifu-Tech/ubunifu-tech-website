import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { DOCUMENT_KIND_LABEL } from '@/lib/console/documents';
import type { DocumentKind } from '@/generated/prisma/client';
import { SettingsTabs } from '../SettingsTabs';
import { DefaultForm } from './DefaultForm';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';

export const metadata = { title: 'Document settings' };

const KINDS: DocumentKind[] = [
  'proposal',
  'contract',
  'statement_of_work',
  'change_order',
  'handover',
];

/**
 * The sections that go on every document of a kind: the words the business
 * wants on every proposal or agreement, written once. The assistant is told
 * they are coming, so it does not write them again.
 */
export default async function DocumentSettingsPage() {
  const staff = await requirePermission('documents');
  const saved = await db.documentDefault.findMany({ select: { kind: true, bodyMarkdown: true } });
  const bodyFor = (kind: DocumentKind) => saved.find((row) => row.kind === kind)?.bodyMarkdown ?? '';

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.lead}>Sections that go on every document of a kind.</p>
        </div>
      </div>

      <SettingsTabs current="documents" staff={staff} />

      <div className={styles.stack}>
        {KINDS.map((kind) => (
          <section key={kind} className={forms.card}>
            <div className={forms.cardHeader}>
              <h2 className={forms.cardTitle}>{DOCUMENT_KIND_LABEL[kind]}</h2>
              <span className={forms.cardMeta}>
                {bodyFor(kind) ? 'Added to every one' : 'Nothing added'}
              </span>
            </div>
            <DefaultForm kind={kind} label={DOCUMENT_KIND_LABEL[kind]} body={bodyFor(kind)} />
          </section>
        ))}
      </div>
    </main>
  );
}
