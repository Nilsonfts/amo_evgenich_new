const logger = require('../config/logger');
const amoService = require('../services/amoService');
const googleService = require('../services/googleService');

class WebhookController {
  /**
   * Handle AMO CRM webhook
   */
  async handleAmoCrmWebhook(req, res) {
    const startTime = Date.now();
    
    try {
      logger.webhook('RECEIVED', {
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Validate request
      if (!req.body || typeof req.body !== 'object') {
        logger.warn('Invalid webhook payload received');
        return res.status(400).json({ 
          error: 'Invalid payload',
          timestamp: new Date().toISOString()
        });
      }

      // Extract leads data
      const { leads } = req.body;
      
      if (!leads || !Array.isArray(leads)) {
        logger.warn('No leads data in webhook payload');
        return res.status(400).json({ 
          error: 'No leads data found',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Processing ${leads.length} lead(s) from webhook`);

      // Process each lead
      const results = [];
      
      for (const leadData of leads) {
        try {
          const result = await this.processLead(leadData);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to process lead ${leadData.id}:`, error.message);
          results.push({
            leadId: leadData.id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      const processingTime = Date.now() - startTime;

      logger.webhook('PROCESSED', {
        totalLeads: leads.length,
        successCount,
        errorCount,
        processingTime: `${processingTime}ms`,
        results
      });

      res.status(200).json({
        success: true,
        processed: leads.length,
        successful: successCount,
        errors: errorCount,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        results
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Webhook processing error:', {
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process individual lead from webhook
   */
  async processLead(leadData) {
    const leadId = leadData.id;
    
    try {
      logger.info(`Processing lead ${leadId}...`);

      // Get full deal information from AMO CRM
      const dealInfo = await amoService.getDeal(leadId);
      
      if (!dealInfo) {
        throw new Error(`Deal ${leadId} not found in AMO CRM`);
      }

      // Check if deal belongs to "ЕВГ СПБ" pipeline
      const isEvgSpbDeal = await amoService.isDealFromEvgSpbPipeline(dealInfo);
      
      if (!isEvgSpbDeal) {
        logger.info(`Deal ${leadId} is not from ЕВГ СПБ pipeline, skipping`);
        return {
          leadId,
          success: true,
          action: 'skipped',
          reason: 'not_evg_spb_pipeline'
        };
      }

      logger.info(`Deal ${leadId} is from ЕВГ СПБ pipeline, processing...`);

      // Format deal data for Google Sheets
      const formattedDeal = await amoService.formatDealForSheets(dealInfo);

      // Upsert deal in Google Sheets with retry
      const sheetResult = await googleService.withRetry(async () => {
        return await googleService.upsertDeal(formattedDeal);
      });

      // Add audit log
      await googleService.addAuditLog('WEBHOOK_SYNC', leadId, {
        action: sheetResult.action,
        row: sheetResult.row,
        dealName: dealInfo.name,
        pipeline: dealInfo.pipeline_id
      });

      logger.info(`Deal ${leadId} successfully synced to Google Sheets:`, sheetResult);

      return {
        leadId,
        success: true,
        action: sheetResult.action,
        row: sheetResult.row,
        dealName: dealInfo.name
      };

    } catch (error) {
      logger.error(`Error processing lead ${leadId}:`, error.message);
      
      // Add error to audit log
      await googleService.addAuditLog('WEBHOOK_ERROR', leadId, {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Handle deal deletion (if AMO sends deletion events)
   */
  async handleDealDeletion(leadData) {
    const leadId = leadData.id;
    
    try {
      logger.info(`Processing deal deletion for ${leadId}...`);

      // Mark deal as deleted in Google Sheets
      const result = await googleService.withRetry(async () => {
        return await googleService.deleteDeal(leadId);
      });

      // Add audit log
      await googleService.addAuditLog('DEAL_DELETED', leadId, result);

      logger.info(`Deal ${leadId} marked as deleted in Google Sheets`);

      return {
        leadId,
        success: true,
        action: 'deleted'
      };

    } catch (error) {
      logger.error(`Error processing deal deletion ${leadId}:`, error.message);
      
      // Add error to audit log
      await googleService.addAuditLog('DELETE_ERROR', leadId, {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Health check for webhook endpoint
   */
  async healthCheck(req, res) {
    try {
      // Test AMO CRM connection
      const amoHealthy = await amoService.api.get('/account').then(() => true).catch(() => false);
      
      // Test Google Sheets connection
      const googleHealthy = await googleService.getSheetStats().then(() => true).catch(() => false);

      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          amocrm: amoHealthy ? 'OK' : 'ERROR',
          googleSheets: googleHealthy ? 'OK' : 'ERROR'
        },
        uptime: process.uptime()
      };

      const overallHealthy = amoHealthy && googleHealthy;
      const statusCode = overallHealthy ? 200 : 503;

      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Health check failed:', error.message);
      
      res.status(503).json({
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new WebhookController();
