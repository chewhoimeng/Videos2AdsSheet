/**
 * GOOGLE APPS SCRIPT BACKEND for HYGR Creative Flow
 * VERSION: v2.1-Resumable
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', 
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', 
  SHEET_NAME: 'Sheet1'
};

/**
 * The "Listener": Handles incoming requests.
 */
function doPost(e) {
  try {
    // 1. Robust Parsing
    if (!e.postData || !e.postData.contents) {
      throw new Error("No data received");
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // 2. Handle Actions
    if (data.action === 'initialize') {
      const mime = data.mimeType || "application/octet-stream";
      const uploadUrl = getResumableUploadUrl(data.fileName, mime);
      return sendJsonResponse({ status: 'success', uploadUrl: uploadUrl, version: 'v2.1' });
      
    } else if (data.action === 'log') {
      logToSheet(data.category, data.fileId);
      return sendJsonResponse({ status: 'success', version: 'v2.1' });
      
    } else {
      // 3. Backward Compatibility (Safe Mode)
      // Check if it's the old base64 format BEFORE trying to process it
      if (data.base64Data && typeof data.base64Data === 'string') {
        const result = uploadFileLegacy(data.base64Data, data.fileName, data.category);
        return sendJsonResponse(result);
      }
      
      // If we get here, the data format is new but the action is unknown or code is mismatched
      return sendJsonResponse({ 
        status: 'error', 
        message: 'SCRIPT_OUTDATED: Please click Deploy > New Deployment in Apps Script.' 
      });
    }
    
  } catch (error) {
    return sendJsonResponse({ status: 'error', message: error.toString() });
  }
}

function sendJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

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
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, params);
  if (response.getResponseCode() === 200) {
    return response.getAllHeaders()['Location'];
  } else {
    throw new Error('Drive API Error: ' + response.getContentText());
  }
}

function logToSheet(category, fileId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  const file = DriveApp.getFileById(fileId);
  
  const nextRow = findNextUnusedRow(sheet, 9); // Check col 9 (File Name)
  
  sheet.getRange(nextRow, 1).setValue(new Date());
  sheet.getRange(nextRow, 5).setValue(category);
  sheet.getRange(nextRow, 9).setValue(file.getName());
  sheet.getRange(nextRow, 10).setValue(file.getUrl());
}

function uploadFileLegacy(base64Data, fileName, category) {
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const parts = base64Data.split(',');
  const rawBase64 = parts[1] || parts[0];
  const bytes = Utilities.base64Decode(rawBase64);
  const blob = Utilities.newBlob(bytes, 'application/octet-stream', fileName);
  const file = folder.createFile(blob);
  logToSheet(category, file.getId());
  return { status: 'success', url: file.getUrl() };
}

function findNextUnusedRow(sheet, columnNumber) {
  const maxRows = sheet.getMaxRows();
  const values = sheet.getRange(1, columnNumber, maxRows).getValues();
  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) return i + 1;
  }
  return sheet.getLastRow() + 1;
}

function doGet() {
  return HtmlService.createHtmlOutput("<h1>HYGR Creative Flow API v2.1 Active</h1>");
}