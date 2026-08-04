# toolkit-desktop
toolkit desktop

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [ffmpeg](https://ffmpeg.org/) (required for RTMP/RTSP stream proxy)

### ffmpeg Setup (Required for RTMP/RTSP)

Live Player 的 RTMP/RTSP 功能依赖 ffmpeg 拉流转码。

**Windows:**

1. Download: https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip
2. Extract the zip, locate `bin/ffmpeg.exe`
3. Place `ffmpeg.exe` into `src-tauri/resources/`
4. Also add the `bin/` directory to system PATH (optional, for global access)

**macOS:**

```bash
brew install ffmpeg
```

**Linux:**

```bash
sudo apt install ffmpeg
```

### Run

```bash
npm install
npm run tauri dev
```
