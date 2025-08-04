const axios = require('axios');
const cron = require('node-cron');
const logger = require('../config/logger');

class TokenService {
  constructor() {
    this.refreshInProgress = false;
    this.lastRefreshTime = null;
    this.nextRefreshTime = null;
  }

  /**
   * Refresh AMO CRM access token using refresh token
   */
  async refreshAmoToken() {
    if (this.refreshInProgress) {
      logger.info('Token refresh already in progress, skipping...');
      return false;
    }

    this.refreshInProgress = true;

    try {
      const refreshToken = process.env.AMO_REFRESH_TOKEN;
      const clientId = process.env.AMO_CLIENT_ID;
      const clientSecret = process.env.AMO_CLIENT_SECRET;
      const domain = process.env.AMO_DOMAIN;

      if (!refreshToken || !clientId || !clientSecret || !domain) {
        throw new Error('Missing required AMO CRM credentials for token refresh');
      }

      const tokenUrl = `https://${domain}/oauth2/access_token`;
      
      const data = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: process.env.AMO_REDIRECT_URI
      };

      logger.info('Attempting to refresh AMO CRM token...');

      const response = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AMO-Evgenich-Webhook/1.0'
        },
        timeout: 30000
      });

      if (response.data && response.data.access_token) {
        // Update environment variables (in memory)
        process.env.AMO_ACCESS_TOKEN = response.data.access_token;
        process.env.AMO_TOKEN = response.data.access_token;
        
        if (response.data.refresh_token) {
          process.env.AMO_REFRESH_TOKEN = response.data.refresh_token;
        }

        this.lastRefreshTime = new Date();
        this.nextRefreshTime = new Date(Date.now() + (response.data.expires_in || 86400) * 1000);

        logger.tokenRefresh(true, {
          expiresIn: response.data.expires_in,
          nextRefresh: this.nextRefreshTime.toISOString()
        });

        logger.info('AMO CRM token refreshed successfully');
        return true;
      } else {
        throw new Error('Invalid response from AMO CRM token endpoint');
      }
    } catch (error) {
      logger.tokenRefresh(false, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      logger.error('Failed to refresh AMO CRM token:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      return false;
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Check if token needs refresh (within 1 hour of expiry)
   */
  shouldRefreshToken() {
    if (!this.nextRefreshTime) {
      return true; // No refresh time set, should refresh
    }

    const now = new Date();
    const refreshThreshold = new Date(this.nextRefreshTime.getTime() - 60 * 60 * 1000); // 1 hour before expiry

    return now >= refreshThreshold;
  }

  /**
   * Initialize automatic token refresh cron job
   */
  initTokenRefresh() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      try {
        if (this.shouldRefreshToken()) {
          logger.info('Scheduled token refresh triggered');
          await this.refreshAmoToken();
        } else {
          logger.debug('Token refresh not needed yet');
        }
      } catch (error) {
        logger.error('Scheduled token refresh failed:', error.message);
      }
    });

    // Also run every 30 minutes as a backup
    cron.schedule('*/30 * * * *', async () => {
      try {
        // Only run if last refresh was more than 23 hours ago
        if (this.lastRefreshTime) {
          const hoursSinceRefresh = (Date.now() - this.lastRefreshTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceRefresh >= 23) {
            logger.info('Backup token refresh triggered (23+ hours since last refresh)');
            await this.refreshAmoToken();
          }
        }
      } catch (error) {
        logger.error('Backup token refresh failed:', error.message);
      }
    });

    logger.info('Token refresh cron jobs initialized');

    // Try to refresh on startup if needed
    setTimeout(async () => {
      try {
        if (this.shouldRefreshToken()) {
          logger.info('Startup token refresh triggered');
          await this.refreshAmoToken();
        }
      } catch (error) {
        logger.error('Startup token refresh failed:', error.message);
      }
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Validate current AMO token
   */
  async validateAmoToken() {
    try {
      const token = process.env.AMO_ACCESS_TOKEN || process.env.AMO_TOKEN;
      const domain = process.env.AMO_DOMAIN;

      if (!token || !domain) {
        return false;
      }

      const response = await axios.get(`https://${domain}/api/v4/account`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'AMO-Evgenich-Webhook/1.0'
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      logger.warn('AMO token validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get token status information
   */
  getTokenStatus() {
    return {
      lastRefreshTime: this.lastRefreshTime,
      nextRefreshTime: this.nextRefreshTime,
      refreshInProgress: this.refreshInProgress,
      shouldRefresh: this.shouldRefreshToken(),
      hasAccessToken: !!(process.env.AMO_ACCESS_TOKEN || process.env.AMO_TOKEN),
      hasRefreshToken: !!process.env.AMO_REFRESH_TOKEN
    };
  }

  /**
   * Force token refresh (for manual trigger)
   */
  async forceRefresh() {
    logger.info('Manual token refresh triggered');
    return await this.refreshAmoToken();
  }
}

module.exports = new TokenService();
