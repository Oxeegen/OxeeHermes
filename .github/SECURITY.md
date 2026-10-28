# Security policy

Oxee Hermes is Oxeegen's desktop AI agent. It runs commands, reads and writes files, browses, and
holds your Oxeegen API key and the credentials of the platforms you connect: we take its security
seriously and thank everyone who helps keep it safe.

## Supported versions

Security fixes are released in the latest Oxee Hermes version only. Keep the app up to date:
Settings › About › Version and updates shows the installed version and installs the latest
[release](https://github.com/Oxeegen/OxeeHermes/releases).

## Reporting a vulnerability

**Do not report vulnerabilities in public issues, discussions or pull requests.** Report them
privately through a
[GitHub security advisory](https://github.com/Oxeegen/OxeeHermes/security/advisories/new).

Please include:

- the Oxee Hermes version and how it is installed (setup.exe for me / for all users, built from
  source…);
- the affected area (desktop app, agent tools, messaging gateway, installer, updater…);
- the steps to reproduce, and what an attacker could do with it;
- logs or a proof of concept, **with every key, token and personal data removed**.

We acknowledge the report, keep you informed while we work on a fix, and credit you in the release
notes if you wish once the fix is published.

## Scope

- **In scope**: the Oxee Hermes layer (`oxeegen/`, `apps/desktop/src/oxeegen/`,
  `plugins/model-providers/oxeegen/`, the installer and updater) and the Hermes Agent code as shipped
  in Oxee Hermes.
- **Upstream**: a vulnerability that also affects
  [Hermes Agent](https://github.com/NousResearch/hermes-agent) should be reported to Nous Research as
  well, following [their policy](/SECURITY.md); tell us, and we will follow up in Oxee Hermes.
- **Out of scope**: the Oxeegen inference service itself, the third-party platforms you connect, and
  what the agent does with permissions you granted it on purpose.

## Using Oxee Hermes safely

- Your Oxeegen key is stored in `%LOCALAPPDATA%\hermes-oxeegen\.env`: keep that folder private and
  never share the file.
- The agent acts with your user's rights. Review its plan before approving commands that modify or
  delete files, and keep approvals on for anything that leaves your machine.
- Connect messaging platforms only with an allowlist of user IDs, so strangers cannot drive your
  agent.
- Install only skills and plugins you trust: they run with the agent's rights.
