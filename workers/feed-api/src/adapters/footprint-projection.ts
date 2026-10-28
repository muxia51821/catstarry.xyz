// Shared source eligibility for public_footprints and the Timeline projection.
// Bind the published Blog set first, then the public Learn set (JSON arrays).
// Own visibility is handled separately so admin history remains readable.
export const FOOTPRINT_SOURCE_ELIGIBILITY = `(
  (source_module != 'blog' OR source_ref IN (SELECT value FROM json_each(?)))
  AND (source_module != 'learn' OR event_type = 'learn_section_completed'
    OR source_ref IN (SELECT value FROM json_each(?)))
)`;
