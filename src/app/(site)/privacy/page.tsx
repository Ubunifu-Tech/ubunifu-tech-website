import { PageHeader } from '@/components/PageHeader';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { pageMetadata } from '@/lib/metadata';
import { privacy } from '@/content/privacy';
import styles from './Privacy.module.css';

export const metadata = pageMetadata({
  title: 'Privacy',
  description:
    'What Ubunifu Technologies collects through the contact form, the website chat, careers enquiries and the client portal, who handles it and how long we keep it.',
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
          title="How we handle your information"
          lead="This notice covers the contact form, the website chat, careers enquiries and the client portal."
        />

        <article className={`container ${styles.article}`}>
          <p className={styles.updated}>Last updated {privacy.updated}</p>

          <h2>The contact form</h2>
          <p>
            The contact form asks for your name, email address, enquiry type and
            message. We use them to read your enquiry, pass it to the right person
            and reply to you.
          </p>
          <p>
            Please do not send us passwords, identity documents, payment or banking
            details, health information or other sensitive personal information.
          </p>

          <h2>The website chat</h2>
          <p>
            The chat is an AI assistant, not a person. It answers from what this
            website says. To produce a reply, we send what you type and the page
            you are on to Anthropic, the company that provides the AI model.
          </p>
          <p>
            We save the conversation in our database. It is still there if you
            reload the page, and the team can read it if you ask to be put in
            touch.
          </p>
          <p>
            If you ask to be put in touch, the chat passes your message to the team
            with the name and email address you give. A person at Ubunifu reads
            it, and it becomes an enquiry that we handle like a contact form
            message.
          </p>

          <h2>Cookies</h2>
          <p>
            The chat sets one cookie, ubu_visitor. It holds only a random
            identifier, which lets the chat find your conversation again. It
            expires 30 days after your last message.
          </p>
          <p>
            Signing in to the client portal sets a cookie that keeps you signed in.
            This website does not use advertising or analytics cookies, and we do
            not build advertising profiles.
          </p>

          <h2>Spam and abuse checks</h2>
          <p>
            When you send the contact form, or the chat passes a message to the
            team, we record the network address the enquiry came from. The chat
            also saves your network address and browser details.
          </p>
          <p>
            To limit spam and abuse, we count recent attempts from each network
            address, email address and chat. We store these counts under a
            scrambled key instead of the address itself. The server may also keep
            a temporary count in memory that is never saved.
          </p>

          <h2>How long we keep it</h2>
          <p>
            A chat that is not passed to the team is deleted 90 days after its last
            message.
          </p>
          <p>
            A chat that becomes an enquiry is kept with that enquiry. The network
            address and browser details saved with the chat are removed 90 days
            after the chat started.
          </p>
          <p>Spam and abuse counts are cleared after about two days.</p>
          <p>
            Otherwise, we keep enquiries and chat conversations only as long as we
            reasonably need them to reply, manage a business relationship, keep
            necessary records, prevent abuse or meet legal obligations.
          </p>

          <h2>Who handles it for us</h2>
          <p>
            The website runs on Vercel. Our database, where form messages and chat
            conversations are stored, runs on Railway. Anthropic provides the AI
            model behind the website chat and the portal’s Help chat.
          </p>
          <p>
            New enquiries, from the form or the chat, are normally emailed to our
            business inbox, and we usually send you a short confirmation. Both
            emails go through Resend, our email delivery provider.
          </p>
          <p>We do not sell contact, chat or careers enquiry information.</p>

          <h2>The client portal</h2>
          <p>
            If we invite you to the client portal, we keep your name, email address
            and organisation, and your role and phone number if we have them. Your
            password is stored only in a scrambled form that cannot be read back.
          </p>
          <p>
            We record when you sign in and what you do in the portal, such as
            signing a document or uploading a file, along with your network address
            and browser details. When you sign a document, we also keep your name,
            what you typed or drew, the time, and a fingerprint of the document you
            signed. Files you upload are stored with Vercel.
          </p>
          <p>
            The portal’s Help chat works like the website chat. To produce a reply,
            it sends Anthropic what you type and the account details it needs, such
            as your projects, documents, invoices and requests. The conversation is
            kept with your account.
          </p>

          <h2>Careers enquiries</h2>
          <p>
            If you email us from the careers page, your message and any links or
            attachments you include come to our business inbox.
          </p>
          <p>
            A general introduction is not a job application. We read it, reply
            where appropriate and check whether it fits an open role. Sending one
            does not guarantee a reply, an interview or that we will keep you in
            mind later. A vacancy we publish may have its own privacy information.
          </p>

          <h2>Other websites</h2>
          <p>
            Ubunifu products and other websites we link to have their own privacy
            practices. This notice covers only ubunifutech.com.
          </p>

          <h2>Asking about your information</h2>
          <p>
            To find out what we hold from your enquiry or chat, ask us to correct
            or delete it where appropriate, or raise a privacy concern, email{' '}
            <a href="mailto:info@ubunifutech.com">info@ubunifutech.com</a>.
          </p>
        </article>
      </main>
    </>
  );
}
