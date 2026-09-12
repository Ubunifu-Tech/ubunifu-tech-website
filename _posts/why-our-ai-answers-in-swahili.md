---
title: "Why We Built a Swahili-Language Tutor into Insight"
date: "2026-08-07"
author: "Ubunifu Technologies"
excerpt: "The product reasoning behind Insight’s Education Tutor: let a learner ask in Swahili, use familiar examples, and keep AI assistance within clear educational limits."
tags: ["Product", "AI", "Education", "Tanzania"]
coverImage: "/editorial/swahili-learning.webp"
coverAlt: "Top-down learning still life with a chapati divided into quarters, blank study cards, pencils, and an open notebook"
---

Ubunifu Insight includes an Education Tutor that teaches in Swahili. Language shapes how a learner asks a question, how they read the answer, and whether they feel able to say they did not follow it. In a learning conversation that makes it structural rather than cosmetic.

This is one product decision about one agent. A tutor's answer can be helpful and still be incomplete or wrong, and curriculum, teaching, connectivity, devices, and human support all sit outside the chat window.

Inside those limits, the language of the exchange is still worth designing properly.

## Translation is the easy layer

A translated menu helps somebody get around a product. It says nothing about whether the real interaction works in that language.

For a tutor the real interaction is the explanation. A learner should be able to put the question in Swahili, get the answer in Swahili, and keep going without rewriting the problem in English first. Follow-ups carry most of the weight, because understanding rarely lands on the first answer.

The harder questions follow from there. Some school terms are taught in more than one language. Mathematical notation has to survive a change of language unchanged. And a translation can be technically correct while sounding wrong, or pitched at the wrong level for the learner.

Those are problems of interaction and evaluation. Interface localisation does not reach them.

## Familiar examples cut unnecessary decoding

One demonstration in the Tutor explains fractions using a chapati cut into equal parts. The maths is unremarkable — one whole into four equal pieces gives four quarters. The point is that the learner spends their attention on the fraction instead of on an unfamiliar object.

Local context can slide into decoration, or worse, stereotype. Not every explanation needs a Tanzanian object in it, and no single example stands in for every learner. The example earns its place when it makes the concept more concrete, and fails when it pulls attention away from it.

So the example gets picked for instructional clarity, and the subject matter and the language get checked separately.

## A specialised agent creates a clearer contract

Insight runs several specialised agents. Giving education its own Tutor defines what a good response looks like: explanation and guided understanding, rather than the fastest possible answer.

A defined role also makes evaluation concrete. We can ask whether a response:

- addresses the question the learner actually asked;
- uses Swahili the learner's level can carry;
- keeps notation and subject facts correct;
- shows the reasoning instead of stating a result;
- chooses an example that supports the concept; and
- says when it is uncertain rather than inventing a fact.

## Where the authority sits

Fluency makes a wrong answer sound more credible. In a tutor that is the central risk, and it deserves more than a line of small print.

Learners need to be able to check important explanations against their course materials and their teachers. Educators need a way to see how the tool handles curriculum topics, ambiguous questions, and age-appropriate language. Product teams need test sets written and marked by people who know both the subject and the Swahili in use.

A good answer on fractions shows that one interaction works. Accuracy across mathematics, science, history, and every level of the curriculum is a separate question, and repeated evaluation is the only thing that answers it.

## Why this belongs in Insight

Insight already works with documents, structured extraction, templates, and specialised agents. The Tutor is another form of document-grounded work: helping a learner get into educational material in a language they can use directly.

Tanzanian classrooms and workplaces are multilingual, and people switch language depending on the task. The Tutor exists because English had become the default without anyone examining it.
