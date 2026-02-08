# Article Insight Highlighter (Chrome Extension)

A beginner-friendly Chrome extension (Manifest V3) that lets you:

- highlight selected text on an article,
- attach a **brief explanation**,
- attach a **lengthy explanation**,
- attach **relevant YouTube links**,
- attach **reference links**,
- see the same highlights again when you revisit the page,
- show the brief explanation in a hover tooltip.

## How it works

1. Select text on any page.
2. Click **Add highlight**.
3. Fill the modal form and save.
4. The selected text becomes highlighted.
5. Hover the highlight to see the brief explanation.
6. Click the highlight to see full details and links.

## Storage details

The extension stores all highlights in `chrome.storage.local`.

- This is local to your Chrome profile on your machine.
- It is **not** a normal file you can directly edit from Finder/Explorer.
- Chrome extensions generally cannot silently write arbitrary files anywhere on disk.

### Local file backup (supported)

The popup includes:

- **Export JSON**: save highlights to a local `.json` file.
- **Import JSON**: restore from a local `.json` file.

So yes, local file storage is possible via export/import, but not unrestricted background writes to arbitrary folders.

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Choose this folder (`/workspace/Codex`).

## Files

- `manifest.json`: extension config.
- `content.js`: highlighting, modal, tooltip, detail card, persistence.
- `content.css`: UI styling for highlight and overlay UI.
- `popup.html`, `popup.js`: export/import utilities.

## Limitations (MVP)

- Exact-text matching is used to re-apply highlights; dynamic pages may reduce match reliability.
- If identical text appears multiple times, currently the first matching instance is highlighted.
- No edit/delete UI yet (easy next step).

## Suggested next improvements

- Add edit/delete for each highlight.
- Save a stronger selector (XPath/TextPosition) for more reliable restoration.
- Add tags and search.
- Add sync option (`chrome.storage.sync`) if desired.
