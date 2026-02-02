/**
 * GOOGLE APPS SCRIPT BACKEND for HYGR Creative Flow
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', // The ID of your Google Drive folder
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', // Your Tracking spreadsheet
  SHEET_NAME: 'Sheet1'
};

/**
 * The "Listener": Handles incoming requests.
 * Supports two actions: 'initialize' (get upload URL) and 'log' (save to sheet).
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'initialize') {
      // Step 1: Get a Resumable Upload URL from Google Drive
      // Default to binary stream if mimeType is missing to avoid API errors
      const mime = data.mimeType || "application/octet-stream";
      const uploadUrl = getResumableUploadUrl(data.fileName, mime);
      return sendJsonResponse({ status: 'success', uploadUrl: uploadUrl });
      
    } else if (data.action === 'log') {
      // Step 3: Log the completed upload to the Sheet
      logToSheet(data.category, data.fileId);
      return sendJsonResponse({ status: 'success' });
      
    } else {
      // Fallback: Old Base64 method (Legacy support, max 50MB)
      if (data.base64Data) {
        const result = uploadFileLegacy(data.base64Data, data.fileName, data.category);
        return sendJsonResponse(result);
      }
      throw new Error("Unknown action. Please deploy the latest version of the script.");
    }
    
  } catch (error) {
    return sendJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Helper to send JSON response with CORS support
 */
function sendJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Step 1: Call Drive API to initiate a resumable upload session.
 * Returns a URL that the client can PUT the file content to directly.
 */
function getResumableUploadUrl(fileName, mimeType) {
  const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
  
  const payload = {
    "name": fileName,
    "mimeType": mimeType,
    "parents": [CONFIG.FOLDER_ID]
  };

  const params = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, params);
  
  if (response.getResponseCode() === 200) {
    // The upload URL is in the 'Location' header
    return response.getAllHeaders()['Location'];
  } else {
    throw new Error('Failed to initiate upload: ' + response.getContentText());
  }
}

/**
 * Step 3: Log details to sheet after client finishes upload.
 * We fetch the file metadata using the ID to ensure it exists.
 */
function logToSheet(category, fileId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  
  // Get file details from Drive to ensure accuracy
  const file = DriveApp.getFileById(fileId);
  const fileName = file.getName();
  const fileUrl = file.getUrl();

  // Find next empty row in Column 9 (File Name)
  const nextRow = findNextUnusedRow(sheet, 9); 
  
  // Column A (1): Upload Timestamp
  sheet.getRange(nextRow, 1).setValue(new Date());
  
  // Column E (5): Product (Category)
  sheet.getRange(nextRow, 5).setValue(category);
  
  // Column I (9): File Name
  sheet.getRange(nextRow, 9).setValue(fileName);
  
  // Column J (10): Drive Link
  sheet.getRange(nextRow, 10).setValue(fileUrl);
}

/**
 * Legacy Base64 Upload (Backup)
 */
function uploadFileLegacy(base64Data, fileName, category) {
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const parts = base64Data.split(',');
  const contentType = parts[0].substring(parts[0].indexOf(":") + 1, parts[0].indexOf(";"));
  const rawBase64 = parts[1] || parts[0];
  const bytes = Utilities.base64Decode(rawBase64);
  const blob = Utilities.newBlob(bytes, contentType, fileName);
  const file = folder.createFile(blob);
  logToSheet(category, file.getId());
  return { status: 'success', url: file.getUrl() };
}

/**
 * Helper to find the first truly empty row in a specific column.
 */
function findNextUnusedRow(sheet, columnNumber) {
  const maxRows = sheet.getMaxRows();
  const values = sheet.getRange(1, columnNumber, maxRows).getValues();
  for (let i = 1; i < values.length; i++) {
    const cellValue = values[i][0];
    if (cellValue === "" || cellValue === null || cellValue === undefined) {
      return i + 1; 
    }
  }
  return sheet.getLastRow() + 1;
}

function doGet() {
  return HtmlService.createHtmlOutput("<h1>HYGR Creative Flow API Active</h1>");
}