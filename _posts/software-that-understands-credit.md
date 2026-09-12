---
title: "Designing Sifa Around Deni: Credit as a Core Workflow"
date: "2026-07-27"
author: "Ubunifu Technologies"
excerpt: "Why Sifa treats customer credit as part of the sale, with a TZS-native ledger and aging view instead of an accounting afterthought."
tags: ["Product", "Sifa", "Tanzania"]
coverImage: "/editorial/credit-ledger.webp"
coverAlt: "Open paper ledger beside linked trays and counters on a shop worktop with stocked shelves in the background"
---

In plenty of retail relationships the sale carries on after the goods leave the counter. A known customer pays later, sometimes in parts. The *deni* — the money owed — has to stay visible until it is settled.

How that works varies enormously. Some shops refuse credit outright. Others weigh the customer, the amount, and the relationship every time.

Where a business does extend credit, software that records only completed cash sales leaves a real part of the operation somewhere else — usually a notebook.

## Credit changes the state of a sale

A cash sale closes. It can be recorded as paid and finished with. A credit sale stays open, and the business has to hold three things about it: that money is outstanding, whose record it belongs to, and how long it has been sitting there.

So credit needs somewhere better to live than a note field or a month-end adjustment. It creates a state, and that state reaches customer records, expected cash, and whoever has to follow it up.

In Sifa, credit management sits alongside sales, inventory, suppliers, and customers. Records are native to Tanzanian shillings. The intelligence view carries total outstanding credit and aging buckets, so an owner can review balances by how long they have been open.

## What an aging view does, and what it cannot

Aging sorts outstanding balances into time bands. Two balances of the same amount raise different questions when one is a week old and the other is four months old, and grouping them shows where to look first.

An aging bucket knows nothing about the relationship. It has no view on an agreed payment date, a good reason for a delay, or a customer's history, unless somebody recorded it. It is a place to start reviewing, and it is a long way short of a verdict on whether someone will pay.

## Putting credit on a dashboard

A number on a dashboard is only worth it if it leads somewhere. A summary should route back to records that can be opened, checked, and acted on.

The questions a business actually asks when reviewing its position are ordinary ones. How much is outstanding right now. How it splits between recent and old balances. Which customer records need attention. Whether a payment or correction went in properly.

Those shaped the feature, rather than a "financial health" score whose workings the user cannot inspect.

## The ledger is only as good as what goes into it

Moving credit out of a notebook and into software does not make it correct. Staff still need a consistent way to enter sales and payments, fix mistakes, and decide who may see or change a customer's balance.

The notebook deserves more respect than it usually gets, too. It normally contains a working data model: a customer, an amount, a date, a payment, a remaining balance. The job is to understand what that record already does, then make it easier to find and reconcile without throwing away the business logic inside it. Digitising helps when retrieval and review get easier. It hurts when it adds steps and returns nothing.

## Make "built for Tanzania" testable

"Built for Tanzania" is the kind of line anyone can write. In Sifa we want it checkable in the product: records native to TZS, sales and inventory workflows that match the counter, and credit that is visible instead of hidden in a workaround.

Real use will teach us the rest — how different businesses set their aging periods, how they handle partial payments, how responsibility gets divided between staff.

Deni is an open obligation. In Sifa it sits in the workflow rather than at the edge of the system.
