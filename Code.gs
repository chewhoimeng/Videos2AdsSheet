/**
 * HYGR Creative Flow - Backend v11.0 (Native Sync)
 * 
 * FEATURES:
 * - Direct Drive Scanning (Bypasses upload timeouts)
 * - Auto-Logging to Sheets
 * - Idempotent Logging (Prevents duplicates)
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', 
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', 
  SHEET_NAME: 'Sheet1'
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload detected.' });
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // ACTION: SCAN (New Method)
    // Checks if a file exists in Drive, and logs it if found.
    if (data.action === 'scan') {
      return checkDriveAndLog(data.fileName, data.category);
    }
    
    // ACTION: LOG (Legacy Method)
    else if (data.action === 'log') {
      return logToSheet(data.category, data.fileId);
    }
    
    return createResponse({ status: 'error', message: 'Invalid Action' });
    
  } catch (err) {
    return createResponse({ status: 'error', message: 'System Error: ' + err.toString() });
  }
}

/**
 * Scans the specific folder for a filename. 
 * If found (and created recently), logs it to the sheet.
 */
function checkDriveAndLog(fileName, category) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const files = folder.getFilesByName(fileName);
    
    if (files.hasNext()) {
      const file = files.next();
      
      // Safety Check: Only accept files created in the last 60 minutes
      // This prevents matching with an old file named "Test.mp4" from last year.
      const now = new Date();
      const created = file.getDateCreated();
      const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
      
      if (diffMinutes < 60) {
        // Log it!
        const logResult = logToSheet(category, file.getId());
        
        return createResponse({
          status: 'found',
          fileId: file.getId(),
          fileUrl: file.getUrl(),
          message: 'File detected and synced.'
        });
      }
    }
    
    // Not found yet
    return createResponse({ status: 'pending', message: 'File not yet visible in Drive.' });
    
  } catch (e) {
    return createResponse({ status: 'error', message: e.toString() });
  }
}

function logToSheet(category, fileId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  
  // 1. Check for duplicates to avoid spamming the sheet during polling
  // We check the last 20 rows for this File ID
  const lastRow = sheet.getLastRow();
  if (lastRow > 0) {
    // Column J is the 10th column (File Link), let's just check ID or Name
    // Actually, checking URL is safer. 
    const file = DriveApp.getFileById(fileId);
    const fileUrl = file.getUrl();
    
    const checkRange = sheet.getRange(Math.max(1, lastRow - 20), 10, Math.min(20, lastRow), 1);
    const values = checkRange.getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == fileUrl) {
        return { status: 'success', note: 'Already logged' };
      }
    }
    
    // 2. Append if new
    const nextRow = lastRow + 1;
    const timestamp = new Date();
    
    const rowData = [
      timestamp,           // A: Date
      "",                  // B
      "",                  // C
      "",                  // D
      category || "General", // E: Category
      "",                  // F
      "",                  // G
      "",                  // H
      file.getName(),      // I: File Name
      fileUrl              // J: File Link
    ];
    
    sheet.appendRow(rowData);
    return { status: 'success' };
  } else {
    // Empty sheet case
     const file = DriveApp.getFileById(fileId);
     sheet.appendRow([new Date(), "","","",category,"","","","", file.getName(), file.getUrl()]);
     return { status: 'success' };
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return createResponse({ status: 'active', version: '11.0' });
}