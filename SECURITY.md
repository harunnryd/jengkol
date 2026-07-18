# Security

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, use
[GitHub's private vulnerability reporting](../../security/advisories/new) for this
repository, or email the maintainer directly.

Include:
- what you found and where (file/endpoint)
- steps to reproduce
- what you think the impact is

We'll acknowledge within a few days and follow up once it's triaged.

## Scope

This is an early-stage, actively-developed project. Known limitations that are already
tracked and documented (not silently ignored) are listed in
[docs/auth.md](docs/auth.md) and [docs/llm-vetting.md](docs/llm-vetting.md) — e.g. JWT
tokens are long-lived with no refresh-token rotation yet. Reports about already-documented
limitations are still welcome if you think the risk assessment is wrong.
