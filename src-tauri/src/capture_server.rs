use crate::db::manager::DbManager;
use crate::models::EntryPayload;
use crate::repositories::entry_repository::EntryRepository;
use serde::Deserialize;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread;

const CAPTURE_ADDRESS: &str = "127.0.0.1:38951";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CaptureRequest {
    title: String,
    url: String,
    summary: Option<String>,
    source_type: Option<String>,
    project_name: Option<String>,
    topic: Option<String>,
    tags: Option<Vec<String>>,
    conversation_date: Option<String>,
    notes: Option<String>,
    status: Option<String>,
    favorite: Option<bool>,
    source_context: Option<String>,
}

pub fn start_capture_server(db_path: PathBuf) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(CAPTURE_ADDRESS) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("capture server bind failed: {error}");
                return;
            }
        };

        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    if let Err(error) = handle_connection(stream, &db_path) {
                        eprintln!("capture server request failed: {error}");
                    }
                }
                Err(error) => eprintln!("capture server accept failed: {error}"),
            }
        }
    });
}

fn handle_connection(mut stream: TcpStream, db_path: &PathBuf) -> anyhow::Result<()> {
    let (method, path, body) = read_http_request(&mut stream)?;

    match (method.as_str(), path.as_str()) {
        ("OPTIONS", _) => {
            write_response(&mut stream, 204, "application/json; charset=utf-8", "")?;
        }
        ("GET", "/health") => {
            write_response(
                &mut stream,
                200,
                "application/json; charset=utf-8",
                r#"{"ok":true,"service":"atlasx-capture"}"#,
            )?;
        }
        ("POST", "/capture") => {
            let request: CaptureRequest = serde_json::from_slice(&body)?;
            let response = save_capture(db_path, request)?;
            write_response(&mut stream, 200, "application/json; charset=utf-8", &response)?;
        }
        _ => {
            write_response(
                &mut stream,
                404,
                "application/json; charset=utf-8",
                r#"{"ok":false,"message":"not found"}"#,
            )?;
        }
    }

    Ok(())
}

fn save_capture(db_path: &PathBuf, request: CaptureRequest) -> anyhow::Result<String> {
    let title = request.title.trim();
    let url = request.url.trim();

    if title.is_empty() {
        anyhow::bail!("title is required");
    }
    if url.is_empty() {
        anyhow::bail!("url is required");
    }

    let mut db = DbManager::open(db_path)?;

    let tags = {
        let mut tags = request.tags.unwrap_or_default();
        if tags.iter().all(|tag| tag.trim() != "\u{7f51}\u{9875}\u{91c7}\u{96c6}") {
            tags.push("\u{7f51}\u{9875}\u{91c7}\u{96c6}".to_string());
        }
        tags.into_iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect::<Vec<_>>()
    };

    let payload = EntryPayload {
        custom_id: String::new(),
        title: title.to_string(),
        summary: request
            .summary
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| {
                "\u{4ece} ChatGPT \u{7f51}\u{9875}\u{4e00}\u{952e}\u{91c7}\u{96c6}\u{ff0c}\u{5f85}\u{8865}\u{5145}\u{6458}\u{8981}\u{3002}".to_string()
            }),
        url: url.to_string(),
        source_type: request
            .source_type
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "chatgpt".to_string()),
        project_name: request.project_name.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
        topic: request.topic.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
        tags,
        conversation_date: request
            .conversation_date
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string()),
        notes: request.notes.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()),
        status: request
            .status
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "\u{5f85}\u{6574}\u{7406}".to_string()),
        favorite: request.favorite.unwrap_or(false),
    };

    let existed: bool = db
        .conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM capture_inbox WHERE url = ?1)",
            [payload.url.trim()],
            |row| row.get::<_, i64>(0),
        )?
        == 1;

    let item = EntryRepository::upsert_capture_inbox(
        &mut db.conn,
        &payload,
        request.source_context.as_deref(),
    )?;

    Ok(serde_json::json!({
        "ok": true,
        "action": if existed { "updated" } else { "queued" },
        "inboxId": item.id,
        "title": item.title,
        "url": item.url
    })
    .to_string())
}

fn read_http_request(stream: &mut TcpStream) -> anyhow::Result<(String, String, Vec<u8>)> {
    let mut data = Vec::new();
    let mut buffer = [0u8; 8192];
    let mut header_end = None;
    let mut content_length = 0usize;

    loop {
        let read = stream.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        data.extend_from_slice(&buffer[..read]);

        if header_end.is_none() {
            if let Some(index) = find_header_end(&data) {
                header_end = Some(index);
                let header_text = String::from_utf8_lossy(&data[..index]);
                content_length = parse_content_length(&header_text);
                if data.len() >= index + 4 + content_length {
                    break;
                }
            }
        } else if let Some(index) = header_end {
            if data.len() >= index + 4 + content_length {
                break;
            }
        }
    }

    let header_end = header_end.ok_or_else(|| anyhow::anyhow!("invalid HTTP request"))?;
    let header_text = String::from_utf8_lossy(&data[..header_end]);
    let mut lines = header_text.lines();
    let request_line = lines.next().ok_or_else(|| anyhow::anyhow!("missing request line"))?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts
        .next()
        .ok_or_else(|| anyhow::anyhow!("missing method"))?
        .to_string();
    let path = request_parts
        .next()
        .ok_or_else(|| anyhow::anyhow!("missing path"))?
        .to_string();

    let body_start = header_end + 4;
    let body = if content_length > 0 && data.len() >= body_start + content_length {
        data[body_start..body_start + content_length].to_vec()
    } else if data.len() > body_start {
        data[body_start..].to_vec()
    } else {
        Vec::new()
    };

    Ok((method, path, body))
}

fn parse_content_length(headers: &str) -> usize {
    headers
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            if name.trim().eq_ignore_ascii_case("content-length") {
                value.trim().parse::<usize>().ok()
            } else {
                None
            }
        })
        .unwrap_or(0)
}

fn find_header_end(data: &[u8]) -> Option<usize> {
    data.windows(4).position(|window| window == b"\r\n\r\n")
}

fn write_response(stream: &mut TcpStream, status_code: u16, content_type: &str, body: &str) -> anyhow::Result<()> {
    let status_text = match status_code {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "OK",
    };

    let response = format!(
        "HTTP/1.1 {status_code} {status_text}\r\nContent-Type: {content_type}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.as_bytes().len(),
        body
    );

    stream.write_all(response.as_bytes())?;
    stream.flush()?;
    Ok(())
}
