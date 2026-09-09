---
summary: "CLI reference for Enterprise account bootstrap and administrator password recovery"
read_when:
  - You are enabling Enterprise accounts for the first time
  - The only Enterprise administrator cannot sign in
title: "Auth"
---

# `openclaw auth`

Manage local Enterprise account authentication from the Gateway host.

## Bootstrap the first administrator

```bash
openclaw auth bootstrap-admin
```

This interactive command creates the first administrator, enables Enterprise,
and changes Gateway authentication to `accounts`. It refuses to run after an
enabled administrator already exists.

## Recover an administrator password

```bash
openclaw auth reset-admin-password
openclaw auth reset-admin-password <username>
```

The username defaults to `admin`. The command prompts twice for the new
password without placing it in shell history. It keeps the account and its
Enterprise data, revokes existing sessions, and allows the administrator to
sign in immediately with the new password.

Run password recovery only on the Gateway host. Local access to the OpenClaw
state directory is the recovery authority; the previous password is not
required.
