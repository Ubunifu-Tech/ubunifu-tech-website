---
title: "What We’re Learning Building Software in Tanzania"
date: "2026-01-06"
author: "Ubunifu Technologies"
excerpt: "Lessons from building Insight and Sifa in Arusha: start with real workflows, make local context structural, and be precise about what the product can do."
tags: ["Company", "Product", "Tanzania"]
coverImage: "/editorial/software-tanzania-learning.webp"
coverAlt: "Tactile paper workbench where blank research cards, modular pieces, and revision loops lead to one assembled outcome"
---

Building software in Tanzania does not produce one neat rulebook. It does change which questions deserve to come first.

At Ubunifu Technologies, we build from Arusha. Our two live products are Insight, a document AI workspace, and Sifa, business software for shops, restaurants, and distributors. They solve different problems, but the work has pushed us toward the same discipline: define the real workflow before choosing the feature set.

These are working lessons, not claims about every business in Tanzania or across Africa. A retail counter, a school, a tour operator, and a law office do not share one universal “local context.” Useful software starts by getting more specific.

## Start with the workflow, not the category

“Build software for small businesses” is too broad to guide a product decision. A better starting point is a task someone must complete and the information that task depends on.

For Sifa, one such task is reviewing money owed by customers after goods have been sold on credit. That is why the product includes a credit ledger and aging buckets alongside sales, stock, suppliers, and customer records. Credit is part of the operating model, not a note added after the sale.

For Insight, the starting tasks include asking questions about documents, extracting structured information from PDFs, and generating documents from templates. The product also includes specialised agents, including an Education Tutor that teaches in Swahili, and Tanzania-localised templates such as a tax invoice.

The lesson is simple: a market label is not a product specification. A concrete workflow is.

## Local context has to change the product

Localisation is often treated as a final layer: change the currency symbol, translate a menu, and ship. That can make a product look familiar without making it fit the work.

In Sifa, Tanzanian shillings are native to the records, and selling on credit is represented directly in the product. In Insight, Swahili is part of an agent’s teaching interaction rather than only a language option in the navigation. Those choices affect data, interface hierarchy, examples, and testing.

This is a useful test for any “built for here” claim: if removing the local context would leave the product unchanged, the claim is probably doing more work than the design.

## Pricing is part of product design

Insight uses pay-as-you-go credits. That model suits document work that may arrive in batches rather than at a perfectly steady rate. It also gives a team a way to begin without first choosing a recurring plan.

Usage-based pricing is not automatically more affordable, and it is not right for every product. A subscription can be easier to budget when usage is regular. A usage model needs clear units and visible costs so customers can estimate what a task will require. The broader lesson is to choose pricing around the way the product is used, then explain the trade-off plainly.

## Products and client work sharpen each other

Our client platforms force us to study a specific operation in depth. Our own products force us to maintain a shared system over time. Both kinds of work reward the same habits: listen before scoping, make important states visible, plan for support, and separate a demonstrated outcome from an assumption.

That last distinction matters in our writing too. We can describe the features we have shipped. We should not invent adoption figures, time savings, or revenue impact before we have measured them. “Live and usable” is a meaningful milestone, but it is not the same as a verified business result.

## What we are still learning

The next questions are operational. Which workflows are used most often? Where do people stop or ask for help? Which parts need to work better on lower-cost devices or inconsistent connections? What does a team need before it will trust a new system with important records?

Those answers come from use, support, and careful measurement. They cannot be supplied by a slogan about innovation or by assuming that one Tanzanian customer represents a whole region.

Building from Tanzania gives us a clear vantage point. The responsibility is to stay close to the work, state what we know, and keep revising the product when the evidence changes.
