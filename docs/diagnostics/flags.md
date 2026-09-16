---
summary: "Diagnostics flags for targeted debug logs"
read_when:
  - You need targeted debug logs without raising global logging levels
  - You need to capture subsystem-specific logs for support
title: "Diagnostics flags"
---

Diagnostics flags turn on extra logging for one subsystem without raising
`logging.level` globally. A flag has no effect unless a subsystem checks it.

## How it works

- Flags are case-insensitive strings, resolved from `diagnostics.flags` in
  config plus the `OPENCLAW_DIAGNOSTICS` env override, deduped and lowercased.
- `name.*` matches `name` itself and anything under `name.` (for example
  `telegram.*` matches `telegram.http`).
- `*` or `all` enables every flag.
- Restart the gateway after changing `diagnostics.flags` in config; it is not
  hot-reloaded.

## Known flags

| Flag                  | Enables                                                   |
| --------------------- | --------------------------------------------------------- |
| `telegram.http`       | Telegram Bot API HTTP error logging                       |
| `brave.http`          | Brave Search request/response/cache logging               |
| `profiler`            | Reply-stage profiler and Codex app-server profiler (both) |
| `reply.profiler`      | Reply-stage profiler only                                 |
| `codex.profiler`      | Codex app-server profiler only                            |
| `health`              | Gateway health probe/account/binding debug details        |
| `ingress.timing`      | Session load, model selection, and model catalog timings  |
| `plugin.load-profile` | Synchronous plugin module-load timings                    |
| `timeline`            | Structured JSONL timeline artifact (see below)            |

## Enable via config

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Multiple flags:

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "brave.http", "gateway.*"]
  }
}
```

## Env override (one-off)

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,brave.http
```

Values split on commas or whitespace. Special values:

| Value                       | Effect                                   |
| --------------------------- | ---------------------------------------- |
| `0`, `false`, `off`, `none` | Disable all flags, overriding config too |
| `1`, `true`, `all`, `*`     | Enable every flag                        |

`OPENCLAW_DIAGNOSTICS=0` disables flags from both env and config for that
process, useful for temporarily silencing a profiler flag left on in config
without editing the file.

## Profiler flags

Profiler flags gate lightweight timing spans; they add no overhead when off.

Enable all profiler-gated spans for one gateway run:

```bash
OPENCLAW_DIAGNOSTICS=profiler openclaw gateway run
```

Enable only reply-dispatch profiler spans:

```bash
OPENCLAW_DIAGNOSTICS=reply.profiler openclaw gateway run
```

Enable only Codex app-server startup/tool/thread profiler spans:

```bash
OPENCLAW_DIAGNOSTICS=codex.profiler openclaw gateway run
```

`profiler` enables both the reply profiler and the Codex profiler; use the
scoped flag names to enable just one.

Or set it in config:

```json
{
  "diagnostics": {
    "flags": ["reply.profiler", "codex.profiler"]
  }
}
```

Restart the gateway after changing config flags. To disable a profiler flag,
remove it from `diagnostics.flags` and restart, or start the process with
`OPENCLAW_DIAGNOSTICS=0` to override every diagnostics flag for that run.

## Timeline artifacts

