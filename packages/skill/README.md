# @usecannon/skill

AI agent skill for Cannon. Enables AI assistants (Claude, GPT-4, etc.) to help with Ethereum deployments using Cannon.

## What is this?

This package contains a skill definition that can be used with AI agent frameworks like OpenClaw. The skill provides:

- Complete Cannon CLI reference
- Cannonfile syntax documentation
- Deployment workflows and best practices
- Debugging and troubleshooting guides
- GitOps and migration patterns

## Usage

### OpenClaw

Copy `SKILL.md` and the `references/` folder to your OpenClaw skills directory:

```bash
cp -r packages/skill/* ~/.openclaw/workspace/skills/cannon/
```

### Other AI Frameworks

The `SKILL.md` file is designed to be used as a system prompt or context document for AI assistants. Point your AI framework to this file when working on Cannon-related tasks.

## Contents

- `SKILL.md` - Main skill definition with safety warnings, CLI reference, and workflows
- `references/cli.md` - Detailed CLI command reference
- `references/cannonfile.md` - Complete cannonfile specification
- `references/testing.md` - Testing patterns with cannon-std
- `references/registry.md` - Registry and publishing guide

## Safety

⚠️ **Blockchain deployments are irreversible.** This skill includes prominent safety warnings and requires AI assistants to:

1. Explain operations before executing
2. Use dry-run mode first
3. Confirm before deploying with real keys
4. Test locally before mainnet

## License

MIT
