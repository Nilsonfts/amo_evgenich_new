const { google } = require('googleapis');
const logger = require('../config/logger');

class GoogleService {
  constructor() {
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.gid = process.env.GOOGLE_SHEET_GID || '0';
    this.credentials = null;
    this.sheets = null;
    this.auth = null;

    this.initializeAuth();
  }

  /**
   * Initialize Google Sheets authentication
   */
  initializeAuth() {
    try {
      // Parse credentials from environment variable
      this.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      
      // Create JWT auth
      this.auth = new google.auth.JWT(
        this.credentials.client_email,
        null,
        this.credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Initialize Sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      logger.info('Google Sheets API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Ensure auth is valid
   */
  async ensureAuth() {
    try {
      if (!this.auth) {
        this.initializeAuth();
      }
      
      // Authorize if not already done
      await this.auth.authorize();
      return true;
    } catch (error) {
      logger.error('Google auth failed:', error.message);
      throw error;
    }
  }

  /**
   * Create header row if sheet is empty
   */
  async ensureHeaders() {
    try {
      await this.ensureAuth();

      // Check if headers exist
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A1:M1'
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Create headers
        const headers = [
          'ID сделки',
          'Название сделки', 
          'Бюджет',
          'Дата создания',
          'Дата изменения',
          'Этап',
          'Ответственный',
          'Контакт',
          'Телефон',
          'Email',
          'Компания',
          'Статус',
          'Источник'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: 'A1:M1',
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });

        logger.googleSheets('CREATE_HEADERS', this.sheetId, 'A1:M1', headers);
      }
    } catch (error) {
      logger.error('Error ensuring headers:', error.message);
      throw error;
    }
  }

  /**
   * Find row number by deal ID
   */
  async findDealRow(dealId) {
    try {
      await this.ensureAuth();

      // Get all deal IDs from column A
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:A'
      });

      if (!response.data.values) {
        return null;
      }

      // Find row with matching deal ID (skip header row)
      for (let i = 1; i < response.data.values.length; i++) {
        if (response.data.values[i][0] && 
            response.data.values[i][0].toString() === dealId.toString()) {
          return i + 1; // +1 because sheets are 1-indexed
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error finding deal row for ID ${dealId}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert deal data to row array
   */
  dealToRowArray(dealData) {
    return [
      dealData.id,
      dealData.name,
      dealData.price,
      dealData.created_at,
      dealData.updated_at,
      dealData.stage,
      dealData.responsible,
      dealData.contact_name,
      dealData.contact_phone,
      dealData.contact_email,
      dealData.company,
      dealData.status,
      dealData.source
    ];
  }

  /**
   * Add or update deal in Google Sheets
   */
  async upsertDeal(dealData) {
    try {
      await this.ensureHeaders();
      
      const dealId = dealData.id;
      const rowData = this.dealToRowArray(dealData);
      
      // Try to find existing row
      const existingRow = await this.findDealRow(dealId);
      
      if (existingRow) {
        // Update existing row
        const range = `A${existingRow}:M${existingRow}`;
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: range,
          valueInputOption: 'RAW',
          resource: {
            values: [rowData]
          }
        });

        logger.googleSheets('UPDATE_DEAL', this.sheetId, range, dealData);
        logger.info(`Deal ${dealId} updated in row ${existingRow}`);
        
        return { action: 'updated', row: existingRow };
      } else {
        // Add new row
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.sheetId,
          range: 'A:M',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values: [rowData]
          }
        });

        logger.googleSheets('ADD_DEAL', this.sheetId, 'A:M', dealData);
        logger.info(`Deal ${dealId} added as new row`);
        
        return { action: 'created', row: null };
      }
    } catch (error) {
      logger.error(`Error upserting deal ${dealData.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete deal from Google Sheets
   */
  async deleteDeal(dealId) {
    try {
      await this.ensureAuth();
      
      const existingRow = await this.findDealRow(dealId);
      
      if (existingRow) {
        // Instead of deleting, mark as deleted
        const range = `L${existingRow}`;
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: range,
          valueInputOption: 'RAW',
          resource: {
            values: [['Удалена']]
          }
        });

        logger.googleSheets('DELETE_DEAL', this.sheetId, range, { dealId });
        logger.info(`Deal ${dealId} marked as deleted in row ${existingRow}`);
        
        return { action: 'deleted', row: existingRow };
      } else {
        logger.warn(`Deal ${dealId} not found for deletion`);
        return { action: 'not_found', row: null };
      }
    } catch (error) {
      logger.error(`Error deleting deal ${dealId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get sheet statistics
   */
  async getSheetStats() {
    try {
      await this.ensureAuth();

      // Get all data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:M'
      });

      const values = response.data.values || [];
      const totalRows = values.length;
      const dataRows = totalRows > 0 ? totalRows - 1 : 0; // Exclude header

      // Count active vs deleted deals
      let activeDeals = 0;
      let deletedDeals = 0;

      for (let i = 1; i < values.length; i++) {
        const status = values[i][11]; // Column L (status)
        if (status === 'Удалена') {
          deletedDeals++;
        } else {
          activeDeals++;
        }
      }

      return {
        totalRows,
        dataRows,
        activeDeals,
        deletedDeals,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting sheet stats:', error.message);
      throw error;
    }
  }

  /**
   * Add audit log entry to separate sheet
   */
  async addAuditLog(action, dealId, details = {}) {
    try {
      await this.ensureAuth();

      const auditData = [
        new Date().toISOString(),
        action,
        dealId,
        JSON.stringify(details),
        process.env.NODE_ENV || 'production'
      ];

      // Try to add to 'Audit' sheet, create if doesn't exist
      try {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.sheetId,
          range: 'Audit!A:E',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values: [auditData]
          }
        });
      } catch (auditError) {
        // If audit sheet doesn't exist, just log the attempt
        logger.warn('Could not add to audit sheet (sheet may not exist):', auditError.message);
      }
    } catch (error) {
      logger.error('Error adding audit log:', error.message);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Retry wrapper for Google Sheets operations
   */
  async withRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error.code === 429 || error.message.includes('rate limit')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`Google Sheets rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Check if it's an auth error
        if (error.code === 401 || error.message.includes('unauthorized')) {
          logger.warn(`Google Sheets auth error, reinitializing auth (attempt ${attempt}/${maxRetries})`);
          this.initializeAuth();
          continue;
        }
        
        // For other errors, only retry once more
        if (attempt < maxRetries) {
          logger.warn(`Google Sheets operation failed, retrying (attempt ${attempt}/${maxRetries}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        break;
      }
    }
    
    throw lastError;
  }
}

module.exports = new GoogleService();
