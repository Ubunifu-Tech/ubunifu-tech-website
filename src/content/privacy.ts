// The privacy notice's date, and a plain summary of what it says for the
// website assistant. The notice itself is src/app/(site)/privacy/page.tsx.
//
// CHANGE THEM TOGETHER. Any edit to the notice moves `updated` and brings the
// summary into line in the same commit, so the chat never describes an older
// notice than the one on the page. Every summary line must be something the
// page says; add nothing it does not.

import { site } from './site';

export const privacy = {
  /** As it reads on the page, after "Last updated". */
  updated: '23 October 2026',
  summary: [
    'The contact form asks for a name, email address, enquiry type and message. We use them to read the enquiry, pass it to the right person and reply.',
    'The chat is an AI assistant, not a person. It answers from what the website says. To produce a reply, we send what someone types and the page they are on to Anthropic, the company that provides the AI model.',
    'We save chat conversations in our database, so a conversation is still there after a page reload and the team can read it if someone asks to be put in touch. If they ask, the chat passes their message to the team with the name and email address they give. A person at Ubunifu reads it, and it becomes an enquiry handled like a contact form message.',
    'The chat sets one cookie, ubu_visitor. It holds only a random identifier, which lets the chat find the conversation again, and it expires 30 days after the last message. Signing in to the client portal sets a cookie that keeps someone signed in. The website does not use advertising or analytics cookies, and we do not build advertising profiles.',
    'We record the network address an enquiry came from, and the chat saves the network address and browser details. To limit spam and abuse, we count recent attempts under a scrambled key instead of the address itself.',
    'A chat that is not passed to the team is deleted 90 days after its last message. A chat that becomes an enquiry is kept with that enquiry, and the network address and browser details saved with it are removed 90 days after the chat started. Spam and abuse counts are cleared after about two days.',
    'Otherwise, we keep enquiries and chats only as long as we reasonably need them to reply, manage a business relationship, keep necessary records, prevent abuse or meet legal obligations.',
    'The website runs on Vercel and the database on Railway. Enquiry emails and confirmations go through Resend. Anthropic provides the AI model behind the website chat and the portal Help chat. We do not sell contact, chat or careers enquiry information.',
    'In the client portal we keep an invited contact\'s name, email address and organisation, their role and phone number if we have them, and their password only in a scrambled form. We record signing in and what they do there, such as signing a document or uploading a file, along with the network address and browser details. Uploaded files are stored with Vercel. To produce a reply, the portal Help chat sends Anthropic what they type and the account details it needs, and the conversation is kept with their account.',
    'Please do not send passwords, identity documents, payment or banking details, health information or other sensitive personal information.',
    `To find out what we hold from an enquiry or chat, ask for a correction or deletion, or raise a privacy concern, email ${site.contact.email}.`,
  ] as ReadonlyArray<string>,
};
