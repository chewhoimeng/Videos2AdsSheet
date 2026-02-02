/**
 * GOOGLE APPS SCRIPT BACKEND for HYGR Creative Flow
 */

const CONFIG = {
  FOLDER_ID: '1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe', // The ID of your Google Drive folder
  SPREADSHEET_ID: '1brCliL33hUu_IZaMfjb7AwlP7bXEmV6aMI26mx7ECxk', // Your Tracking spreadsheet
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
    const actualFileName = file.getName();
    
    // 2. Log the record to your Google Sheet
    logToSheet(category, actualFileName, fileUrl);
    
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
 * Custom Logic: 
 * Column E -> Product (Category)
 * Column I -> File Name
 * Column J -> Drive Link
 */
function logToSheet(category, fileName, fileUrl) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
    
    // Find the first row where Column E is empty
    const nextRow = findNextUnusedRow(sheet, 5); // 5 is Column E
    
    // Column A (1): Upload Timestamp
    sheet.getRange(nextRow, 1).setValue(new Date());
    
    // Column E (5): Product (Category)
    sheet.getRange(nextRow, 5).setValue(category);
    
    // Column I (9): File Name
    sheet.getRange(nextRow, 9).setValue(fileName);
    
    // Column J (10): Drive Link
    sheet.getRange(nextRow, 10).setValue(fileUrl);
    
    // Optional: Auto-resize columns to fit content
    sheet.autoResizeColumn(1);
    sheet.autoResizeColumn(5);
    sheet.autoResizeColumn(9);
    sheet.autoResizeColumn(10);
    
  } catch (e) {
    console.error("Sheet logging failed", e);
  }
}

/**
 * Helper to find the first truly empty row in a specific column.
 * This prevents jumping to the very end of the sheet if there are empty formatted rows.
 */
function findNextUnusedRow(sheet, columnNumber) {
  // Get all values in the specified column
  const values = sheet.getRange(1, columnNumber, sheet.getMaxRows()).getValues();
  
  // Iterate from top to bottom (starting at row 2 to skip headers usually)
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === "" || values[i][0] === null || values[i][0] === undefined) {
      return i + 1; // Return row index (1-based)
    }
  }
  
  // If no empty row found in existing range, add to the very end
  return sheet.getLastRow() + 1;
}

/**
 * Required to allow the script to be used as a Web App.
 */
function doGet() {
  return HtmlService.createHtmlOutput("<h1>HYGR Creative Flow API is Active</h1>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}