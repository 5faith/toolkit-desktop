use exif::{Reader, Tag};
use quick_xml::Reader as XmlReader;
use quick_xml::events::Event;
use serde::Serialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExifData {
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub camera_serial: Option<String>,
    pub lens_model: Option<String>,
    pub lens_serial: Option<String>,
    pub focal_length: Option<String>,
    pub aperture: Option<String>,
    pub shutter_speed: Option<String>,
    pub iso: Option<String>,
    pub exposure_program: Option<String>,
    pub metering_mode: Option<String>,
    pub flash: Option<String>,
    pub white_balance: Option<String>,
    pub date_taken: Option<String>,
    pub date_original: Option<String>,
    pub date_digitized: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub gps_latitude: Option<String>,
    pub gps_longitude: Option<String>,
    pub gps_altitude: Option<String>,
    pub software: Option<String>,
    pub artist: Option<String>,
    pub copyright: Option<String>,
    pub orientation: Option<u16>,
    pub total_tags: u32,
    pub all_fields: Vec<ExifField>,
    pub xmp_fields: Vec<ExifField>,
    pub iptc_fields: Vec<ExifField>,
    pub icc_fields: Vec<ExifField>,
}

fn gps_to_dms(val_str: &str, ref_val: &str) -> String {
    let parts: Vec<&str> = val_str.splitn(3, ',').collect();
    if parts.len() < 3 {
        return format!("{} {}", val_str, ref_val);
    }
    let parse_num = |s: &str| -> f64 {
        let trimmed = s.trim();
        if trimmed.contains('/') {
            let nums: Vec<&str> = trimmed.split('/').collect();
            if nums.len() == 2 {
                let n: f64 = nums[0].trim().parse().unwrap_or(0.0);
                let d: f64 = nums[1].trim().parse().unwrap_or(1.0);
                return n / d;
            }
        }
        trimmed.parse().unwrap_or(0.0)
    };
    let d = parse_num(parts[0]);
    let m = parse_num(parts[1]);
    let s = parse_num(parts[2]);
    format!("{}°{}'{:.1}\"{}", d as u64, m as u64, s, ref_val)
}

fn get_display(exif: &exif::Exif, tag: Tag) -> Option<String> {
    exif.get_field(tag, exif::In::PRIMARY)
        .map(|f| f.display_value().to_string())
}

fn clean_tag_name(raw: &str) -> String {
    if raw.starts_with("Tag(") && raw.ends_with(')') {
        let inner = &raw[4..raw.len() - 1];
        let parts: Vec<&str> = inner.splitn(2, ", ").collect();
        if parts.len() == 2 {
            return format!("{} #{}", parts[0], parts[1]);
        }
    }
    raw.to_string()
}

fn decode_value(raw: &str) -> String {
    let trimmed = raw.trim();
    if !trimmed.contains(',') {
        return trimmed.to_string();
    }
    let parts: Vec<&str> = trimmed.split(',').collect();
    if parts.len() < 4 {
        return trimmed.to_string();
    }
    let bytes: Option<Vec<u8>> = parts
        .iter()
        .map(|s| s.trim().parse::<u8>().ok())
        .collect();
    if let Some(b) = bytes {
        if b.len() >= 4 && b.iter().all(|&x| x == 0 || x.is_ascii_graphic() || x == b' ') {
            let utf16: Vec<u16> = b
                .chunks(2)
                .filter_map(|c| {
                    if c.len() == 2 {
                        Some(u16::from_le_bytes([c[0], c[1]]))
                    } else {
                        None
                    }
                })
                .collect();
            if let Ok(s) = String::from_utf16(&utf16) {
                let cleaned: String = s.chars().filter(|c| !c.is_control() || *c == '\n').collect();
                if !cleaned.is_empty() {
                    return cleaned;
                }
            }
        }
    }
    trimmed.to_string()
}

fn get_u32(exif: &exif::Exif, tag: Tag) -> Option<u32> {
    exif.get_field(tag, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0))
}

struct RawMetadata {
    xmp_raw: Option<Vec<u8>>,
    iptc_raw: Option<Vec<u8>>,
    icc_raw: Option<Vec<u8>>,
}