The `timeline` flag (alias: `diagnostics.timeline`) writes structured startup
and runtime timing events as JSONL, for external QA harnesses:

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-timeline.jsonl \
openclaw gateway run
```

Or enable it in config:

```json
{
  "diagnostics": {
    "flags": ["timeline"]
  }
}
```

The output path always comes from `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH`, even
when the flag itself is set in config; there is no config key for the path.
When `timeline` is enabled only from config, the earliest config-loading spans
are missing because OpenClaw has not read config yet; subsequent startup spans
are captured normally.

`OPENCLAW_DIAGNOSTICS=1`, `=all`, and `=*` also enable the timeline, since they
enable every flag. Prefer the scoped `timeline` flag when you only want the
JSONL artifact and not every other diagnostics flag.

Event-loop delay samples in the timeline need one more opt-in beyond
`timeline`: set `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` (or `on`/`true`/`yes`) on
top of enabling the timeline.

Timeline records use the `openclaw.diagnostics.v1` envelope and can include
process ids, phase names, span names, durations, plugin ids, dependency
counts, event-loop delay samples, provider operation names, child-process exit
state, and startup error names/messages. Treat timeline files as local
diagnostics artifacts; review before sharing them outside your machine.

### Measure chat startup latency

Measure from Gateway receipt to the first provider submission, and report
provider response time separately. An ACK confirms admission; it does not mean
the model request has started. With the Codex harness, `thread/start` and
`turn/start` measure app-server RPC work. The native turn can still prepare
context before submitting a model request.

For HTTP model transports, `provider.http.submit` marks the fetch invocation
after transport policy and DNS checks. It does not prove provider acceptance.
Redirect attempts include `redirectCount`; do not count redirects as additional
LLM decisions. The marker records model identifiers and timing, without request
content, headers, or endpoint URLs.

For example, a request can spend 20 ms in admission, wait 200 ms in a queue,
and spend another 80 ms preparing the agent. Its server startup is 300 ms,
even if the ACK arrived after the first 20 ms. If two preparation spans overlap,
use their actual start and end times instead of adding their durations.

Compare the same source configuration, model, reasoning level, history, and
tool schemas. Report sample count, failures, p50, and p95 separately for cold
starts, prewarmed sessions, reused sessions, queue waits, and compaction. A
slow-stage warning is a selected sample, not a percentile. Keep prewarm time
visible even when it finishes before the user presses Send.

Client and server monotonic clocks have different origins. Use request
correlation to join their records, but compute durations within each clock;
do not subtract a browser timestamp from a Gateway timestamp. Missing native
provider telemetry remains unknown rather than being replaced with an RPC ACK.

### Compare Enterprise routing strategies

`OPENCLAW_EXPERIMENT_ENTERPRISE_AGENT_FIRST=1` enables the opt-in Enterprise
Personal-Agent-first experiment on an isolated Gateway. It is off by default.
The Personal Agent proposes a structured delegation decision through
`enterprise_delegate`; the server still validates required inputs, user sources,
scope, permissions, and replay state before starting a specialist. Pending
clarification continues through the existing router. Invalid proposals may fall
back to that router once, only before any specialist has started.

Unset the variable to use the existing routing flow. Keep the experiment off
until paired conversations demonstrate both fewer sequential model calls and
no observed quality regression. Do not change the model, reasoning level,
context budget, or tool permissions to improve a latency score.

## Where logs go

Flags emit logs into the standard diagnostics log file. By default:

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Named profiles use `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`; for
example, `--dev` uses `openclaw-dev-YYYY-MM-DD.log`.

If you set `logging.file`, use that path instead. Logs are JSONL (one JSON
object per line). Redaction still applies; it is always on.
See [Logging](/logging) for the full log-path resolution, rotation, and
redaction model.

## Extract logs

Read the active profile's latest log file:

```bash
openclaw logs --plain
# Named profile example:
openclaw --profile work logs --plain
```

Filter for Telegram HTTP diagnostics:

```bash
openclaw logs --plain --limit 5000 | rg "telegram http error"
```

Filter for Brave Search HTTP diagnostics:

```bash
openclaw logs --plain --limit 5000 | rg "brave http"
```

Or tail while reproducing:

```bash
openclaw logs --follow --plain | rg "telegram http error"
```

For remote gateways, use `openclaw logs --follow` instead (see
[/cli/logs](/cli/logs)).

## Notes

- If `logging.level` is set higher than `warn`, flag-gated logs may be
  suppressed. Default `info` is fine.
- `brave.http` logs Brave Search request URLs/query params, response
  status/timing, and cache hit/miss/write events. It does not log the API key
  (sent as a request header) or response bodies, but search queries can be
  sensitive.
- Flags are safe to leave enabled; they only affect log volume for the
  specific subsystem.
- Use [/logging](/logging) to change log destinations, levels, and redaction.

## Related

- [Gateway diagnostics](/gateway/diagnostics)
- [Gateway troubleshooting](/gateway/troubleshooting)
