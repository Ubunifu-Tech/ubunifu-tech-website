---
title: "Designing Sifa Around Deni: Credit as a Core Workflow"
date: "2026-05-26"
author: "Ubunifu Technologies"
excerpt: "Why Sifa treats customer credit as part of the sale, with a TZS-native ledger and aging view instead of an accounting afterthought."
tags: ["Product", "Sifa", "Tanzania"]
coverImage: "/editorial/credit-ledger.webp"
coverAlt: "Open paper ledger beside linked trays and counters on a shop worktop with stocked shelves in the background"
---

In many retail relationships, a sale does not end when goods leave the counter. A known customer may pay later, in full or in parts. The resulting *deni*, money owed, has to remain visible until it is settled.

The exact practice varies by business. Some shops do not sell on credit at all. Others make careful decisions based on the customer, the amount, and the relationship. We should not turn that variety into a claim about every Tanzanian retailer.

It is still a clear software-design problem. If a business does extend credit, a system that records only completed cash sales leaves an important part of the operation somewhere else.

## Credit changes the state of a sale

A cash sale can usually be recorded as paid and complete. A credit sale remains open. The business needs to know that money is outstanding, which customer record it belongs to, and how long it has remained unresolved.

That is why credit cannot be treated only as a note field or an end-of-month accounting adjustment. It creates a state that affects customer records, cash expectations, and follow-up.

In Ubunifu Sifa, credit management sits alongside sales, inventory, suppliers, and customers. Records are native to Tanzanian shillings. The product’s intelligence view includes total outstanding credit and aging buckets, giving the owner a way to review balances by how long they have been open.

## What an aging view does, and does not do

Aging groups outstanding balances into time bands. A recent balance and an older balance may have the same amount, but they do not present the same follow-up question. Grouping them helps a business see where attention may be needed first.

An aging bucket is not a prediction that a customer will fail to pay. It does not know the history of the relationship, an agreed payment date, or the reason for a delay unless that context has been recorded. It is a review tool, not a verdict.

That distinction matters. Software should make the state of the ledger clearer without pretending to replace the owner’s judgement.

## Visibility is more useful than a decorative dashboard

The point of putting credit on a dashboard is not to add another large number. A useful summary should lead back to records that can be checked and acted on.

For a business reviewing its position, the practical questions are straightforward:

- How much customer credit is currently outstanding?
- How is that amount distributed across newer and older balances?
- Which customer records need to be reviewed?
- Has a payment or correction been entered consistently?

Those questions shaped the feature. They are more useful than a generic “financial health” score whose meaning the user cannot inspect.

## The ledger is only as good as its records

Moving credit from a notebook into software does not make the information automatically correct. Staff still need a consistent process for entering sales and payments, correcting mistakes, and deciding who is authorised to see or change customer balances.

The paper ledger also should not be dismissed as evidence that a business is behind. It often contains a data model in practical form: a customer, an amount, a date, a payment, and a remaining balance. The design task is to understand what that record is doing, then improve retrieval and review without losing the business logic behind it.

Digitisation is helpful when it makes the record easier to find, reconcile, and understand. It is harmful when it adds steps without giving the business a clearer view.

## Local fit should be concrete

“Built for Tanzania” is a broad statement. In Sifa, we want that statement to be testable in the product: TZS-native records, sales and inventory workflows, and credit management that is visible rather than hidden in a workaround.

There is more to learn from real use, including how different businesses define their aging periods, handle partial payments, and divide responsibility among staff. We should validate those details rather than assume one shop’s process represents everyone.

The core decision is already clear. When selling on credit is part of the business, the software should represent it honestly. Deni is not an exception to hide at the edge of the system. It is an open obligation that deserves a proper place in the workflow.
