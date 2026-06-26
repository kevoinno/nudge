# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Firefox browser extension (Manifest V3). The current code is a placeholder derived from Mozilla's "borderify" example — it injects a content script that adds a red border to all mozilla.org pages.

## Loading the extension

Load it as a temporary add-on in Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json`

## Key files

- `manifest.json` — extension manifest (MV3); declares permissions, icons, and content script injection rules
- `borderify.js` — the content script injected into matched pages
- `icon.png` — extension icon (48px)

## Extension architecture

Firefox extensions consist of:
- **Content scripts** (`content_scripts` in manifest) — run in the context of web pages, have access to the DOM but not extension APIs
- **Background scripts** — persistent or event-driven scripts with full extension API access (none yet in this project)
- **Popup/options pages** — HTML pages for UI (none yet)

The current `matches` pattern in `manifest.json` restricts injection to `*://*.mozilla.org/*`. Broaden or change this to target different sites.
