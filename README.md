# IT Support Tool

A Windows system tray application that helps end users self-resolve common IT issues — network problems, printer issues, and general performance slowdowns — without contacting the helpdesk.

---

## Features

### Tray Icon
- **Left-click** — opens/closes the support popup
- **Right-click** — context menu with *Open* and *Quit*
- **Auto-launch** on Windows startup
- Single-instance lock (prevents duplicate processes)

### Network Issues
| Type | Action |
|------|--------|
| Quick Fix | Flush DNS Cache |
| Quick Fix | Reset Network Stack *(requires admin)* |
| Settings | Network & Internet Settings |
| Settings | Wi-Fi Settings |
| Settings | VPN Settings |
| Guide | Network Troubleshooting Guide (PDF) |

### Printer Issues
| Type | Action |
|------|--------|
| Quick Fix | Restart Print Spooler *(requires admin)* |
| Quick Fix | Clear Print Queue *(requires admin)* |
| Settings | Printers & Scanners Settings |
| Guide | Printer Troubleshooting Guide (PDF) |

### General Performance
| Type | Action |
|------|--------|
| Quick Fix | Clean Temp Files |
| Quick Fix | Empty Recycle Bin |
| Settings | Windows Update |
| Settings | Storage Settings |
| Settings | Startup Apps |
| Guide | PC Performance Optimization Guide (PDF) |

---

## Download

The latest Windows installer is automatically built on every push to `main` via GitHub Actions.

1. Go to the **[Actions](../../actions)** tab
2. Click the most recent **Build Windows Installer** run
3. Scroll to **Artifacts** at the bottom
4. Download `IT-Support-Tool-Windows-xxxx.zip` → extract → run the `.exe`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 27 |
| UI | React 18 + TypeScript 5 |
| Bundler | Webpack 5 |
| Installer | electron-builder (NSIS) |
| Auto-launch | auto-launch |

---

## Project Structure

```
it-support-tray/
├── config/
│   ├── app-config.json       # Fallback config (used when Supabase is unreachable)
│   └── supabase.json         # Supabase credentials (not committed — see GitHub Secrets)
├── resources/
│   ├── icon.png              # Tray & installer icon
│   └── guides/               # PDF troubleshooting guides
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # App entry point
│   │   ├── tray-manager.ts   # Tray icon & context menu
│   │   ├── window-manager.ts # Popup window management
│   │   ├── ipc-handlers.ts   # IPC event handlers
│   │   ├── command-runner.ts # PowerShell command execution
│   │   ├── config-loader.ts  # Config file loader
│   │   ├── auto-launch-setup.ts
│   │   └── preload.ts        # Context bridge (main ↔ renderer)
│   ├── renderer/             # React UI (renderer process)
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── index.html
│   │   ├── components/
│   │   │   ├── Accordion.tsx
│   │   │   ├── CategorySection.tsx
│   │   │   └── QuickFixButton.tsx
│   │   └── styles/
│   │       └── global.css
│   └── shared/
│       └── types.ts          # Shared TypeScript interfaces
├── electron-builder.yml
├── webpack.config.js
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Windows (Quick Fix commands are Windows-specific)

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the main process compiler, renderer bundler, and Electron simultaneously with hot-reload.

### Production build

```bash
npm run build
npm start
```

### Package as Windows installer (.exe)

```bash
npm run dist
```

Output is saved to the `release/` folder.

---

## Configuration

All categories, actions, and labels are defined in [`config/app-config.json`](config/app-config.json). No code changes are needed to add or modify Quick Fix actions, settings shortcuts, or PDF guides — edit the config file only.

```jsonc
{
  "appName": "IT Support Tool",
  "version": "1.0.0",
  "categories": [
    {
      "id": "network",
      "title": "Network Issues",
      "quickFixes": [ ... ],
      "settingsShortcuts": [ ... ],
      "pdfGuide": { ... }
    }
  ]
}
```

---

## Admin Privileges

Commands that require elevated permissions (e.g., Reset Network Stack, Restart Print Spooler) use `Start-Process -Verb RunAs` via PowerShell. Windows will display a **UAC prompt** — the user must click *Yes* to proceed. The app itself runs without admin rights (`asInvoker`).

---

## Adding PDF Guides

Place PDF files in `resources/guides/` and reference the filename in `app-config.json` under `pdfGuide.filename`. The installer automatically bundles files from that folder.

---

## License

MIT
