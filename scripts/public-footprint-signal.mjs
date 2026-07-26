import { readFile } from 'node:fs/promises';

import { assertEligibleSignal, createFootprintCandidate, sendFootprint } from './lib/public-footprint.mjs';

const [payloadPath, ...flags] = process.argv.slice(2);
const rawPayload = payloadPath
  ? await readFile(payloadPath, 'utf8')
  : process.env.PUBLIC_FOOTPRINT_PAYLOAD;
if (!rawPayload) throw new Error('Provide a JSON payload path or PUBLIC_FOOTPRINT_PAYLOAD');

const payload = JSON.parse(rawPayload);
const source = payload.source_module;
assertEligibleSignal(source, process.env);
const candidate = createFootprintCandidate(source, payload);

if (flags.includes('--dry-run')) {
  console.log(JSON.stringify(candidate, null, 2));
} else {
  const result = await sendFootprint(candidate, {
    apiBase: process.env.FEED_API_URL,
    token: process.env.FOOTPRINT_INGEST_TOKEN,
    allowLocalhost: process.env.ALLOW_LOCAL_FOOTPRINT_API === 'true',
  });
  console.log(JSON.stringify(result, null, 2));
}
