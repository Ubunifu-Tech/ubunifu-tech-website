import { BrandLockup } from '@/components/BrandMark';
import type { Org } from '@/lib/console/org';
import { renderMarkdown } from '@/lib/console/markdown';
import { formatDate } from '@/lib/console/money';
import { cssString } from './MoneyParts';
import doc from './Document.module.css';

/**
 * "Agreement for Nifuate Tanzania Adventures website" set as two lines, what
 * it is and what it is for, the second in violet. A title without " for "
 * keeps its words and names the client on the second line instead.
 */
function titleLines(title: string, clientName: string): [string, string] {
  const at = title.indexOf(' for ');
  if (at > 0) return [title.slice(0, at + 4), title.slice(at + 5)];
  return [title, `for ${clientName}`];
}

/** Which of these the printed sheet is, and when that happened. */
export type SheetState = { kind: 'draft' | 'sent' | 'signed' | 'declined'; at: Date | null };

/**
 * The sheet's state from the request it shows: signed once there is a
 * signature, declined when they said no, sent when it went out, and a draft
 * when nothing has been sent.
 */
export function sheetStateOf(
  request:
    | {
        sentAt: Date | null;
        status: string;
        respondedAt: Date | null;
        signatures: { signedAt: Date }[];
      }
    | null
    | undefined,
): SheetState {
  if (!request) return { kind: 'draft', at: null };
  const signature = request.signatures[0];
  if (signature) return { kind: 'signed', at: signature.signedAt };
  if (request.status === 'declined') return { kind: 'declined', at: request.respondedAt };
  return { kind: 'sent', at: request.sentAt };
}

/**
 * A proposal or agreement as a document: a cover, the text, the terms it
 * comes with, and where it was signed. The client's copy, the link shared by
 * hand and the staff print view all render this same sheet, so a printed
 * agreement is exactly what was signed. Nothing internal appears on it.
 */
