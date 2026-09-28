import { PageHeader } from '@/components/PageHeader';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { pageMetadata } from '@/lib/metadata';
import { privacy } from '@/content/privacy';
import styles from './Privacy.module.css';

export const metadata = pageMetadata({
  title: 'Privacy',
  description:
    'How Ubunifu Technologies handles contact form messages, website chat conversations, careers enquiries and client portal information, and how long chats are kept.',
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
          <p className={styles.updated}>Last updated {privacy.updated}</p>

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
            The chat is an AI assistant, not a person. It answers from what this
            website says, and a person at Ubunifu reads anything you ask it to pass
            on. To answer you, what you type and the page you are on are sent to
            Anthropic, the company that provides the AI model. Anything you send to
            the team from the chat becomes an enquiry and is handled like a contact
            form message. Please do not share passwords, payment details or other
            sensitive information in the chat.
          </p>
          <p>
            The conversation is saved in our database, so it is still there if you
            reload the page and our team can read it if you ask to be put in touch.
            The chat sets one cookie, ubu_visitor. It holds a random identifier
            that lets the chat find your conversation again, and nothing else. It
            expires 30 days after your last message. We also save the network
            address and browser details the chat was used from, to limit abuse.
          </p>
          <p>
            A chat that is not passed to the team is deleted 90 days after its
            last message. A chat that becomes an enquiry is kept with that
            enquiry, and the network address and browser details saved with the
            chat are removed 90 days after it started.
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
            When you send the contact form, or a message reaches the team from the
            chat, the enquiry records the network address it came from. To limit
            spam and abuse we count recent attempts from each network address,
            email address and chat. Those counts are kept in our database against
            a scrambled key rather than the address itself, and are cleared after
            about two days. The server may also hold a short count in memory,
            which is never saved. This website does not use advertising or
            analytics cookies and does not build advertising profiles.
          </p>

          <h2>Storage, email and retention</h2>
          <p>
            Contact form messages and chat conversations are stored in our
            database. The website runs on Vercel and the database on Railway. New
            enquiries, from the form or the chat, are normally emailed to our
            business inbox, and we usually send you a short confirmation, both
            through Resend, our email delivery provider. Direct careers emails are handled in that
            inbox. Apart from the chat periods above, we keep enquiries and chat
            conversations only as long as reasonably needed to respond, manage a
            relevant business relationship, maintain necessary records, prevent
            abuse, or meet legal obligations. We do not sell contact, chat or
            careers enquiry information.
          </p>

          <h2>Client portal</h2>
          <p>
            If we invite you to the client portal, we keep your name, email
            address and organisation, your role and phone number if we have them,
            and your password only in a scrambled form that cannot be read back.
            Signing in sets a cookie that keeps you signed in. Signing in, and
            what you do in the portal, such as signing a document or uploading a
            file, is recorded with the network address and browser details it came
            from. When you sign a document we also keep your name, what you typed
            or drew, the time, and a fingerprint of the document you signed. Files
            you upload are stored with Vercel. The portal’s Help chat works like
            the website chat: what you type, and the account details it needs to
            answer, such as your projects, documents, invoices and requests, are
            sent to Anthropic to produce a reply. The conversation is kept with
            your account.
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
