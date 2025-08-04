const logger = require('../config/logger');
const amoService = require('../services/amoService');
const googleService = require('../services/googleService');
const tokenService = require('../services/tokenService');

class SyncController {
  /**
   * Get system status and statistics
   */
  async getStatus(req, res) {
    try {
      // Get various system statistics
      const [tokenStatus, sheetStats, amoHealthy] = await Promise.all([
        tokenService.getTokenStatus(),
        googleService.getSheetStats().catch(() => ({ error: 'Unable to fetch sheet stats' })),
        amoService.api.get('/account').then(() => true).catch(() => false)
      ]);

      const status = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        
        // Service health
        services: {
          amocrm: amoHealthy ? 'OK' : 'ERROR',
          googleSheets: sheetStats.error ? 'ERROR' : 'OK'
        },

        // Token information
        tokens: {
          ...tokenStatus,
          // Don't expose actual token values
          accessTokenLength: (process.env.AMO_ACCESS_TOKEN || '').length,
          refreshTokenLength: (process.env.AMO_REFRESH_TOKEN || '').length
        },

        // Google Sheets statistics
        googleSheets: sheetStats.error ? { error: sheetStats.error } : sheetStats,

        // Configuration
        config: {
          domain: process.env.AMO_DOMAIN,
          sheetId: process.env.GOOGLE_SHEET_ID,
          debugSkipFilter: process.env.DEBUG_SKIP_FILTER === 'true',
          port: process.env.PORT
        }
      };

      res.json(status);

    } catch (error) {
      logger.error('Error getting status:', error.message);
      
      res.status(500).json({
        error: 'Failed to get status',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Manual synchronization of a specific deal
   */
  async syncSpecificDeal(req, res) {
    const { dealId } = req.params;
    const startTime = Date.now();

    try {
      if (!dealId) {
        return res.status(400).json({
          error: 'Deal ID is required',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Manual sync requested for deal ${dealId}`);

      // Get deal from AMO CRM
      const dealInfo = await amoService.getDeal(dealId);
      
      if (!dealInfo) {
        return res.status(404).json({
          error: `Deal ${dealId} not found in AMO CRM`,
          timestamp: new Date().toISOString()
        });
      }

      // Check if deal belongs to ЕВГ СПБ pipeline
      const isEvgSpbDeal = await amoService.isDealFromEvgSpbPipeline(dealInfo);
      
      if (!isEvgSpbDeal) {
        return res.status(200).json({
          success: true,
          action: 'skipped',
          reason: 'Deal is not from ЕВГ СПБ pipeline',
          dealId,
          dealName: dealInfo.name,
          pipelineId: dealInfo.pipeline_id,
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });
      }

      // Format and sync to Google Sheets
      const formattedDeal = await amoService.formatDealForSheets(dealInfo);
      
      const result = await googleService.withRetry(async () => {
        return await googleService.upsertDeal(formattedDeal);
      });

      // Add audit log
      await googleService.addAuditLog('MANUAL_SYNC', dealId, {
        action: result.action,
        row: result.row,
        dealName: dealInfo.name,
        triggeredBy: 'manual_api'
      });

      const processingTime = Date.now() - startTime;

      logger.info(`Manual sync completed for deal ${dealId}:`, result);

      res.json({
        success: true,
        action: result.action,
        dealId,
        dealName: dealInfo.name,
        row: result.row,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error(`Manual sync failed for deal ${dealId}:`, error.message);

      // Add error to audit log
      await googleService.addAuditLog('MANUAL_SYNC_ERROR', dealId, {
        error: error.message,
        triggeredBy: 'manual_api'
      });

      res.status(500).json({
        success: false,
        error: error.message,
        dealId,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Manual synchronization endpoint
   */
  async manualSync(req, res) {
    const { dealId, force = false } = req.body;
    
    if (dealId) {
      // Redirect to specific deal sync
      req.params.dealId = dealId;
      return this.syncSpecificDeal(req, res);
    }

    const startTime = Date.now();

    try {
      logger.info('Manual bulk sync requested');

      // This would be for bulk sync - not implemented yet
      // Could add functionality to sync all deals from a specific pipeline
      
      res.status(501).json({
        error: 'Bulk sync not implemented yet',
        suggestion: 'Use /sync/deal/:dealId for specific deal sync',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Manual sync failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Force token refresh
   */
  async refreshToken(req, res) {
    try {
      logger.info('Manual token refresh requested');

      const result = await tokenService.forceRefresh();
      
      if (result) {
        res.json({
          success: true,
          message: 'Token refreshed successfully',
          timestamp: new Date().toISOString(),
          tokenStatus: tokenService.getTokenStatus()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Token refresh failed',
          timestamp: new Date().toISOString(),
          tokenStatus: tokenService.getTokenStatus()
        });
      }

    } catch (error) {
      logger.error('Manual token refresh failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test Google Sheets connection
   */
  async testGoogleSheets(req, res) {
    try {
      logger.info('Testing Google Sheets connection...');

      const stats = await googleService.getSheetStats();
      
      res.json({
        success: true,
        message: 'Google Sheets connection successful',
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Google Sheets test failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test AMO CRM connection
   */
  async testAmoCrm(req, res) {
    try {
      logger.info('Testing AMO CRM connection...');

      const account = await amoService.api.get('/account');
      const pipelines = await amoService.getPipelines();
      
      const evgSpbPipeline = pipelines.find(p => 
        p.name && p.name.toLowerCase().includes('евг спб')
      );

      res.json({
        success: true,
        message: 'AMO CRM connection successful',
        account: {
          id: account.data.id,
          name: account.data.name,
          subdomain: account.data.subdomain
        },
        pipelines: pipelines.length,
        evgSpbPipeline: evgSpbPipeline ? {
          id: evgSpbPipeline.id,
          name: evgSpbPipeline.name
        } : null,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('AMO CRM test failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new SyncController();
