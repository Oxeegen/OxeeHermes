<p align="center">
  <img src="/oxeegen/assets/generated/icon-256.png" width="96" alt="Oxee Hermes">
</p>

<h1 align="center">Oxee Hermes</h1>

<p align="center">
  <b>Oxeegen's desktop AI agent.</b><br>
  Give it a task in plain words: it reads your files, uses its tools, explains its plan<br>
  and asks before acting, on Oxeegen's models hosted in Europe or the US.
</p>

<p align="center">
  <a href="https://github.com/Oxeegen/OxeeHermes/releases/latest"><img src="https://img.shields.io/github/v/release/Oxeegen/OxeeHermes?label=release&color=5E4AF5" alt="Latest release"></a>
  <a href="/LICENSE"><img src="https://img.shields.io/badge/license-MIT-5E4AF5" alt="MIT"></a>
  <img src="https://img.shields.io/badge/Windows-setup.exe-5E4AF5" alt="Windows setup.exe">
  <a href="https://github.com/NousResearch/hermes-agent"><img src="https://img.shields.io/badge/based%20on-Hermes%20Agent%200.22.2%2B-5E4AF5" alt="Based on Hermes Agent 0.22.2+"></a>
</p>

<p align="center">
  <img src="/oxeegen/assets/screenshots/hero.gif" width="900" alt="Ask a task, then browse a finished conversation">
</p>

---

## Highlights

- **One provider, nothing to configure.** Pick your region (EU or US), paste your Oxeegen key: the
  agent, its auxiliary tasks, speech-to-text and voice all run on Oxeegen. No other provider can be
  selected, even by accident.
- **An agent, not a chat box.** It reads and writes files, runs commands, browses, schedules jobs and
  delegates to sub-agents, and shows each step it takes.
- **Talk to it.** Dictate with Oxeegen speech-to-text in your system language, hear the answers in one
  of 35 French voices.
- **Works where you are.** The same agent answers on Telegram, Slack, Discord, WhatsApp, email and
  ~20 other platforms, and runs scheduled tasks while you are away.
- **Bots.** Long-lived agents with their own profile, memory and chat, alone or in group rooms.
- **In French.** The whole interface, Bot Mode included, follows the system language.
- **Kept up to date.** Settings › About shows what is new in the installed version and installs the
  next release from GitHub in one click.

## Features

### Ask, follow, review

Describe the task; Oxee Hermes explores, acts, and keeps a readable record of what it did: files read,
commands run, results as text and tables.

<img src="/oxeegen/assets/screenshots/02-conversation.png" alt="A report summarised into five points and a table">

<img src="/oxeegen/assets/screenshots/04-invoices.png" alt="Overdue invoices found and a reminder drafted">

<details>
<summary>Dark theme</summary>

<img src="/oxeegen/assets/screenshots/03-conversation-dark.png" alt="The same conversation in the dark theme">
</details>

### Oxeegen models

The model menu lists Oxeegen's chat models only (Max, Pro, Ultra, Flash, Instant), with the reasoning
effort next to it. Region, key and models live in a managed configuration shipped with the app.

<img src="/oxeegen/assets/screenshots/05-model-picker.png" alt="Model menu limited to Oxeegen models">

### Scheduled tasks

Weekly sales summary, invoice reminders, competitive watch: write the prompt, pick when, choose where
the result is delivered. Ready-made plans to start from.

<img src="/oxeegen/assets/screenshots/06-cron.png" alt="Scheduled tasks with frequency, next run and history">

### Skills and tools

Turn capabilities on or off, install skills from the hub, connect tools.

<img src="/oxeegen/assets/screenshots/07-capabilities.png" alt="Skills list with details">

### Messaging

Connect the agent to Telegram (QR code setup), Slack, Discord, WhatsApp, Signal, email, SMS and more.

<img src="/oxeegen/assets/screenshots/08-messaging.png" alt="Messaging platforms and Telegram setup">

### Voice

A fixed chain: Oxeegen speech-to-text, the agent, Oxeegen voice. Choose the transcription language
(the system language by default) and the voice; the models are shown, not chosen.

<img src="/oxeegen/assets/screenshots/09-settings-voice.png" alt="Speech recognition settings">

### A workspace that gets out of the way

Sessions, pinned conversations and bots in a side panel that folds into a narrow rail.

<img src="/oxeegen/assets/screenshots/sidebar.gif" width="900" alt="The side panel folds into a rail and opens again">

## Install

**Windows 10 / 11 (x64):** download `OxeeHermesBundled-Setup-<version>-x64.exe` from the
[latest release](https://github.com/Oxeegen/OxeeHermes/releases/latest) and run it.

- Install **for me** (no admin rights) or **for all users** (Program Files, admin). Silent install:
  `/S`, plus `/allusers` for the machine.
- The installer is not signed yet: SmartScreen shows a warning, click **More info**, then
  **Run anyway**.
- On first launch, choose your region and enter your Oxeegen API key.
- The `oxee-hermes` command is added to the PATH.

Oxee Hermes keeps its own data folder (`%LOCALAPPDATA%\hermes-oxeegen`) and runs side by side with an
official Hermes install.

- [What the fork changes, and how it is built](/oxeegen/README.md)
- [Security policy](/.github/SECURITY.md)

## Based on Hermes Agent

Oxee Hermes is a fork of [Hermes Agent](https://github.com/NousResearch/hermes-agent) (MIT,
© 2025 Nous Research) by [Oxeegen](https://github.com/Oxeegen), based on the upstream main branch of 16 October 2026 (between
Hermes Agent v0.22.2 and v0.22.3). Everything Oxee Hermes changes lives in
a small, regenerable layer (`oxeegen/`, `apps/desktop/src/oxeegen/`, the Oxeegen model provider plugin
and a few guarded hooks), so upstream releases can still be merged. Thanks to the Nous Research team
for the agent this is built on.

License: [MIT](/LICENSE).
