/**
 * HYGR Creative Flow - Backend v14.0 (Auto-Sync)
 * 
 * FEATURES:
 * - Time-Driven Automation (Runs every minute)
 * - Remote Trigger Management
 * - Filename Parsing (Category extraction)
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', 
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', 
  SHEET_NAME: 'Sheet1',
  TRIGGER_FUNCTION: 'syncRecentFiles'
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload.' });
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // ACTION: CHECK STATUS
    if (data.action === 'checkStatus') {
      const triggers = ScriptApp.getProjectTriggers();
      const isActive = triggers.some(t => t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION);
      return createResponse({ status: isActive ? 'active' : 'inactive' });
    }
    
    // ACTION: START SYNC SERVICE
    if (data.action === 'startSync') {
      // clear existing to avoid duplicates
      const triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(t => {
        if(t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION) ScriptApp.deleteTrigger(t);
      });
      
      // Create new 1-minute trigger
      ScriptApp.newTrigger(CONFIG.TRIGGER_FUNCTION)
               .timeBased()
               .everyMinutes(1)
               .create();
               
      return createResponse({ status: 'success', message: 'Service Started' });
    }
    
    // ACTION: STOP SYNC SERVICE
    if (data.action === 'stopSync') {
      const triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(t => {
        if(t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION) ScriptApp.deleteTrigger(t);
      });
      return createResponse({ status: 'success', message: 'Service Stopped' });
    }

    // ACTION: FORCE SYNC (Manual run)
    if (data.action === 'forceSync') {
      syncRecentFiles();
      return createResponse({ status: 'success', message: 'Scan Completed' });
    }
    
    return createResponse({ status: 'error', message: 'Invalid Action v14.0' });
    
  } catch (err) {
    return createResponse({ status: 'error', message: 'Error: ' + err.toString() });
  }
}

/**
 * AUTOMATION WORKER
 * This function is called by the Time Trigger every minute.
 * It looks for files created in the last 10 minutes.
 */
function syncRecentFiles() {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    
    // Search for non-trashed files created in the last 10 minutes (buffer for safety)
    const tenMinutesAgo = new Date(new Date().getTime() - 10 * 60 * 1000);
    const timeString = tenMinutesAgo.toISOString();
    const query = `createdTime > '${timeString}' and trashed = false`;
    
    const files = folder.searchFiles(query);
    
    while (files.hasNext()) {
      const file = files.next();
      processFile(file);
    }
  } catch (e) {
    console.error("Sync Error: " + e.toString());
  }
}

/**
 * LOGIC: Parse filename and log to sheet if new
 */
function processFile(file) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
  const fileUrl = file.getUrl();
  const fileName = file.getName();
  
  // 1. Idempotency Check: Is this URL already in the last 50 rows?
  const lastRow = sheet.getLastRow();
  if (lastRow > 0) {
    const startRow = Math.max(1, lastRow - 50);
    const numRows = Math.min(50, lastRow - startRow + 1); // fix range calc
    const checkRange = sheet.getRange(startRow, 10, numRows, 1); // Col J is 10
    const values = checkRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == fileUrl) {
        return; // Exists, skip
      }
    }
  }
  
  // 2. Parse Category from Filename: "Category - Scene Name.mp4"
  let category = "General";
  if (fileName.includes(" - ")) {
    category = fileName.split(" - ")[0].trim();
  }
  
  // 3. Log it
  const rowData = [
    new Date(),          // A: Date
    "",                  // B
    "",                  // C
    "",                  // D
    category,            // E: Category
    "",                  // F
    "",                  // G
    "",                  // H
    fileName,            // I: File Name
    fileUrl              // J: File Link
  ];
  
  sheet.appendRow(rowData);
}


function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return createResponse({ status: 'active', version: '14.0' });
}