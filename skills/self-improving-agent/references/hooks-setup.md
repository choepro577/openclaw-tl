# External Hook Setup

Optional setup for external agent CLIs that support shell hook commands.

This document is for Claude Code, Codex CLI, or similar tools. It is not an OpenClaw internal hook guide.

## Included Helpers

- `scripts/activator.sh` emits a lightweight post-prompt reminder
- `scripts/error-detector.sh` emits a reminder when `CLAUDE_TOOL_OUTPUT` contains common error patterns

## Claude Code Example

Create `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "./skills/self-improving-agent/scripts/activator.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./skills/self-improving-agent/scripts/error-detector.sh"
          }
        ]
      }
    ]
  }
}
```

For a lighter setup, keep only `UserPromptSubmit`.

## Codex CLI Example

Create `.codex/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "./skills/self-improving-agent/scripts/activator.sh"
          }
        ]
      }
    ]
  }
}
```

## Verification

```bash
./skills/self-improving-agent/scripts/extract-skill.sh test-skill --dry-run
bash -n ./skills/self-improving-agent/scripts/activator.sh
bash -n ./skills/self-improving-agent/scripts/error-detector.sh
```

To test the error reminder in a compatible hook runner, run a failing command such as `ls /nonexistent/path` after wiring the `PostToolUse` hook.

## Security Notes

- These scripts are opt-in.
- `error-detector.sh` inspects `CLAUDE_TOOL_OUTPUT` when the host provides it.
- Treat that environment variable as potentially sensitive.
- Do not log or forward raw tool output unless the user explicitly wants that detail.
