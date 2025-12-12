const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
// Strip quotes and properly handle newlines in the private key
let PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');

let sheetsService = null;

function init() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.warn('Google Sheets credentials missing. Sheets sync disabled.');
    return;
  }
  try {
    const jwtClient = new google.auth.JWT(
      CLIENT_EMAIL,
      null,
      PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    sheetsService = google.sheets({ version: 'v4', auth: jwtClient });
  } catch (err) {
    console.error('Failed to initialize Google Sheets:', err.message);
    sheetsService = null;
  }
}

async function appendNoteRow(phone, noteText, createdAt) {
  if (!sheetsService) init();
  if (!sheetsService) throw new Error('Sheets not configured');
  
  try {
    // Get all rows to check if phone number exists
    const rows = await getSheetRows('Sheet1!A:C');
    let phoneRowIndex = -1;
    
    // Find row with matching phone number (skip header row 0)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === phone) {
        phoneRowIndex = i + 1; // Convert to 1-based row number for Google Sheets
        break;
      }
    }
    
    const timestamp = new Date(createdAt).toISOString();
    
    if (phoneRowIndex > 0) {
      // Update existing row with same phone number
      console.log(`Updating existing row ${phoneRowIndex} for phone ${phone}`);
      await sheetsService.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sheet1!B${phoneRowIndex}:C${phoneRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[noteText, timestamp]]
        }
      });
    } else {
      // Append new row if phone number not found
      console.log(`Appending new row for phone ${phone}`);
      const values = [[phone, noteText, timestamp]];
      await sheetsService.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:C',
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });
    }
  } catch (err) {
    console.error('Error syncing note to sheet:', err.message);
    throw err;
  }
}

async function getSheetRows(range) {
  if (!sheetsService) init();
  if (!sheetsService) throw new Error('Sheets not configured');
  const response = await sheetsService.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: range
  });
  return response.data.values || [];
}

module.exports = { appendNoteRow, getSheetRows };
