use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tokio::sync::oneshot;

static SHUTDOWN_TX: OnceLock<Mutex<Option<oneshot::Sender<()>>>> = OnceLock::new();

fn get_shutdown_sender() -> &'static Mutex<Option<oneshot::Sender<()>>> {
    SHUTDOWN_TX.get_or_init(|| Mutex::new(None))
}

#[derive(Deserialize)]
pub struct FileShareSettings {
    pub port: u16,
    pub upload_path: String,
    pub password_auth: bool,
    pub password: String,
    pub use_ipv6: bool,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub size: u64,
}

#[tauri::command]
pub async fn start_file_share(settings: FileShareSettings) -> Result<(), String> {
    let addr = SocketAddr::new(
        if settings.use_ipv6 {
            std::net::IpAddr::V6(std::net::Ipv6Addr::UNSPECIFIED)
        } else {
            std::net::IpAddr::V4(std::net::Ipv4Addr::UNSPECIFIED)
        },
        settings.port,
    );

    let upload_dir = PathBuf::from(&settings.upload_path);
    if !upload_dir.exists() {
        std::fs::create_dir_all(&upload_dir).map_err(|e| e.to_string())?;
    }

    let (tx, rx) = oneshot::channel::<()>();
    *get_shutdown_sender().lock().map_err(|e| e.to_string())? = Some(tx);

    let app = axum::Router::new()
        .nest_service(
            "/uploads",
            tower_http::services::ServeDir::new(&upload_dir),
        )
        .route(
            "/upload",
            axum::routing::post({
                let dir = upload_dir.clone();
                move |body: axum::extract::Multipart| {
                    let dir = dir.clone();
                    async move { handle_upload(body, &dir).await }
                }
            }),
        )
        .route(
            "/",
            axum::routing::get(|| async {
                axum::response::Html(INDEX_HTML)
            }),
        )
        .layer(
            tower_http::cors::CorsLayer::permissive(),
        );

    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                rx.await.ok();
            })
            .await
            .unwrap();
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_file_share() -> Result<(), String> {
    let sender = get_shutdown_sender()
        .lock()
        .map_err(|e| e.to_string())?
        .take();
    if let Some(tx) = sender {
        let _ = tx.send(());
    }
    Ok(())
}

#[derive(Serialize, Clone)]
pub struct NetworkInterface {
    pub name: String,
    pub ip: String,
    pub is_ipv6: bool,
}

#[tauri::command]
pub fn list_network_interfaces() -> Result<Vec<NetworkInterface>, String> {
    let ifaces = local_ip_address::list_afinet_netifas().map_err(|e| e.to_string())?;
    let mut result: Vec<NetworkInterface> = Vec::new();
    for (name, ip) in &ifaces {
        if ip.is_loopback() {
            continue;
        }
        result.push(NetworkInterface {
            name: name.clone(),
            ip: ip.to_string(),
            is_ipv6: ip.is_ipv6(),
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn get_local_ip(use_ipv6: bool) -> Result<String, String> {
    if use_ipv6 {
        let ips = local_ip_address::list_afinet_netifas().map_err(|e| e.to_string())?;
        for (_, ip) in ips {
            if ip.is_ipv6() && !ip.is_loopback() {
                return Ok(ip.to_string());
            }
        }
        return Err("No IPv6 address found".into());
    }

    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket
        .connect("8.8.8.8:80")
        .map_err(|e| e.to_string())?;
    let addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(addr.ip().to_string())
}

#[tauri::command]
pub fn get_file_info(path: &str) -> Result<FileInfo, String> {
    let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let name = std::path::Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(FileInfo {
        name,
        size: meta.len(),
    })
}

async fn handle_upload(
    mut body: axum::extract::Multipart,
    dir: &std::path::Path,
) -> Result<axum::Json<serde_json::Value>, axum::http::StatusCode> {
    while let Some(field) = body.next_field().await.map_err(|_| axum::http::StatusCode::BAD_REQUEST)? {
        let name = field.file_name().unwrap_or("unknown").to_string();
        let data = field.bytes().await.map_err(|_| axum::http::StatusCode::BAD_REQUEST)?;
        let path = dir.join(&name);
        tokio::fs::write(&path, data).await.map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    Ok(axum::Json(serde_json::json!({ "ok": true })))
}

#[tauri::command]
pub fn open_folder(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn save_text_file(upload_path: String, filename: String, content: String) -> Result<FileInfo, String> {
    let dir = std::path::Path::new(&upload_path);
    if !dir.exists() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let file_path = dir.join(&filename);
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    let meta = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    Ok(FileInfo {
        name: filename,
        size: meta.len(),
    })
}

#[tauri::command]
pub fn copy_file_to_upload_dir(file_path: String, upload_path: String) -> Result<FileInfo, String> {
    let src = std::path::Path::new(&file_path);
    if !src.exists() {
        return Err(format!("Source file not found: {}", file_path));
    }
    let dir = std::path::Path::new(&upload_path);
    if !dir.exists() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let filename = src
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let dest = dir.join(&filename);
    if src != dest {
        std::fs::copy(src, &dest).map_err(|e| e.to_string())?;
    }
    let meta = std::fs::metadata(&dest).map_err(|e| e.to_string())?;
    Ok(FileInfo {
        name: filename,
        size: meta.len(),
    })
}

const INDEX_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>File Share</title></head>
<body>
<h2>File Share Service</h2>
<p>Upload files via POST to <code>/upload</code></p>
<p>Download from <code>/uploads/</code></p>
</body></html>"#;
