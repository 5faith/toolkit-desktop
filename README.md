# toolkit-desktop

A cross-platform desktop utility toolkit built with Tauri 2.0, Vue 3, and Rust.

## Features

| Module | Description |
|--------|-------------|
| **Formatter** | Format, compress, and validate JSON, XML, and YAML |
| **Timestamp Tool** | Convert between timestamps and human-readable dates |
| **WebSocket Debugger** | Connect to WebSocket servers, send/receive messages, debug protocols |
| **Text Diff** | Compare two text blocks and highlight differences |
| **Live Player** | Play RTMP, RTSP, HTTP-FLV, and HLS streams locally via mpv |
| **Encryption** | Generate UUIDs, compute MD5 hashes, encrypt/decrypt with AES-256 |
| **Encoding** | HTML formatting, URL/Base64/HTML entity encoding, Image ↔ Base64 conversion |

## Tech Stack

- **Backend:** Rust (Tauri 2.0)
- **Frontend:** Vue 3 + TypeScript + Vite
- **UI:** Custom component system with CSS Variables theme (light/dark)
- **State:** Pinia
- **Routing:** Vue Router (hash mode)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [mpv](https://mpv.io/) — **required for Live Player**

### mpv Installation

Live Player supports RTMP, RTSP, HTTP-FLV, HLS and other streaming protocols via [mpv](https://mpv.io/). If mpv is not installed, the Live Player page will show a prompt.

**Windows:**

1. Download: https://sourceforge.net/projects/mpv-player-windows/files/64bit/
2. Extract the zip and find `mpv.exe`
3. Add the directory containing `mpv.exe` to your system PATH

**macOS:**

```bash
brew install mpv
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt install mpv
```

Verify installation:

```bash
mpv --version
```

### Run

```bash
npm install
npm run tauri dev
```
