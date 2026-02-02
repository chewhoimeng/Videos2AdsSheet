/**
 * GOOGLE APPS SCRIPT BACKEND for HYGR Creative Flow
 */

const CONFIG = {
  FOLDER_ID: '1d5IKLcxv2EUkLG0BgZNYU6grqO-wNmsV', // The ID of your Google Drive folder
  SPREADSHEET_ID: '1kRB9rySIvEgh2H01efUkeUeFtlsD2nUpaJBJuYWQJVQ', // Your Tracking spreadsheet
  SHEET_NAME: 'Sheet1'
};

/**
 * The "Listener": This function catches the data sent from your Vercel website.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = uploadFile(data.base64Data, data.fileName, data.category);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main function to process the file and save it.
 */
function uploadFile(base64Data, fileName, category) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    
    // Convert the data string back into a real video file
    const parts = base64Data.split(',');
    const contentType = parts[0].substring(parts[0].indexOf(":") + 1, parts[0].indexOf(";"));
    const rawBase64 = parts[1] || parts[0];
    
    const bytes = Utilities.base64Decode(rawBase64);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    // 1. Create the file in your specific Google Drive folder
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();
    
    // 2. Log the record to your Google Sheet
    logToSheet(category, fileUrl);
    
    return {
      status: 'success',
      url: fileUrl
    };
  } catch (error) {
    console.error(error);
    throw new Error('Upload failed: ' + error.toString());
  }
}

/**
 * Appends the upload record to the spreadsheet.
 */
function logToSheet(category, fileUrl) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
    
    // Adds a new row with: Date, Category, and the Drive Link
    sheet.appendRow([
      new Date(),
      category,
      fileUrl
    ]);
  } catch (e) {
    console.error("Sheet logging failed", e);
  }
}

/**
 * Required to allow the script to be used as a Web App.
 */
function doGet() {
  return HtmlService.createHtmlOutput("<h1>HYGR Creative Flow API is Active</h1>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}