fn extract_jpeg_metadata(data: &[u8]) -> RawMetadata {
    let mut result = RawMetadata {
        xmp_raw: None,
        iptc_raw: None,
        icc_raw: None,
    };

    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return result;
    }

    let mut pos = 2;
    while pos + 4 < data.len() {
        if data[pos] != 0xFF {
            break;
        }
        let marker = data[pos + 1];
        if marker == 0xD9 || marker == 0xDA {
            break;
        }
        if pos + 4 >= data.len() {
            break;
        }
        let seg_len = ((data[pos + 2] as usize) << 8) | (data[pos + 3] as usize);
        if seg_len < 2 || pos + 2 + seg_len > data.len() {
            break;
        }
        let seg_data = &data[pos + 4..pos + 2 + seg_len];

        match marker {
            0xE0 => {}
            0xE1 => {
                let xmp_header = b"http://ns.adobe.com/xap/1.0/\0";
                if seg_data.len() > xmp_header.len()
                    && seg_data[..xmp_header.len()] == *xmp_header
                {
                    let xmp_data = &seg_data[xmp_header.len()..];
                    result.xmp_raw = Some(xmp_data.to_vec());
                }
            }
            0xE2 => {
                let icc_header = b"ICC_PROFILE";
                if seg_data.len() > icc_header.len()
                    && seg_data[..icc_header.len()] == *icc_header
                {
                    let offset = 12 + 1;
                    if offset < seg_data.len() {
                        if let Some(ref mut existing) = result.icc_raw {
                            existing.extend_from_slice(&seg_data[offset..]);
                        } else {
                            result.icc_raw = Some(seg_data[offset..].to_vec());
                        }
                    }
                }
            }
            0xED => {
                let ps_header = b"Photoshop 28.0";
                if seg_data.len() > ps_header.len()
                    && seg_data[..ps_header.len()] == *ps_header
                {
                    let offset = 14 + 1;
                    if offset < seg_data.len() {
                        result.iptc_raw = Some(seg_data[offset..].to_vec());
                    }
                }
            }
            _ => {}
        }

        pos += 2 + seg_len;
    }

    result
}

fn extract_png_metadata(data: &[u8]) -> RawMetadata {
    let mut result = RawMetadata {
        xmp_raw: None,
        iptc_raw: None,
        icc_raw: None,
    };

    if data.len() < 8 || data[..8] != [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
        return result;
    }

    let mut pos = 8;
    while pos + 12 <= data.len() {
        let len = u32::from_be_bytes([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]) as usize;
        if pos + 12 + len > data.len() {
            break;
        }
        let chunk_type = &data[pos + 4..pos + 8];
        let chunk_data = &data[pos + 8..pos + 8 + len];

        match chunk_type {
            b"iTXt" => {
                if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                    let keyword = &chunk_data[..null_pos];
                    if keyword == b"XML:com.adobe.xmp" && null_pos + 2 < chunk_data.len() {
                        let compression_flag = chunk_data[null_pos + 1];
                        if compression_flag == 0 {
                            let mut cursor = null_pos + 2;
                            while cursor < chunk_data.len() && chunk_data[cursor] != 0 {
                                cursor += 1;
                            }
                            cursor += 1;
                            while cursor < chunk_data.len() && chunk_data[cursor] != 0 {
                                cursor += 1;
                            }
                            cursor += 1;
                            if cursor < chunk_data.len() {
                                result.xmp_raw = Some(chunk_data[cursor..].to_vec());
                            }
                        }
                    }
                }
            }
            b"iCCP" => {
                if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                    let start = null_pos + 1 + 2;
                    if start < chunk_data.len() {
                        result.icc_raw = Some(chunk_data[start..].to_vec());
                    }
                }
            }
            _ => {}
        }

        pos += 12 + len;
    }

    result
}

