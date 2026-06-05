use keyring::Entry;
use tauri::{
    Emitter, Manager, PhysicalPosition, Rect,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    WindowEvent,
};

const KEYCHAIN_SERVICE: &str = "arlo-menubar";
const KEYCHAIN_USER: &str = "arlo_auth_token";

#[tauri::command]
fn save_auth_token(token: String) -> Result<(), String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .set_password(&token)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn load_auth_token() -> Result<Option<String>, String> {
    match Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .get_password()
    {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn clear_auth_token() -> Result<(), String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .delete_credential()
        .map_err(|e| e.to_string())
}

/// Starts a one-shot local HTTP server and returns the port it is listening on.
/// Aegis redirects to http://127.0.0.1:{port}/callback?token=... after login,
/// the server extracts the token, emits an "auth-callback-url" event, and
/// shows a success page to the browser — no deep links or embedded webviews needed.
#[tauri::command]
fn start_auth_server(app: tauri::AppHandle) -> Result<u16, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;

    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let reader = BufReader::new(&stream);
            // Read just the first line: "GET /callback?token=... HTTP/1.1"
            let request_line = reader.lines().next().and_then(|l| l.ok()).unwrap_or_default();
            let path = request_line
                .split_whitespace()
                .nth(1)
                .unwrap_or("/")
                .to_string();

            let full_url = format!("http://127.0.0.1:{port}{path}");
            let _ = app.emit("auth-callback-url", full_url);

            let body = concat!(
                "<!DOCTYPE html><html><head><meta charset='utf-8'>",
                "<title>Signed in</title>",
                "<style>",
                "body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;",
                "text-align:center;padding:5rem 2rem;background:#0a0a0a;color:#fff;margin:0}",
                "h2{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}",
                "p{color:rgba(255,255,255,.45);font-size:.9rem}",
                "</style></head>",
                "<body><h2>&#10003; Signed in to Arlo Today</h2>",
                "<p>You can close this tab and return to the menu bar.</p></body></html>"
            );
            let response = format!(
                "HTTP/1.1 200 OK\r\n\
                 Content-Type: text/html; charset=utf-8\r\n\
                 Content-Length: {}\r\n\
                 Connection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
        }
    });

    Ok(port)
}

/// Proxies data-api requests from the webview through Rust to bypass browser CORS.
/// The edge function only allows https://arlo.jacobtartabini.com as an origin.
#[tauri::command]
async fn data_api_proxy(
    supabase_url: String,
    token: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let url = format!(
        "{}/functions/v1/data-api",
        supabase_url.trim_end_matches('/')
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("X-Arlo-Authorization", format!("Bearer {token}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    let payload: serde_json::Value = serde_json::from_str(&text).unwrap_or_else(|_| {
        serde_json::json!({
            "error": {
                "message": if text.is_empty() {
                    format!("Request failed with status {}", status.as_u16())
                } else {
                    text.clone()
                },
                "code": status.as_u16().to_string()
            }
        })
    });

    Ok(payload)
}

fn position_popover_under_tray(
    window: &tauri::WebviewWindow,
    tray_rect: &Rect,
) -> Result<(), tauri::Error> {
    let scale_factor = window.scale_factor()?;
    let window_size = window.outer_size()?;
    let pos = tray_rect.position.to_physical::<i32>(scale_factor);
    let size = tray_rect.size.to_physical::<u32>(scale_factor);

    let x = pos.x + (size.width as i32 / 2) - (window_size.width as i32 / 2);
    let y = pos.y + size.height as i32 + 4;
    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}

/// macOS 26+ often hides menu bar icons when the binary is executed directly
/// (e.g. from Terminal). Relaunch through the .app bundle via `open` instead.
#[cfg(target_os = "macos")]
fn maybe_relaunch_as_app_bundle() {
    if std::env::var_os("ARLO_MENUBAR_NO_RELAUNCH").is_some() {
        return;
    }

    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let exe = exe.canonicalize().unwrap_or(exe);
    let app_bundle = exe
        .parent()
        .filter(|macos| macos.file_name().is_some_and(|name| name == "MacOS"))
        .and_then(|macos| macos.parent())
        .filter(|contents| contents.file_name().is_some_and(|name| name == "Contents"))
        .and_then(|contents| contents.parent())
        .filter(|bundle| bundle.extension().is_some_and(|ext| ext == "app"));
    let Some(app_bundle) = app_bundle else {
        return;
    };

    let parent_name = std::process::Command::new("ps")
        .args(["-o", "ppid=", "-p"])
        .arg(std::process::id().to_string())
        .output()
        .ok()
        .and_then(|output| {
            String::from_utf8(output.stdout)
                .ok()
                .and_then(|line| line.trim().parse::<u32>().ok())
        })
        .and_then(|ppid| {
            std::process::Command::new("ps")
                .args(["-o", "comm=", "-p"])
                .arg(ppid.to_string())
                .output()
                .ok()
                .and_then(|output| {
                    String::from_utf8(output.stdout)
                        .ok()
                        .map(|name| name.trim().to_lowercase())
                })
        })
        .unwrap_or_default();

    const TERMINAL_PARENTS: &[&str] = &[
        "zsh", "bash", "sh", "fish", "tcsh", "dash", "nu", "xonsh",
    ];
    if !TERMINAL_PARENTS
        .iter()
        .any(|shell| parent_name.contains(shell))
    {
        return;
    }

    eprintln!(
        "[arlo-menubar] relaunching via app bundle so the menu bar icon can appear…"
    );
    let _ = std::process::Command::new("/usr/bin/open")
        .arg(&app_bundle)
        .spawn();
    std::process::exit(0);
}

fn toggle_popover(app: &tauri::AppHandle, tray_rect: Option<Rect>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }

    if let Some(rect) = tray_rect {
        let _ = position_popover_under_tray(&window, &rect);
    }

    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    maybe_relaunch_as_app_bundle();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            save_auth_token,
            load_auth_token,
            clear_auth_token,
            start_auth_server,
            data_api_proxy
        ])
        .setup(|app| {
            // Menu-bar-only mode is configured via LSUIElement in Info.plist.
            // Avoid calling set_activation_policy here: doing it during
            // did_finish_launching can panic on some macOS/Tauri versions.

            let tray_icon = TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray-icon.png"))
                .icon_as_template(true)
                .show_menu_on_left_click(false)
                .tooltip("Arlo Today")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_popover(tray.app_handle(), Some(rect));
                    }
                })
                .build(app)
                .map_err(|e| {
                    eprintln!("[arlo-menubar] failed to create tray icon: {e}");
                    e
                })?;

            app.manage(tray_icon);

            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
            }

            eprintln!(
                "[arlo-menubar] started — look for the Arlo icon at the top-right of the menu bar (check the … overflow if the bar is crowded)"
            );
            Ok(())
        })
        .build(tauri::generate_context!())
        .map_err(|e| {
            eprintln!("[arlo-menubar] failed to build application: {e}");
            e
        })
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {});
}
