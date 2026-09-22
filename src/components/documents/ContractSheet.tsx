import { BrandMark } from '@/components/BrandMark';
import type { Org } from '@/lib/console/org';
import { renderMarkdown } from '@/lib/console/markdown';
import { formatDate } from '@/lib/console/money';
import sheet from '@/app/admin/receipts/Receipt.module.css';
import forms from '@/styles/forms.module.css';

/**
 * A proposal or agreement as a document: letterhead, who it is between, the
 * text, the terms it comes with, and where it was signed. The client's copy
 * and the staff print view render this same sheet, so a printed agreement is
 * exactly what was signed. Nothing internal appears on it.
 */
export function ContractSheet({
  org,
  kind,
  title,
  reference,
  client,
  projectName,
  sentAt,
  bodyMarkdown,
  terms,
  signature,
}: {
  org: Org;
  kind: string;
  title: string;
  reference: string;
  client: { name: string; legalName: string | null };
  projectName: string;
  sentAt: Date | null;
  bodyMarkdown: string;
  terms: { title: string; bodyMarkdown: string } | null;
  signature: { signerName: string; initials: string | null; signedAt: Date } | null;
}) {
  const clientName = client.legalName ?? client.name;

  return (
    <article className={sheet.sheet}>
      <header className={sheet.head}>
        <div className={sheet.issuer}>
          <BrandMark className={sheet.mark} title="Ubunifu Technologies" />
          <p className={sheet.issuerName}>
            {org.legalName}
            {org.addressLines && (
              <span className={sheet.issuerLine}>{org.addressLines.split('\n').join(', ')}</span>
            )}
            <span className={sheet.issuerLine}>{org.email}</span>
          </p>
        </div>
        <div className={sheet.docType}>
          <p className={sheet.docLabel}>{kind}</p>
          <p className={sheet.docNumber}>{reference}</p>
        </div>
      </header>

      <h1 className={sheet.docTitle}>{title}</h1>

      <div className={sheet.parties}>
        <div>
          <p className={sheet.partyLabel}>Between</p>
          <p className={sheet.partyValue}>
            {org.legalName}
            <br />
            and {clientName}
          </p>
        </div>
        <div>
          <p className={sheet.partyLabel}>For</p>
          <p className={sheet.partyValue}>{projectName}</p>
        </div>
        {sentAt && (
          <div>
            <p className={sheet.partyLabel}>Date</p>
            <p className={sheet.partyValue}>{formatDate(sentAt)}</p>
          </div>
        )}
      </div>

      <div
        className={`${forms.prose} ${sheet.body}`}
        // Escaped first; only headings, paragraphs, lists, tables and emphasis
        // are reintroduced by the renderer.
        dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMarkdown) }}
      />

      <section className={sheet.signatures}>
        <div>
          <p className={sheet.partyLabel}>For {clientName}</p>
          {signature ? (
            <p className={sheet.partyValue}>
              Signed by {signature.signerName}
              {signature.initials ? ` (${signature.initials})` : ''}
              <br />
              {formatDate(signature.signedAt)}
            </p>
          ) : (
            <p className={sheet.signLine}>Not signed yet</p>
          )}
        </div>
        <div>
          <p className={sheet.partyLabel}>For {org.legalName}</p>
          <p className={sheet.partyValue}>
            Issued {sentAt ? formatDate(sentAt) : ''}
          </p>
        </div>
      </section>

      {signature && (
        <p className={sheet.foot}>
          Signed electronically in the Ubunifu client portal
          {terms ? `, together with the ${terms.title} below` : ''}.
        </p>
      )}

      {terms && (
        <section className={sheet.appendix}>
          <p className={sheet.partyLabel}>Accepted with this {kind.toLowerCase()}</p>
          <h2 className={sheet.appendixTitle}>{terms.title}</h2>
          <div
            className={`${forms.prose} ${sheet.body}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(terms.bodyMarkdown) }}
          />
        </section>
      )}
    </article>
  );
}
