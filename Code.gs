/**
 * HYGR Creative Flow - Production Backend v10.0
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Apps Script Editor.
 * 2. Select 'setupPermissions' and click RUN.
 * 3. Click 'Deploy' > 'New Deployment'.
 * 4. Choose 'Web App'. Execute as 'Me'. Access: 'Anyone'.
 * 5. COPY the URL and paste it into the Web App's "Configure Connection" section.
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', 
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', 
  SHEET_NAME: 'Sheet1'
};

function setupPermissions() {
  try {
    DriveApp.getFolderById(CONFIG.FOLDER_ID);
    SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    console.log("Authorization Successful. System is Operational.");
  } catch (e) {
    console.error("Setup Error: Verify your Folder and Sheet IDs. " + e.toString());
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: 'error', message: 'No payload detected.' });
    }
    
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'initialize') {
      return handleInitialize(data);
    } else if (data.action === 'log') {
      return handleLog(data);
    }
    
    return createResponse({ status: 'error', message: 'Unknown action: ' + data.action });
  } catch (err) {
    return createResponse({ status: 'error', message: 'CORS/System Error: ' + err.toString() });
  }
}

function handleInitialize(data) {
  const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
  const metadata = {
    name: data.fileName,
    mimeType: data.mimeType || 'video/mp4',
    parents: [CONFIG.FOLDER_ID]
  };

  const response = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(metadata),
    muteHttpExceptions: true
  });

  const uploadUrl = response.getHeaders()['Location'] || response.getHeaders()['location'];
  
  if (uploadUrl) {
    return createResponse({ status: 'success', uploadUrl: uploadUrl });
  } else {
    return createResponse({ 
      status: 'error', 
      message: 'Drive rejected session: ' + response.getContentText() 
    });
  }
}

function handleLog(data) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
    
    // Attempt to get file with retry loop (handles Drive API indexing delays)
    let file = null;
    let attempts = 0;
    while (!file && attempts < 10) {
      try {
        if (data.fileId && data.fileId !== "UNKNOWN_ID" && data.fileId !== "UNKNOWN_ID_BUT_SUCCESS") {
          file = DriveApp.getFileById(data.fileId);
        }
      } catch (e) {
        // Drive API sometimes takes a second to index the new file
        console.warn("File not found yet, retrying... " + attempts);
      }
      attempts++;
      Utilities.sleep(1000); // Wait 1s between retries
    }

    const timestamp = new Date();
    const fileName = file ? file.getName() : "Unknown Asset (Upload Success)";
    const fileUrl = file ? file.getUrl() : "File ID not found immediately";

    // Row Logic: A=Date, E=Category, I=Name, J=Link
    const rowData = [
      timestamp, // A: Date
      "",        // B
      "",        // C
      "",        // D
      data.category || "General", // E: Category
      "",        // F
      "",        // G
      "",        // H
      fileName,  // I: File Name
      fileUrl    // J: File Link
    ];
    
    sheet.appendRow(rowData);
    
    return createResponse({ 
      status: 'success', 
      loggedAs: fileName 
    });
  } catch (err) {
    return createResponse({ 
      status: 'error', 
      message: 'Logging failed: ' + err.toString() 
    });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  // Simple reachability check
  return createResponse({ 
    status: 'active', 
    version: '10.0', 
    system: 'HYGR_PRODUCTION_API' 
  });
}