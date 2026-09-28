// How our products work, for the website assistant. One guide per product,
// keyed by the product's id in products.tsx; the assistant's PRODUCT GUIDES
// section renders every guide here, so adding help for a product is adding an
// entry, with no change to the assistant's instructions.
//
// THE RULES FOR A GUIDE
//   - It says only what the product does today. Nothing planned, nothing that
//     depends on a customer's plan or account.
//   - Every fact and answer is checked with the person who runs the product
//     before it lands here, and `updated` moves when it is.
//   - Nothing about prices beyond what the product's own site shows.
//   - A product with no guide gets no entry. The assistant then knows only what
//     products.tsx says about it, and says so.
//
// The first guides hold public facts only, taken from products.tsx and the
// journal (_posts: why-pay-as-you-go-pricing, why-our-ai-answers-in-swahili,
// software-that-understands-credit). Fuller guides come from each product's own
// documentation.
//
// When the guides together pass about 15k tokens, or questions need answers
// about a particular account, the next step is not a longer guide. It is either
// a read-only lookup tool over these guides for the website assistant (still
// with no account access), or an in-product help chat: a new ConversationKind
// that reuses runTurn, ChatMarkdown and the Assistant window, with that
// product's guide as its knowledge and its own support tool.

import type { ProductId } from './products';
import { site } from './site';

export type ProductGuide = {
  product: ProductId;
  /** When the guide was last checked with whoever runs the product, as YYYY-MM-DD. */
  updated: string;
  facts: string[];
  faqs: { question: string; answer: string }[];
  /** Where someone with an account problem gets help. */
  support: string;
};

export const productGuides: Partial<Record<ProductId, ProductGuide>> = {
  insight: {
    product: 'insight',
    updated: '2026-09-28',
    facts: [
      'Insight works with your own documents, such as contracts, reports, lesson plans or tax invoices. You upload them and then ask questions about them, and answers come with references to the source.',
      'It extracts structured data from PDFs.',
      'It generates new documents from your own templates, and includes templates localised for Tanzania.',
      'It runs several specialised AI agents. One is the Education Tutor, which teaches in Swahili: a learner can ask in Swahili and get the explanation in Swahili, without rewriting the question in English first.',
      'The Tutor explains and guides rather than handing over the fastest answer. Its answers can still be incomplete or wrong, so learners should check important explanations against their course materials and their teachers.',
      'Insight is paid for with pay-as-you-go credits: you pay for what you do in the product rather than for a seat on a plan.',
    ],
    faqs: [
      {
        question: 'Does Insight work in Swahili?',
        answer:
          'Yes. Its Education Tutor teaches in Swahili, so a learner can ask and get explanations in Swahili.',
      },
      {
        question: 'Why does Insight use credits instead of a subscription?',
        answer:
          'Document work tends to arrive in batches, so paying for usage fits it better than a monthly seat. It also lets someone try a task without committing to months of a plan. For occasional use credits usually cost less; for heavy, steady use they can cost more.',
      },
      {
        question: 'How much do Insight credits cost?',
        answer:
          'For what credits cost, check the Insight site at https://insight.ubunifutech.com, or ask the team.',
      },
    ],
    support: `The team, by passing the question on from this chat or by email to ${site.contact.email}. Nobody in this chat can see Insight accounts.`,
  },
  sifa: {
    product: 'sifa',
    updated: '2026-09-28',
    facts: [
      'Sifa is for running a shop, restaurant or distributor: sales, stock, suppliers, customers and unpaid balances in one place.',
      'Sales and point of sale (POS).',
      'Inventory with low-stock alerts.',
      'Customer credit (deni): a sale on credit stays open against the customer until it is paid. An ageing view shows the total outstanding and groups balances by how long they have been open, so an owner can see which to follow up first.',
      'Supplier and customer records.',
      'Records are kept in Tanzanian shillings (TZS).',
    ],
    faqs: [
      {
        question: 'Can Sifa track customers who pay later?',
        answer:
          'Yes. A credit sale is recorded against the customer and stays visible until it is paid, and the ageing view groups what is owed by how long it has been open.',
      },
      {
        question: 'What currency does Sifa use?',
        answer: 'Records are kept in Tanzanian shillings.',
      },
    ],
    support: `The team, by passing the question on from this chat or by email to ${site.contact.email}. Nobody in this chat can see Sifa accounts.`,
  },
};
