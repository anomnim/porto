// versi 5

// GANTI DENGAN ID SPREADSHEET DAN FOLDER DRIVE ANDA!
const SPREADSHEET_ID = '1K_MTCSPfS1k-CAkX8iwNM6QGRvV66SwTjPnsB2bDilE'; 
const FOLDER_ID = '1tDKY9LFxcE9ZuCNp0aMQPfUlyT11-uaa';
const SHEET_DATA_ABSENSI = 'DataAbsensi'; // Ganti nama sheet absensi
const SHEET_DATA_KARYAWAN = 'database'; // Nama sheet database karyawan

// ====================================================================
// 1. FUNGSI UTAMA & DATABASE LOADER
// ====================================================================

function doGet() {
  // Muat data karyawan dan kirim ke template HTML
  const template = HtmlService.createTemplateFromFile('Index');
  try {
    template.karyawanData = JSON.stringify(getDatabaseKaryawan());
  } catch (e) {
    Logger.log("Error saat memuat database di doGet: " + e.message);
    template.karyawanData = JSON.stringify([]); // Kirim array kosong jika gagal
  }
  return template.evaluate().setTitle('Presensi Karyawan Selfie & Validasi');
}

/**
 * Mengambil data karyawan dari sheet 'database'.
 */
function getDatabaseKaryawan() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_DATA_KARYAWAN);
  
  if (!sheet) {
    // throw new Error(`Sheet '${SHEET_DATA_KARYAWAN}' tidak ditemukan.`);
    return []; // Kembali array kosong jika sheet database tidak ditemukan
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const db = [];
  values.forEach(row => {
    // Filter berdasarkan status 'ACTIVE' dan Nama tidak kosong
    if (row[0].toString().toUpperCase() !== 'INACTIVE' && row[4] && row[4].toString().trim() !== '') {
      const record = {};
      headers.forEach((header, i) => {
        // Trim header name for consistency
        record[header.trim()] = row[i];
      });
      db.push(record);
    }
  });
  return db;
}

// ====================================================================
// 2. HELPER FUNCTIONS
// ====================================================================

/**
 * Membuat tautan Google Maps yang dapat diklik (formula HYPERLINK).
 */
function formatMapsLink(latitude, longitude) {
  if (!latitude || !longitude || latitude === 'N/A') return 'N/A';
  // Menggunakan formula Hyperlink untuk membuat link Maps
  return `=HYPERLINK("http://maps.google.com/?q=${latitude},${longitude}", "Lihat Lokasi")`;
}

/**
 * Membuat tautan URL foto Drive menjadi hyperlink di GSheet.
 */
function formatPhotoLink(url) {
  if (!url) return 'N/A';
  return `=HYPERLINK("${url}", "Lihat Foto")`;
}

/**
 * Memproses data Base64 foto dan menyimpannya ke Google Drive.
 */
function uploadFoto(base64Data, namaFile) {
  const cleanBase64 = base64Data.split(',')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), 'image/jpeg', namaFile);
  
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);
  
  // Set akses agar siapapun yang memiliki link bisa melihat (PENTING)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

// ====================================================================
// 3. FUNGSI LAYANAN: SIMPAN ABSENSI
// ====================================================================

function simpanAbsensi(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_DATA_ABSENSI); 
    
    // 1. Inisialisasi Sheet dan Header
    if (!sheet) {
      const newSheet = ss.insertSheet(SHEET_DATA_ABSENSI);
      newSheet.appendRow([
        'Timestamp Clock-In', 'Timestamp Clock-Out', 'Nama Karyawan', 'NIK OMS', 
        'Lokasi Clock-In (Link)', 'Lokasi Clock-Out (Link)',
        'Photo Clock-In', 'Photo Clock-Out' 
      ]);
      sheet = newSheet;
      // Kolom 5, 6, 7, 8 adalah Link/Formula
      sheet.getRange(2, 5, 1000, 4).setNumberFormat('@'); 
    }

    const timestamp = new Date();
    const namaKaryawan = data.nama; 
    const nikOms = data.nikOms; 
    const tipeAbsensi = data.tipeAbsensi;
    const lokasiLink = formatMapsLink(data.latitude, data.longitude);
    
    // 2. Proses Foto
    const photoUrl = uploadFoto(
      data.photoBase64, 
      `${nikOms}_${tipeAbsensi}_${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')}.jpeg`
    );
    const photoLink = formatPhotoLink(photoUrl);

    // 3. Cari Baris Terakhir (Berdasarkan Nama Karyawan)
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    if (lastRow > 1) {
      // Ambil data untuk pencarian: Timestamp Clock-In, Clock-Out, Nama Karyawan
      const dataRange = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); 
      
      for (let i = dataRange.length - 1; i >= 0; i--) {
        const rowData = dataRange[i];
        if (rowData[2] === namaKaryawan && rowData[1] === '') { // rowData[2] adalah Nama Karyawan, rowData[1] adalah Clock-Out
          targetRow = i + 2; 
          break;
        }
      }
    }
    
    // 4. LOGIKA ABSENSI
    if (tipeAbsensi === 'Clock-In') {
      if (targetRow !== -1) {
        return { success: false, message: `Error: ${namaKaryawan} sudah Clock-In dan belum Clock-Out. Silakan Clock-Out dulu.` };
      }
      
      // BUAT BARIS BARU (Clock-In)
      sheet.appendRow([
        timestamp, '', namaKaryawan, nikOms, 
        lokasiLink, '', photoLink, ''
      ]);
      return { success: true, message: `Clock-In berhasil! Waktu: ${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss')}` };

    } else if (tipeAbsensi === 'Clock-Out') {
      if (targetRow === -1) {
        return { success: false, message: `Error: ${namaKaryawan} belum Clock-In hari ini.` };
      }
      
      // PERBARUI BARIS YANG ADA (Clock-Out)
      sheet.getRange(targetRow, 2).setValue(timestamp);    // Kolom B: Timestamp Clock-Out
      sheet.getRange(targetRow, 6).setValue(lokasiLink);    // Kolom F: Lokasi Clock-Out Link
      sheet.getRange(targetRow, 8).setValue(photoLink);    // Kolom H: Photo Clock-Out Link
      
      return { success: true, message: `Clock-Out berhasil! Waktu: ${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss')}` };
    }
    
    return { success: false, message: 'Tipe absensi tidak valid.' };

  } catch (e) {
    Logger.log("Error di simpanAbsensi: " + e.message);
    return { success: false, message: 'Error Server: ' + e.message };
  }
}