fn extract_webp_metadata(data: &[u8]) -> RawMetadata {
    let mut result = RawMetadata {
        xmp_raw: None,
        iptc_raw: None,
        icc_raw: None,
    };

    if data.len() < 12
        || data[0..4] != [0x52, 0x49, 0x46, 0x46]
        || data[8..12] != [0x57, 0x45, 0x42, 0x50]
    {
        return result;
    }

    let mut pos = 12;
    while pos + 8 <= data.len() {
        let chunk_size =
            u32::from_be_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]])
                as usize;
        if pos + 8 + chunk_size > data.len() {
            break;
        }
        let chunk_id = &data[pos..pos + 4];
        let chunk_data = &data[pos + 8..pos + 8 + chunk_size];

        match chunk_id {
            b"XMP " => {
                result.xmp_raw = Some(chunk_data.to_vec());
            }
            b"ICCP" => {
                result.icc_raw = Some(chunk_data.to_vec());
            }
            _ => {}
        }

        pos += 8 + chunk_size;
        if chunk_size % 2 != 0 {
            pos += 1;
        }
    }

    result
}

fn extract_metadata(data: &[u8]) -> RawMetadata {
    if data.len() < 4 {
        return RawMetadata {
            xmp_raw: None,
            iptc_raw: None,
            icc_raw: None,
        };
    }

    if data[0] == 0xFF && data[1] == 0xD8 {
        return extract_jpeg_metadata(data);
    }
    if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
        return extract_png_metadata(data);
    }
    if data.len() >= 12
        && data[0..4] == [0x52, 0x49, 0x46, 0x46]
        && data[8..12] == [0x57, 0x45, 0x42, 0x50]
    {
        return extract_webp_metadata(data);
    }

    RawMetadata {
        xmp_raw: None,
        iptc_raw: None,
        icc_raw: None,
    }
}

const IPTC_TAG_NAMES: &[(u8, u8, &str)] = &[
    (2, 0, "Record Version"),
    (2, 5, "Object Name"),
    (2, 7, "Edit Status"),
    (2, 10, "Urgency"),
    (2, 12, "Subject Reference"),
    (2, 15, "Category"),
    (2, 20, "Supplemental Category"),
    (2, 22, "Fixture Identifier"),
    (2, 25, "Keywords"),
    (2, 26, "Content Location Code"),
    (2, 27, "Content Location Name"),
    (2, 30, "Release Date"),
    (2, 35, "Release Time"),
    (2, 40, "Instructions"),
    (2, 55, "Date Created"),
    (2, 60, "Time Created"),
    (2, 62, "Creation Time"),
    (2, 65, "By-line"),
    (2, 70, "City"),
    (2, 75, "Sub-location"),
    (2, 80, "By-line Title"),
    (2, 85, "Province/State"),
    (2, 90, "Country/Location"),
    (2, 92, "Original Transmission Reference"),
    (2, 95, "Headline"),
    (2, 100, "Program"),
    (2, 101, "Country Code"),
    (2, 103, "Reference Number"),
    (2, 105, "Headline"),
    (2, 110, "Source"),
    (2, 115, "Credit"),
    (2, 116, "Copyright"),
    (2, 118, "Contact"),
    (2, 120, "Caption"),
    (2, 122, "Writer/Editor"),
    (2, 130, "Image Type"),
    (2, 131, "Image Orientation"),
    (2, 135, "Language Identifier"),
];

