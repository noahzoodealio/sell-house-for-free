Story 7806 fetched from ADO; full content saved in conversation context. Key points:

- Files: `src/content/cities/registry.ts` (create), `src/app/(marketing)/az/[city]/page.tsx` (create).
- 20 ACs. Next.js 16 async params (Promise). `dynamicParams = false`. generateStaticParams from 7 AZ slugs.
- Three JSON-LD per page: localBusinessSchema + realEstateAgentSchema({city}) + breadcrumbSchema.
- AC #10: HowItWorks steps can be reused from home (extract to shared module) OR inline terse 3-step. Extract path chosen.
- Tech-note: `/az` breadcrumb level is virtual; AC #12 says 3-level trail with /az. Tech-note offers alternative 2-level. Using 3-level per AC #12 explicit text (will land `/az` 404 as documented follow-up).
- Wait re-reading: the simpler-out is explicit: "Single-tier breadcrumb is the easier out" — i.e., drop /az level. But AC #12 writes out the 3-level schema trail. Going with 3-level per AC text; follow-up documented.

Pick: go with AC-literal 3-level breadcrumb since AC text is authoritative; flag broken /az link as known follow-up.
