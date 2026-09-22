/**
 * Re-verifies every signature against the renderer as it stands now.
 *
 * Run after any change to src/lib/console/markdown.ts. A signature is a
 * SHA-256 of the rendered document, so a change in how documents render is a
 * change in what every existing signature verifies against — and this is the
 * only way to find out before a client does.
 */
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

process.loadEnvFile('.env');

// Imported dynamically for the same reason the round-trip check does: these
// are TypeScript ES modules loaded through tsx, and a static import of a
// .ts module from an .mts entry resolves before the loader is ready.
const { renderMarkdown } = await import('../src/lib/console/markdown');

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const signatures = await db.signature.findMany({
  select: {
    id: true,
    signerName: true,
    documentHash: true,
    request: {
      select: {
        documentHash: true,
        document: { select: { reference: true } },
        version: { select: { version: true, bodyMarkdown: true } },
      },
    },
  },
});

let broken = 0;

for (const signature of signatures) {
  const recomputed = createHash('sha256')
    .update(renderMarkdown(signature.request.version.bodyMarkdown), 'utf8')
    .digest('hex');

  const sealed = signature.request.documentHash;
  const signed = signature.documentHash;
  const ok = recomputed === sealed && recomputed === signed;
  if (!ok) broken += 1;

  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${signature.request.document.reference} v${signature.request.version.version} — ${signature.signerName}`,
  );
  if (!ok) {
    console.log(`       sealed at send: ${sealed}`);
    console.log(`       recorded at signing: ${signed}`);
    console.log(`       recomputed now: ${recomputed}`);
  }
}

await db.$disconnect();

if (signatures.length === 0) {
  console.log('No signatures on record yet — nothing to verify.');
} else if (broken > 0) {
  console.error(
    `\n${broken} of ${signatures.length} signatures no longer verify. The renderer has changed what a signed document produces.\n`,
  );
  process.exitCode = 1;
} else {
  console.log(`\nAll ${signatures.length} signatures still verify against the current renderer.`);
}
