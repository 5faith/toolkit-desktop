use exif::{Reader, Tag};
use serde::Serialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

#[derive(Serialize, Default)]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Serialize, Default)]
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

fn get_u32(exif: &exif::Exif, tag: Tag) -> Option<u32> {
    exif.get_field(tag, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0))
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
        let tag_name = field.tag.to_string();
        let val = field.display_value().to_string();
        all_fields.push(ExifField {
            tag: tag_name,
            value: val,
        });
    }
    all_fields.sort_by(|a, b| a.tag.cmp(&b.tag));
    data.all_fields = all_fields;
    data.total_tags = total;

    Ok(data)
}
