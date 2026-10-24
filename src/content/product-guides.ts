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
// The first guide holds public facts only, taken from products.tsx and the
// journal post _posts/software-that-understands-credit.md. Fuller guides come
// from each product's own documentation.
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
  sifa: {
    product: 'sifa',
    updated: '2026-09-28',
    facts: [
      'Sifa is for running a shop, restaurant or distributor: sales, stock, suppliers, customers and unpaid balances in one place.',
      'Sales and point of sale (POS).',
      'Inventory with low-stock alerts.',
      'Customer credit (deni): a sale on credit stays open against the customer until it is paid. An ageing view shows the total owed and groups balances by how long they have been unpaid, so an owner can see which to follow up first.',
      'Supplier and customer records.',
      'Records are kept in Tanzanian shillings (TZS).',
    ],
    faqs: [
      {
        question: 'Can Sifa track customers who pay later?',
        answer:
          'Yes. A credit sale is recorded against the customer and stays visible until it is paid. The ageing view groups what is owed by how long it has been unpaid.',
      },
      {
        question: 'What currency does Sifa use?',
        answer: 'Records are kept in Tanzanian shillings.',
      },
    ],
    support: `The team, by passing the question on from this chat or by email to ${site.contact.email}. Nobody in this chat can see Sifa accounts.`,
  },
};
