# Security guardrails

This repository includes local guardrails to avoid committing or pushing secrets.

## Local checks

Run the secret scanner manually:

```bash
npm run check:secrets
```

Install the Git hooks on a clone:

```bash
npm run install:git-hooks
```

The hooks run:

- `pre-commit`: scans staged files before a commit is created.
- `pre-push`: scans commits being pushed and the current worktree before data leaves the machine.

## Never commit

- `.env` files or local override files.
- SSH private keys, certificates, tokens, passwords, API keys, and Home Assistant long-lived access tokens.
- `secrets.yaml` or any Home Assistant config file containing real credentials.

If a secret is ever committed, rotate the secret and rewrite/remove the commit before pushing.
