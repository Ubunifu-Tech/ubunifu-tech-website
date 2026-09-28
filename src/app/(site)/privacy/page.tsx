import { PageHeader } from '@/components/PageHeader';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { pageMetadata } from '@/lib/metadata';
import styles from './Privacy.module.css';

export const metadata = pageMetadata({
  title: 'Privacy',
  description:
    'How Ubunifu Technologies handles contact form messages, website chat conversations and careers enquiries sent through this website.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <PageHeader
          scene="privacy"
          eyebrow="Privacy"
          title="Your message is for the conversation you asked us to have."
          lead="This notice explains what this website collects when you write to us or use the chat, and how we use it."
        />

        <article className={`container ${styles.article}`}>
          <p className={styles.updated}>Last updated 28 September 2026</p>

          <h2>Information you choose to send</h2>
          <p>
            The contact form collects your name, email address, enquiry type, and
            message. We use that information to read, route, and respond to your
            enquiry. If you use the chat, we receive what you type there, and the
            name and email address you give if you ask us to get in touch. If you
            email us from the careers page, we also receive the message, links, and
            attachments you choose to include. Please do not send passwords,
            identity documents, payment or banking details, health information, or
            other sensitive personal information.
          </p>

          <h2>Website chat</h2>
          <p>
            The chat is an AI assistant, not a person. To answer you, what you
            type and the page you are on are sent to Anthropic, the company that
            provides the AI model. The conversation is saved in our database so it
            is still there if you reload the page, and so our team can read it if
            you ask to be put in touch. Anything you send to the team from the chat
            becomes an enquiry and is handled like a contact form message.
          </p>
          <p>
            The chat sets one cookie, ubu_visitor. It holds a random identifier
            that lets the chat find your conversation again, and nothing else. It
            expires 30 days after your last message. We also save the network
            address and browser details the chat was used from, to limit abuse.
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
            When you send the contact form or use the chat, we record the network
            address it came from alongside your message. To limit spam and abuse
            we count recent attempts from each network address and email address.
            The counts we store are one-way hashes rather than the addresses
            themselves, and are deleted after about two days; the server may also
            hold a short count in memory, which is never saved. This website does
            not use advertising or analytics cookies and does not build
            advertising profiles.
          </p>

          <h2>Storage, email and retention</h2>
          <p>
            Contact form messages and chat conversations are stored in our
            database. The website runs on Vercel and the database on Railway. New
            enquiries, from the form or the chat, are sent to our business inbox,
            and we usually send you a short confirmation, both through Resend, our
            email delivery provider. Direct careers emails are handled in that
            inbox. We keep enquiries and chat conversations only as long as
            reasonably needed to respond, manage a relevant business relationship,
            maintain necessary records, prevent abuse, or meet legal obligations.
            We do not sell contact, chat or careers enquiry information.
          </p>

          <h2>External services</h2>
          <p>
            Links to Ubunifu products and third-party websites open services with
            their own privacy practices. This notice covers only ubunifutech.com.
          </p>

          <h2>Questions or requests</h2>
          <p>
            To ask what information we have from a website enquiry or chat
            conversation, request a correction or deletion where appropriate, or
            raise a privacy concern, email <a href="mailto:info@ubunifutech.com">info@ubunifutech.com</a>.
          </p>
        </article>
      </main>
    </>
  );
}