export function ContractSheet({
  org,
  kind,
  title,
  reference,
  client,
  projectName,
  summary = null,
  sentAt,
  bodyMarkdown,
  terms,
  signature,
  state,
  proof,
}: {
  org: Org;
  kind: string;
  title: string;
  reference: string;
  client: { name: string; legalName: string | null };
  projectName: string;
  /** One sentence on the work, from the project, under the title. */
  summary?: string | null;
  sentAt: Date | null;
  bodyMarkdown: string;
  terms: { title: string; bodyMarkdown: string } | null;
  signature: { signerName: string; initials: string | null; signedAt: Date } | null;
  /** Draft, sent, signed or declined, so a printed copy says which it is. */
  state: SheetState;
  /**
   * What ties the paper to the record: the version sent, its fingerprint
   * (already shortened by the caller, so this sheet never imports the
   * server-only documents module) and the terms version. Null for a draft.
   */
  proof: { version: number; fingerprint: string; termsVersion: number | null } | null;
}) {
  const clientName = client.legalName ?? client.name;
  const [firstLine, secondLine] = titleLines(title, clientName);
  const website = org.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? 'ubunifutech.com';

  return (
    <article className={doc.doc}>
      {/* Paper only: page size, margins, and the footer on every page but the
          cover. Written here rather than in a stylesheet so it applies only
          while a document is on the page, never to a receipt printed later.
          The other margin boxes are written empty, because Chrome fills an
          empty one with its own date, tab title and address. */}
      <style>{`@page { size: A4; margin: 18mm 16mm 22mm;
  @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-center { content: ""; }
  @bottom-left { content: ${cssString(`${title} · ${org.legalName}`)}; font-family: Inter, system-ui, sans-serif; font-size: 8pt; color: #6d6975; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: Inter, system-ui, sans-serif; font-size: 8pt; color: #6d6975; } }
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }`}</style>

      <section className={doc.cover}>
        <BrandLockup className={doc.lockup} />

        <div className={doc.coverMain}>
          <p className={doc.eyebrow}>
            {kind}
            {state.kind === 'draft' ? ' · Draft' : state.kind === 'declined' ? ' · Declined' : ''}
          </p>
          <h1 className={doc.coverTitle}>
            {firstLine}
            <span className={doc.coverAccent}>{secondLine}</span>
          </h1>
          {summary && <p className={doc.coverLead}>{summary}</p>}
        </div>

        <dl className={doc.facts}>
          <div className={doc.fact}>
            <dt>Prepared for</dt>
            <dd>{clientName}</dd>
          </div>
          <div className={doc.fact}>
            <dt>Prepared by</dt>
            <dd>{org.legalName}</dd>
          </div>
          <div className={doc.fact}>
            <dt>Project</dt>
            <dd>{projectName}</dd>
          </div>
          <div className={doc.fact}>
            <dt>Reference</dt>
            <dd>{reference}</dd>
          </div>
          <div className={doc.fact}>
            <dt>Date</dt>
            <dd>{sentAt ? formatDate(sentAt) : 'Not sent yet'}</dd>
          </div>
          <div className={doc.fact}>
            <dt>Website</dt>
            <dd>{website}</dd>
          </div>
        </dl>

        <svg className={doc.watermark} viewBox="0 0 64 64" aria-hidden="true">
          <g opacity="0.2" fill="none" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round">
            <path d="M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5" stroke="#FF6B2C" />
            <path d="M43 13v23c0 11 6 18 14 18" stroke="#6D3FE8" />
            <path d="M29 16 57 10" stroke="#6D3FE8" />
          </g>
        </svg>
      </section>

      <div className={doc.content}>
        <div
          className={doc.body}
          // Escaped first; only headings, paragraphs, lists, tables and emphasis
          // are reintroduced by the renderer.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMarkdown) }}
        />

        <section className={doc.signatures}>
          <div className={doc.signBox}>
            <p className={doc.signLabel}>For {clientName}</p>
            {signature ? (
              <p className={doc.signValue}>
                Signed by {signature.signerName}
                {signature.initials ? ` (${signature.initials})` : ''}
                <span className={doc.signWhen}>{formatDate(signature.signedAt)}</span>
              </p>
            ) : state.kind === 'declined' ? (
              <p className={doc.signValue}>
                Declined
                {state.at && <span className={doc.signWhen}>{formatDate(state.at)}</span>}
              </p>
            ) : (
              <p className={doc.signPending}>Not signed yet</p>
            )}
          </div>
          <div className={`${doc.signBox} ${doc.signBoxOurs}`}>
            <p className={doc.signLabel}>For {org.legalName}</p>
            <p className={doc.signValue}>
              Issued
              <span className={doc.signWhen}>{sentAt ? formatDate(sentAt) : 'When sent'}</span>
            </p>
          </div>
        </section>

        {signature && (
          <p className={doc.signedNote}>
            Signed electronically
            {terms
              ? `, together with the ${terms.title}${
                  proof?.termsVersion ? `, version ${proof.termsVersion},` : ''
                } that follow`
              : ''}
            .
          </p>
        )}
        {/* Outside .body, so the text a signature's fingerprint is taken
            over is untouched. */}
        {proof && (
          <p className={doc.proof}>
            Version {proof.version} · Fingerprint {proof.fingerprint}
            {terms && proof.termsVersion ? ` · ${terms.title}, version ${proof.termsVersion}` : ''}
          </p>
        )}

        <footer className={doc.closing}>
          <div>
            <BrandLockup className={doc.closingLockup} />
            <p className={doc.closingText}>
              Building software and web platforms for how organisations in Tanzania work.
            </p>
          </div>
          <p className={doc.closingContact}>
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
      </div>

      {terms && (
        <section className={doc.terms}>
          <p className={doc.eyebrow}>Accepted with this {kind.toLowerCase()}</p>
          <h2 className={doc.termsTitle}>{terms.title}</h2>
          <div
            className={`${doc.body} ${doc.ownNumbers}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(terms.bodyMarkdown) }}
          />
        </section>
      )}
    </article>
  );
}
