# toolkit-desktop
toolkit desktop

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [mpv](https://mpv.io/) — **使用 Live Player 功能必须安装**

### mpv 安装说明

Live Player 支持 RTMP、RTSP、HTTP-FLV、HLS 等流媒体协议播放，底层依赖 [mpv](https://mpv.io/)。未安装 mpv 时，Live Player 页面会显示提示。

**Windows:**

1. 下载: https://sourceforge.net/projects/mpv-player-windows/files/64bit/
2. 解压 zip，找到 `mpv.exe`
3. 将 `mpv.exe` 所在目录添加到系统 PATH 环境变量

**macOS:**

```bash
brew install mpv
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt install mpv
```

验证安装：

```bash
mpv --version
```

### Run

```bash
npm install
npm run tauri dev
```
