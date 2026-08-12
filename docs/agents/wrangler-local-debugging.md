# Wrangler Local Command Times Out After Work Completes

Use this runbook when a local Wrangler or D1 command times out after it appears to have completed.

## Diagnose

1. Reduce the command to a local `d1 execute ... --command "SELECT 1"` check when possible.
2. Set `WRANGLER_LOG=debug` and `WRANGLER_LOG_PATH` for the child process.
3. Verify the expected persisted state, such as local D1 migrations or query results.
4. Distinguish three outcomes: operation completed, Wrangler exited, and the caller observed the exit.
5. Inspect remaining Node handles or TCP connections only when the operation completed but the process did not exit.

## Repository handling

Local Feed preview and Worker contract child processes set:

- `WRANGLER_HIDE_BANNER=true`
- `WRANGLER_SEND_METRICS=false`

The local preview also checks whether Feed migrations reached the persisted D1 database. If they did, it stops a child process that has not exited instead of reporting the migration as failed.

## Decision

A timeout alone is not acceptance evidence. Verify persisted state and command diagnostics before deciding whether the operation failed or whether to use a mock.
