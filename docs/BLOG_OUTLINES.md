# Ubunifu Journal — Editorial Roadmap

The Journal supports both sides of Ubunifu: practical consulting lessons and the decisions behind the products. Published articles live in [`_posts/`](_posts/) and are the source of truth; this document is only a planning aid.

## Published topics

These subjects are already covered and should be extended only when there is a genuinely new angle or new evidence:

- **Building software in Tanzania and Africa** — [`building-software-for-africa.md`](_posts/building-software-for-africa.md)
- **Usage-based pricing for Insight** — [`why-pay-as-you-go-pricing.md`](_posts/why-pay-as-you-go-pricing.md)
- **Builder versus custom software decisions** — [`website-builder-or-custom-build.md`](_posts/website-builder-or-custom-build.md)
- **Safari King as a connected website and operations platform** — [`safari-king-website-operating-system.md`](_posts/safari-king-website-operating-system.md)
- **Professional tourism websites and enquiry design** — [`what-professional-means-tourism-website.md`](_posts/what-professional-means-tourism-website.md)
- **Swahili-language AI interaction design** — [`why-our-ai-answers-in-swahili.md`](_posts/why-our-ai-answers-in-swahili.md)
- **Credit-ledger workflows in Sifa** — [`software-that-understands-credit.md`](_posts/software-that-understands-credit.md)

## Optional future articles

### Lessons from building software in Tanzania

Focus on one or two observed lessons from real delivery or product work rather than making claims about every Tanzanian organisation.

Before drafting, confirm:

- the specific project or product decision behind each lesson;
- what changed because of local workflow, language, device, payment, or support constraints; and
- what remains an open question rather than a proven conclusion.

### Reviewable document extraction in Insight

Explain how structured extraction can support a real document workflow, with emphasis on review, traceability, and the limits of AI output.

Before drafting, verify the current product interface, supported document types, citation or review behavior, and any pricing details against the live product.

### Designing for variable connectivity

Discuss connectivity as a product-design constraint without describing Sifa or another product as offline-first unless current behavior has been tested and documented.

A publishable article needs verified detail about failure states, retry behavior, data persistence, and synchronization. If that evidence is unavailable, keep the article at the general design-principles level or defer it.

### A future client case study

Use a named project only with client approval and a verified account of the brief, delivered scope, and evidence. If measured outcomes are unavailable, describe what was built and what can be inspected; do not substitute estimated savings, conversion lift, traffic, rankings, or booking volume.

## Accuracy checklist

Before publication:

1. Check product behavior against the current live interface or tested build.
2. Check client functionality against the delivered system and obtain approval for sensitive details.
3. Separate shipped capability from measured outcome.
4. Do not imply customer counts, adoption, offline support, model-provider permanence, ratings, or sector expertise without evidence.
5. Keep consulting and products visible as equal parts of the Ubunifu story.
6. Add the finished article to `_posts/` with valid frontmatter and an editorial cover only after the factual review is complete.