fn parse_iptc(data: &[u8]) -> Vec<ExifField> {
    let mut fields: Vec<ExifField> = Vec::new();
    let mut i = 0;
    while i + 5 < data.len() {
        if data[i] != 0x1C {
            i += 1;
            continue;
        }
        let record = data[i + 1];
        let dataset = data[i + 2];
        let len = ((data[i + 3] as usize) << 8) | (data[i + 4] as usize);
        if i + 5 + len > data.len() {
            break;
        }
        let value_data = &data[i + 5..i + 5 + len];

        let tag_name = IPTC_TAG_NAMES
            .iter()
            .find(|&&(r, d, _)| r == record && d == dataset)
            .map(|&(_, _, name)| name)
            .unwrap_or("Unknown");

        let value = if dataset == 90 && record == 2 {
            let parts: Vec<String> = value_data
                .split(|&b| b == b',')
                .map(|p| String::from_utf8_lossy(p).trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            parts.join(", ")
        } else {
            String::from_utf8_lossy(value_data).trim().to_string()
        };

        fields.push(ExifField {
            tag: format!("{} ({}:{})", tag_name, record, dataset),
            value,
        });

        i += 5 + len;
    }

    fields.sort_by(|a, b| a.tag.cmp(&b.tag));
    fields
}

fn parse_xmp(data: &[u8]) -> Vec<ExifField> {
    let xml_str = match std::str::from_utf8(data) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let mut fields: Vec<ExifField> = Vec::new();
    let mut tag_map: HashMap<String, String> = HashMap::new();

    let mut reader = XmlReader::from_str(xml_str);
    let mut buf = Vec::new();
    let mut current_tag: Option<String> = None;
    let mut current_text = String::new();
    let mut in_list = false;
    let mut list_values: Vec<String> = Vec::new();
    let mut list_tag: Option<String> = None;

    let rdf_ns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = tag_name.split(':').last().unwrap_or(&tag_name).to_string();

                let is_rdf_bag = local_name == "Bag" || local_name == "Seq" || local_name == "Alt";
                if is_rdf_bag {
                    in_list = true;
                    list_values.clear();
                    continue;
                }

                if local_name == "li" && in_list {
                    current_text.clear();
                    current_tag = Some("li".to_string());
                    continue;
                }

                let mut attrs: HashMap<String, String> = HashMap::new();
                for attr in e.attributes().flatten() {
                    let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                    let val = String::from_utf8_lossy(&attr.value).to_string();
                    attrs.insert(key, val);
                }

                let is_description = local_name == "Description";
                if is_description {
                    for (key, val) in &attrs {
                        if key == "rdf:about" || key.starts_with("xmlns:") {
                            continue;
                        }
                        let full_key = key.clone();
                        let local = full_key.split(':').last().unwrap_or(&full_key).to_string();
                        if !val.is_empty() {
                            tag_map.insert(local, val.clone());
                        }
                    }
                    continue;
                }

                if local_name == "RDF" || local_name == "Description" {
                    continue;
                }

                if let Some(rdf_resource) = attrs.get("rdf:resource") {
                    if !rdf_resource.is_empty() {
                        tag_map.insert(local_name, rdf_resource.clone());
                    }
                    continue;
                }

                current_tag = Some(local_name);
                current_text.clear();
            }
            Ok(Event::Empty(e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = tag_name.split(':').last().unwrap_or(&tag_name).to_string();

                let mut attrs: HashMap<String, String> = HashMap::new();
                for attr in e.attributes().flatten() {
                    let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                    let val = String::from_utf8_lossy(&attr.value).to_string();
                    attrs.insert(key, val);
                }

                if local_name == "li" && in_list {
                    if let Some(text) = attrs.get(rdf_ns) {
                        if !text.is_empty() {
                            list_values.push(text.clone());
                        }
                    } else if let Some(text) = attrs.get("") {
                        if !text.is_empty() {
                            list_values.push(text.clone());
                        }
                    }
                    continue;
                }

                if let Some(rdf_resource) = attrs.get("rdf:resource") {
                    if !rdf_resource.is_empty() {
                        tag_map.insert(local_name, rdf_resource.clone());
                    }
                } else {
                    for (key, val) in &attrs {
                        if key == "rdf:about" || key.starts_with("xmlns:") || key.starts_with("rdf:") {
                            continue;
                        }
                        let local = key.split(':').last().unwrap_or(key).to_string();
                        if !val.is_empty() {
                            tag_map.insert(local, val.clone());
                        }
                    }
                }
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default().to_string();
                if !text.trim().is_empty() {
                    current_text.push_str(&text);
                }
            }
            Ok(Event::CData(e)) => {
                let text = String::from_utf8_lossy(&e).to_string();
                current_text.push_str(&text);
            }
            Ok(Event::End(e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = tag_name.split(':').last().unwrap_or(&tag_name).to_string();

                if local_name == "li" && in_list {
                    let val = current_text.trim().to_string();
                    current_text.clear();
                    current_tag = None;
                    if !val.is_empty() {
                        list_values.push(val);
                    }
                    continue;
                }

                let is_list_end = local_name == "Bag" || local_name == "Seq" || local_name == "Alt";
                if is_list_end && in_list {
                    in_list = false;
                    if let Some(tag) = list_tag.take() {
                        if !list_values.is_empty() {
                            tag_map.insert(tag, list_values.join(", "));
                        }
                    }
                    list_values.clear();
                    continue;
                }

                if let Some(tag) = current_tag.take() {
                    let value = current_text.trim().to_string();
                    current_text.clear();
                    if !value.is_empty() {
                        tag_map.insert(tag, value);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    let display_names: HashMap<&str, &str> = [
        ("format", "Format"),
        ("type", "Type"),
        ("title", "Title"),
        ("description", "Description"),
        ("subject", "Keywords"),
        ("creator", "Creator"),
        ("rights", "Rights"),
        ("publisher", "Publisher"),
        ("contributor", "Contributor"),
        ("date", "Date"),
        ("identifier", "Identifier"),
        ("source", "Source"),
        ("language", "Language"),
        ("relation", "Relation"),
        ("coverage", "Coverage"),
        ("rating", "Rating"),
        ("label", "Label"),
        ("CreateDate", "Create Date"),
        ("ModifyDate", "Modify Date"),
        ("MetadataDate", "Metadata Date"),
        ("CreatorTool", "Creator Tool"),
        ("InstanceID", "Instance ID"),
        ("DocumentID", "Document ID"),
        ("OriginalDocumentID", "Original Document ID"),
        ("History", "History"),
        ("Nickname", "Nickname"),
        ("HierarchicalSubject", "Hierarchical Keywords"),
        ("WebStatement", "Web Statement"),
        ("Marked", "Marked"),
        ("DateAcquired", "Date Acquired"),
        ("RatingPercent", "Rating Percent"),
        ("Lens", "Lens"),
        ("Flash", "Flash"),
        ("FNumber", "F-Number"),
        ("ExposureTime", "Exposure Time"),
        ("FocalLength", "Focal Length"),
        ("ISOSpeedRatings", "ISO Speed"),
        ("ExposureProgram", "Exposure Program"),
        ("WhiteBalance", "White Balance"),
        ("MeteringMode", "Metering Mode"),
        ("Software", "Software"),
        ("Make", "Camera Make"),
        ("Model", "Camera Model"),
        ("Artist", "Artist"),
        ("Copyright", "Copyright"),
        ("DateTimeOriginal", "Date/Time Original"),
        ("ImageWidth", "Image Width"),
        ("ImageHeight", "Image Height"),
        ("Orientation", "Orientation"),
        ("ColorSpace", "Color Space"),
        ("PixelXDimension", "Pixel X Dimension"),
        ("PixelYDimension", "Pixel Y Dimension"),
        ("BitsPerSample", "Bits Per Sample"),
        ("PhotometricInterpretation", "Photometric Interpretation"),
        ("Compression", "Compression"),
        ("PhotographicSensitivity", "ISO"),
        ("ExposureBiasValue", "Exposure Bias"),
        ("MaxApertureValue", "Max Aperture"),
        ("SubjectDistance", "Subject Distance"),
        ("SceneCaptureType", "Scene Capture Type"),
        ("GainControl", "Gain Control"),
        ("Contrast", "Contrast"),
        ("Saturation", "Saturation"),
        ("Sharpness", "Sharpness"),
        ("CustomRendered", "Custom Rendered"),
        ("DigitalZoomRatio", "Digital Zoom"),
        ("FocalLengthIn35mmFilm", "Focal Length (35mm)"),
        ("LensMake", "Lens Make"),
        ("LensModel", "Lens Model"),
        ("LensSerialNumber", "Lens Serial"),
        ("BodySerialNumber", "Camera Serial"),
        ("FileSource", "File Source"),
        ("SceneType", "Scene Type"),
        ("ExifVersion", "EXIF Version"),
        ("FlashpixVersion", "Flashpix Version"),
        ("SensingMethod", "Sensing Method"),
        ("CFAPattern", "CFA Pattern"),
        ("InteropIndex", "Interop Index"),
        ("InteropVersion", "Interop Version"),
        ("ThumbnailOffset", "Thumbnail Offset"),
        ("ThumbnailLength", "Thumbnail Length"),
        ("GPSLatitude", "GPS Latitude"),
        ("GPSLongitude", "GPS Longitude"),
        ("GPSAltitude", "GPS Altitude"),
        ("GPSLatitudeRef", "GPS Latitude Ref"),
        ("GPSLongitudeRef", "GPS Longitude Ref"),
        ("GPSAltitudeRef", "GPS Altitude Ref"),
        ("GPSTimeStamp", "GPS Time Stamp"),
        ("GPSDateStamp", "GPS Date Stamp"),
        ("GPSStatus", "GPS Status"),
        ("GPSMapDatum", "GPS Map Datum"),
        ("GPSVersionID", "GPS Version"),
    ]
    .iter()
    .cloned()
    .collect();

    let mut sorted_keys: Vec<String> = tag_map.keys().cloned().collect();
    sorted_keys.sort();

    for key in sorted_keys {
        let value = &tag_map[&key];
        let key_str = key.as_str();
        let display_name = display_names
            .get(key_str)
            .unwrap_or(&key_str);
        fields.push(ExifField {
            tag: display_name.to_string(),
            value: value.to_string(),
        });
    }

    fields
}

fn parse_icc_profile(data: &[u8]) -> Vec<ExifField> {
    let mut fields: Vec<ExifField> = Vec::new();

    if data.len() < 128 {
        return fields;
    }

    let profile_size = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
    fields.push(ExifField {
        tag: "Profile Size".to_string(),
        value: format!("{} bytes", profile_size),
    });

    let cmm = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
    let cmm_str = format!(
        "{}{}{}{}",
        (cmm >> 24) as u8 as char,
        ((cmm >> 16) & 0xFF) as u8 as char,
        ((cmm >> 8) & 0xFF) as u8 as char,
        (cmm & 0xFF) as u8 as char
    );
    fields.push(ExifField {
        tag: "CMM Type".to_string(),
        value: cmm_str,
    });

    let version = u32::from_be_bytes([data[8], data[9], data[10], data[11]]);
    let major = version >> 24;
    let minor = (version >> 16) & 0xFF;
    let patch = (version >> 8) & 0xFF;
    fields.push(ExifField {
        tag: "Profile Version".to_string(),
        value: format!("{}.{}.{}", major, minor, patch),
    });

    let class = u32::from_be_bytes([data[12], data[13], data[14], data[15]]);
    let class_str = format!(
        "{}{}{}{}",
        (class >> 24) as u8 as char,
        ((class >> 16) & 0xFF) as u8 as char,
        ((class >> 8) & 0xFF) as u8 as char,
        (class & 0xFF) as u8 as char
    );
    let class_desc = match class_str.as_str() {
        "scnr" => "Input Device",
        "mntr" => "Display Device",
        "link" => "Device Link",
        "abst" => "Abstract",
        "nmcl" => "Named Color",
        "spac" => "ColorSpace Conversion",
        "devc" => "Device Mismatch",
        _ => "Unknown",
    };
    fields.push(ExifField {
        tag: "Profile Class".to_string(),
        value: format!("{} ({})", class_str, class_desc),
    });

    let color_space = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
    let cs_str = format!(
        "{}{}{}{}",
        (color_space >> 24) as u8 as char,
        ((color_space >> 16) & 0xFF) as u8 as char,
        ((color_space >> 8) & 0xFF) as u8 as char,
        (color_space & 0xFF) as u8 as char
    );
    let cs_desc = match cs_str.as_str() {
        "RGB " => "RGB",
        "CMYK" => "CMYK",
        "GRAY" => "Grayscale",
        "Lab " => "CIE Lab",
        "XYZ " => "CIE XYZ",
        "YCbr" => "YCbCr",
        "HSV " => "HSV",
        "HLS " => "HLS",
        _ => "Unknown",
    };
    fields.push(ExifField {
        tag: "Color Space".to_string(),
        value: format!("{} ({})", cs_str, cs_desc),
    });

    if data.len() >= 24 {
        let pcs = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
        let pcs_str = format!(
            "{}{}{}{}",
            (pcs >> 24) as u8 as char,
            ((pcs >> 16) & 0xFF) as u8 as char,
            ((pcs >> 8) & 0xFF) as u8 as char,
            (pcs & 0xFF) as u8 as char
        );
        fields.push(ExifField {
            tag: "Profile Connection Space".to_string(),
            value: pcs_str,
        });
    }

    if data.len() >= 44 {
        let date = &data[24..32];
        let year = u16::from_be_bytes([date[0], date[1]]);
        let month = date[2];
        let day = date[3];
        let hour = date[4];
        let minute = date[5];
        let second = date[6];
        fields.push(ExifField {
            tag: "Profile Date/Time".to_string(),
            value: format!(
                "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
                year, month, day, hour, minute, second
            ),
        });
    }

    if data.len() >= 48 {
        let platform = u32::from_be_bytes([data[40], data[41], data[42], data[43]]);
        let plat_str = format!(
            "{}{}{}{}",
            (platform >> 24) as u8 as char,
            ((platform >> 16) & 0xFF) as u8 as char,
            ((platform >> 8) & 0xFF) as u8 as char,
            (platform & 0xFF) as u8 as char
        );
        let plat_desc = match plat_str.as_str() {
            "APPL" => "Apple",
            "MSFT" => "Microsoft",
            "SGI " => "SGI",
            "sunw" => "Sun Microsystems",
            "1345" => "Gravity",
            _ => "Unknown",
        };
        fields.push(ExifField {
            tag: "Platform".to_string(),
            value: format!("{} ({})", plat_str, plat_desc),
        });
    }

    if data.len() >= 68 {
        let flags = u32::from_be_bytes([data[64], data[65], data[66], data[67]]);
        let mut options = Vec::new();
        if flags & 1 == 0 {
            options.push("Embedded");
        }
        if flags & 2 != 0 {
            options.push("Can be Used Independently");
        }
        if options.is_empty() {
            options.push("None");
        }
        fields.push(ExifField {
            tag: "Flags".to_string(),
            value: options.join(", "),
        });
    }

    if data.len() >= 84 {
        let rendering = u32::from_be_bytes([data[68], data[69], data[70], data[71]]);
        let render_desc = match rendering {
            0 => "Perceptual",
            1 => "Relative Colorimetric",
            2 => "Saturation",
            3 => "Absolute Colorimetric",
            _ => "Unknown",
        };
        fields.push(ExifField {
            tag: "Rendering Intent".to_string(),
            value: format!("{} ({})", rendering, render_desc),
        });

        let illuminant_x = i32::from_be_bytes([data[72], data[73], data[74], data[75]]);
        let illuminant_y = i32::from_be_bytes([data[76], data[77], data[78], data[79]]);
        let illuminant_z = i32::from_be_bytes([data[80], data[81], data[82], data[83]]);
        let to_f64 = |v: i32| v as f64 / 65536.0;
        fields.push(ExifField {
            tag: "Illuminant".to_string(),
            value: format!(
                "X={:.4} Y={:.4} Z={:.4}",
                to_f64(illuminant_x),
                to_f64(illuminant_y),
                to_f64(illuminant_z)
            ),
        });
    }

    if data.len() >= 128 {
        let mut name_bytes = Vec::new();
        for &b in &data[44..64] {
            if b != 0 {
                name_bytes.push(b);
            }
        }
        if !name_bytes.is_empty() {
            if let Ok(name) = String::from_utf8(name_bytes) {
                fields.push(ExifField {
                    tag: "Device Manufacturer".to_string(),
                    value: name.trim().to_string(),
                });
            }
        }

        let mut model_bytes = Vec::new();
        for &b in &data[68..104] {
            if b != 0 {
                model_bytes.push(b);
            }
        }
        if !model_bytes.is_empty() {
            if let Ok(model) = String::from_utf8(model_bytes) {
                fields.push(ExifField {
                    tag: "Device Model".to_string(),
                    value: model.trim().to_string(),
                });
            }
        }
    }

    fields
}

#[tauri::command]
pub fn read_image_exif(path: &str) -> Result<ExifData, String> {
    let file = File::open(Path::new(path)).map_err(|e| e.to_string())?;
    let mut buf_reader = BufReader::new(file);
    let exif_reader = Reader::new();
    let exif = exif_reader
        .read_from_container(&mut buf_reader)
        .map_err(|e| e.to_string())?;

    let mut data = ExifData::default();

    data.camera_make = get_display(&exif, Tag::Make);
    data.camera_model = get_display(&exif, Tag::Model);
    data.camera_serial = get_display(&exif, Tag::BodySerialNumber);
    data.lens_model = get_display(&exif, Tag::LensModel);
    data.lens_serial = get_display(&exif, Tag::LensSerialNumber);

    if let Some(val) = get_display(&exif, Tag::FocalLength) {
        data.focal_length = Some(format!("{}mm", val));
    }
    if let Some(val) = get_display(&exif, Tag::FNumber) {
        data.aperture = Some(format!("f/{}", val));
    }
    data.shutter_speed = get_display(&exif, Tag::ExposureTime);
    data.iso = get_display(&exif, Tag::ISOSpeed);
    data.exposure_program = get_display(&exif, Tag::ExposureProgram);
    data.metering_mode = get_display(&exif, Tag::MeteringMode);
    data.flash = get_display(&exif, Tag::Flash);
    data.white_balance = get_display(&exif, Tag::WhiteBalance);

    data.date_taken = get_display(&exif, Tag::DateTimeOriginal);
    data.date_original = get_display(&exif, Tag::DateTimeDigitized);
    data.date_digitized = get_display(&exif, Tag::DateTime);

    data.width = get_u32(&exif, Tag::ImageWidth);
    data.height = get_u32(&exif, Tag::ImageLength);
    data.orientation = get_u32(&exif, Tag::Orientation).map(|v| v as u16);

    data.software = get_display(&exif, Tag::Software);
    data.artist = get_display(&exif, Tag::Artist);
    data.copyright = get_display(&exif, Tag::Copyright);

    if let (Some(lat_str), Some(lon_str)) = (
        get_display(&exif, Tag::GPSLatitude),
        get_display(&exif, Tag::GPSLongitude),
    ) {
        if let (Some(lat_ref), Some(lon_ref)) = (
            get_display(&exif, Tag::GPSLatitudeRef),
            get_display(&exif, Tag::GPSLongitudeRef),
        ) {
            data.gps_latitude = Some(gps_to_dms(&lat_str, &lat_ref));
            data.gps_longitude = Some(gps_to_dms(&lon_str, &lon_ref));
        }
    }
    data.gps_altitude = get_display(&exif, Tag::GPSAltitude);

    let mut all_fields: Vec<ExifField> = Vec::new();
    let mut total: u32 = 0;
    for field in exif.fields() {
        total += 1;
        let tag_name = clean_tag_name(&field.tag.to_string());
        let raw = field.display_value().to_string();
        let val = decode_value(&raw);
        all_fields.push(ExifField {
            tag: tag_name,
            value: val,
        });
    }
    all_fields.sort_by(|a, b| a.tag.cmp(&b.tag));
    data.all_fields = all_fields;

    let raw_bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let metadata = extract_metadata(&raw_bytes);

    if let Some(ref xmp_data) = metadata.xmp_raw {
        data.xmp_fields = parse_xmp(xmp_data);
        total += data.xmp_fields.len() as u32;
    }

    if let Some(ref iptc_data) = metadata.iptc_raw {
        data.iptc_fields = parse_iptc(iptc_data);
        total += data.iptc_fields.len() as u32;
    }

    if let Some(ref icc_data) = metadata.icc_raw {
        data.icc_fields = parse_icc_profile(icc_data);
        total += data.icc_fields.len() as u32;
    }

    data.total_tags = total;

    Ok(data)
}
