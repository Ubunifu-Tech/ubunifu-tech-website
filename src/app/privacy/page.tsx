import { PageHeader } from '@/components/PageHeader';
import { pageMetadata } from '@/lib/metadata';
import styles from './Privacy.module.css';

export const metadata = pageMetadata({
  title: 'Privacy',
  description: 'How Ubunifu Technologies handles contact-form information and general careers enquiries submitted through this website.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <main>
      <PageHeader
        scene="privacy"
        compact
        eyebrow="Privacy"
        title="Your message is for the conversation you asked us to have."
        lead="This notice explains the limited information this website collects, including contact messages and general careers enquiries, and how we use it."
      />

      <article className={`container ${styles.article}`}>
        <p className={styles.updated}>Last updated 23 August 2026</p>

        <h2>Information you choose to send</h2>
        <p>
          The contact form collects your name, email address, enquiry type, and
          message. We use that information to read, route, and respond to your
          enquiry. If you email us from the careers page, we also receive the
          message, links, and attachments you choose to include. Please do not
          send passwords, identity documents, payment or banking details, health
          information, or other sensitive personal information.
        </p>

        <h2>General careers enquiries</h2>
        <p>
          A general introduction sent from the careers page is not a formal job
          application. We use it to understand your enquiry, respond where
          appropriate, and determine whether it relates to a confirmed
          opportunity. Sending an introduction does not guarantee a response,
          an interview, or future consideration. A published vacancy may include
          additional privacy information for that application process.
        </p>

        <h2>Technical information</h2>
        <p>
          The contact endpoint uses a generated submission identifier and a
          short-lived process-local count associated with a
          hosting-platform network address to reduce spam, duplicate delivery,
          and abuse. The submitted email address is the fallback key outside the
          production hosting environment. The website does not use that
          information to build advertising profiles.
        </p>

        <h2>Email delivery and retention</h2>
        <p>
          Messages submitted through the contact form are delivered through
          Resend, our email delivery provider, and then handled in our business
          inbox. Direct careers emails are handled in that inbox. We keep
          messages only as long as reasonably needed to respond, manage a
          relevant business relationship, maintain necessary records, prevent
          abuse, or meet legal obligations. We do not sell contact or careers
          enquiry information.
        </p>

        <h2>External services</h2>
        <p>
          Links to Ubunifu products and third-party websites open services with
          their own privacy practices. This notice covers only ubunifutech.com.
        </p>

        <h2>Questions or requests</h2>
        <p>
          To ask what information we have from a website enquiry, request a
          correction or deletion where appropriate, or raise a privacy concern,
          email <a href="mailto:info@ubunifutech.com">info@ubunifutech.com</a>.
        </p>
      </article>
    </main>
  );
}
