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
  updated: '28 September 2026',
  summary: [
    'The contact form collects a name, email address, enquiry type and message, used to read, route and reply to the enquiry.',
    'The chat is an AI assistant, not a person. What someone types in it, and the page they are on, are sent to Anthropic, the company that provides the AI model, to produce a reply.',
    'Chat conversations are saved in our database, so a conversation is still there after a page reload and the team can read it if someone asks to be put in touch. Anything sent to the team from the chat becomes an enquiry and is handled like a contact form message.',
    'The chat sets one cookie, ubu_visitor, which holds a random identifier so the chat can find the conversation again, and nothing else. It expires 30 days after the last message. The network address and browser details the chat was used from are saved to limit abuse.',
    'The website does not use advertising or analytics cookies and does not build advertising profiles.',
    'Messages and chats are stored in our database. The website runs on Vercel and the database on Railway, and enquiry emails go through Resend.',
    'Enquiries and chats are kept only as long as reasonably needed to respond, manage a business relationship, keep necessary records, prevent abuse or meet legal obligations. We do not sell them.',
    'Please do not send passwords, identity documents, payment or banking details, health information or other sensitive information.',
    `To ask what we hold, request a correction or deletion, or raise a privacy concern, email ${site.contact.email}.`,
  ] as ReadonlyArray<string>,
};
