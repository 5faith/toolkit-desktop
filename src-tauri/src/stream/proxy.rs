use std::sync::OnceLock;
use tokio::sync::{broadcast, Mutex};
use tokio::net::TcpListener;
use tokio::process::Command;

static PROXY_STATE: OnceLock<Mutex<Option<ProxyState>>> = OnceLock::new();

struct ProxyState {
    shutdown_tx: tokio::sync::oneshot::Sender<()>,
}

fn get_proxy_state() -> &'static Mutex<Option<ProxyState>> {
    PROXY_STATE.get_or_init(|| Mutex::new(None))
}

pub async fn start_proxy(url: String, _protocol: String) -> Result<u16, String> {
    stop_proxy().await?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind port: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let (tx, _) = broadcast::channel::<Vec<u8>>(1024);

    let stream_url = url.clone();
    let data_tx = tx.clone();

    tokio::spawn(async move {
        if let Err(e) = pull_with_ffmpeg(&stream_url, data_tx).await {
            eprintln!("[stream_proxy] {}", e);
        }
    });

    tokio::spawn(async move {
        let app = axum::Router::new()
            .route("/stream.flv", axum::routing::get({
                let rx_tx = tx.clone();
                move || async move {
                    let mut rx = rx_tx.subscribe();
                    let stream = async_stream::stream! {
                        loop {
                            match rx.recv().await {
                                Ok(data) => {
                                    yield Ok::<_, std::convert::Infallible>(data);
                                }
                                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                                Err(_) => break,
                            }
                        }
                    };
                    axum::response::Response::builder()
                        .header("Content-Type", "video/x-flv")
                        .header("Cache-Control", "no-cache")
                        .header("Connection", "keep-alive")
                        .header("Access-Control-Allow-Origin", "*")
                        .header("Transfer-Encoding", "chunked")
                        .body(axum::body::Body::from_stream(stream))
                        .unwrap()
                }
            }));

        tokio::select! {
            result = axum::serve(listener, app.into_make_service()) => {
                if let Err(e) = result {
                    eprintln!("[stream_proxy] HTTP server error: {}", e);
                }
            }
            _ = &mut shutdown_rx => {}
        }
    });

    *get_proxy_state().lock().await = Some(ProxyState { shutdown_tx });
    Ok(port)
}

pub async fn stop_proxy() -> Result<(), String> {
    if let Some(state) = get_proxy_state().lock().await.take() {
        let _ = state.shutdown_tx.send(());
    }
    Ok(())
}

fn find_ffmpeg() -> Result<String, String> {
    let ffmpeg_name = if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let bundled = dir.join(ffmpeg_name);
            if bundled.exists() {
                return Ok(bundled.to_string_lossy().into_owned());
            }
        }
    }

    if let Ok(cargo_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let res = std::path::PathBuf::from(cargo_dir).join("resources").join(ffmpeg_name);
        if res.exists() {
            return Ok(res.to_string_lossy().into_owned());
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for depth in &[3, 4, 5] {
                let mut p = dir.to_path_buf();
                for _ in 0..*depth {
                    p.pop();
                }
                let candidate = p.join("src-tauri").join("resources").join(ffmpeg_name);
                if candidate.exists() {
                    return Ok(candidate.to_string_lossy().into_owned());
                }
            }
        }
    }

    let fallback = if cfg!(target_os = "windows") {
        vec!["ffmpeg.exe", "C:\\ffmpeg\\bin\\ffmpeg.exe"]
    } else {
        vec!["ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]
    };

    for path in &fallback {
        if std::path::Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }

    Err("ffmpeg not found. Please install ffmpeg.".into())
}

async fn pull_with_ffmpeg(url: &str, tx: broadcast::Sender<Vec<u8>>) -> Result<(), String> {
    let ffmpeg_path = find_ffmpeg()?;

    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args(["-re", "-i", url, "-c", "copy", "-f", "flv", "-"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    let mut stdout = child.stdout.take().ok_or("Failed to capture ffmpeg stdout")?;

    use tokio::io::AsyncReadExt;

    let mut buf = vec![0u8; 65536];

    loop {
        tokio::select! {
            result = stdout.read(&mut buf) => {
                match result {
                    Ok(0) => break,
                    Ok(n) => {
                        let _ = tx.send(buf[..n].to_vec());
                    }
                    Err(e) => {
                        eprintln!("[ffmpeg] Read error: {}", e);
                        break;
                    }
                }
            }
            status = child.wait() => {
                if let Err(e) = status {
                    eprintln!("[ffmpeg] Wait error: {}", e);
                }
                break;
            }
        }
    }

    let _ = child.kill().await;
    Ok(())
}
