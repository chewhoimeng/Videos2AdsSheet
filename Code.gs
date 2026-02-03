/**
 * GOOGLE APPS SCRIPT BACKEND for HYGR Creative Flow
 * VERSION: v3.0-Chunked
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', 
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', 
  SHEET_NAME: 'Sheet1'
};

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("No data received");
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // ACTION 1: Initialize Upload Session
    if (data.action === 'initialize') {
      const mime = data.mimeType || "application/octet-stream";
      // We return the Upload URL to the frontend
      const uploadUrl = getResumableUploadUrl(data.fileName, mime);
      return sendJsonResponse({ 
        status: 'success', 
        uploadUrl: uploadUrl, 
        version: 'v3.0' 
      });
      
    // ACTION 2: Log Completion
    } else if (data.action === 'log') {
      logToSheet(data.category, data.fileId);
      return sendJsonResponse({ 
        status: 'success', 
        version: 'v3.0' 
      });
      
    } else {
      return sendJsonResponse({ 
        status: 'error', 
        message: 'INVALID_ACTION_OR_VERSION: Please Deploy New Version.' 
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

/**
 * Gets a Resumable Upload URL from Google Drive API.
 * This URL allows the frontend to PUT file chunks directly.
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
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": "" // Optional but good practice
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, params);
  
  if (response.getResponseCode() === 200) {
    return response.getAllHeaders()['Location'];
  } else {
    throw new Error('Drive API Init Failed: ' + response.getContentText());
  }
}

function logToSheet(category, fileId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  
  // Force a small delay to ensure Drive metadata propagation
  Utilities.sleep(1000);
  
  const file = DriveApp.getFileById(fileId);
  const nextRow = findNextUnusedRow(sheet, 9);
  
  sheet.getRange(nextRow, 1).setValue(new Date());
  sheet.getRange(nextRow, 5).setValue(category);
  sheet.getRange(nextRow, 9).setValue(file.getName());
  sheet.getRange(nextRow, 10).setValue(file.getUrl());
}

function findNextUnusedRow(sheet, columnNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 1;
  const values = sheet.getRange(1, columnNumber, lastRow).getValues();
  for (let i = 1; i < values.length; i++) {
    if (!values[i][0]) return i + 1;
  }
  return lastRow + 1;
}

function doGet() {
  return HtmlService.createHtmlOutput("<h1>HYGR Creative Flow API v3.0 Active</h1>");
}