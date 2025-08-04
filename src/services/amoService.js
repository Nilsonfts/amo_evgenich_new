const axios = require('axios');
const logger = require('../config/logger');

class AmoService {
  constructor() {
    this.domain = process.env.AMO_DOMAIN;
    this.clientId = process.env.AMO_CLIENT_ID;
    this.clientSecret = process.env.AMO_CLIENT_SECRET;
    this.redirectUri = process.env.AMO_REDIRECT_URI;
    this.baseURL = `https://${this.domain}/api/v4`;
    
    // Initialize axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AMO-Evgenich-Webhook/1.0'
      }
    });

    // Request interceptor to add auth header
    this.api.interceptors.request.use((config) => {
      const token = process.env.AMO_ACCESS_TOKEN || process.env.AMO_TOKEN;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for logging and error handling
    this.api.interceptors.response.use(
      (response) => {
        logger.amoApi(
          response.config.method?.toUpperCase(),
          response.config.url,
          response.status,
          response.data
        );
        return response;
      },
      async (error) => {
        const { config, response } = error;
        
        logger.error('AMO CRM API Error:', {
          method: config?.method?.toUpperCase(),
          url: config?.url,
          status: response?.status,
          statusText: response?.statusText,
          data: response?.data,
          message: error.message
        });

        // If 401 and we have refresh token, try to refresh
        if (response?.status === 401) {
          logger.warn('AMO CRM token expired, attempting refresh...');
          const tokenService = require('./tokenService');
          const refreshed = await tokenService.refreshAmoToken();
          
          if (refreshed && config && !config._retry) {
            config._retry = true;
            config.headers.Authorization = `Bearer ${process.env.AMO_ACCESS_TOKEN}`;
            return this.api.request(config);
          }
        }

        throw error;
      }
    );
  }

  /**
   * Get deal by ID with full information
   */
  async getDeal(dealId, withParams = true) {
    try {
      const params = withParams ? {
        'with': 'contacts,companies,catalog_elements,loss_reason,pipeline'
      } : {};

      const response = await this.api.get(`/leads/${dealId}`, { params });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get deal ${dealId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all pipelines to find "ЕВГ СПБ" pipeline ID
   */
  async getPipelines() {
    try {
      const response = await this.api.get('/leads/pipelines');
      return response.data._embedded?.pipelines || [];
    } catch (error) {
      logger.error('Failed to get pipelines:', error.message);
      throw error;
    }
  }

  /**
   * Find pipeline ID by name
   */
  async findPipelineByName(pipelineName) {
    try {
      const pipelines = await this.getPipelines();
      const pipeline = pipelines.find(p => 
        p.name && p.name.toLowerCase().includes(pipelineName.toLowerCase())
      );
      
      if (pipeline) {
        logger.info(`Found pipeline "${pipelineName}" with ID: ${pipeline.id}`);
        return pipeline;
      }
      
      logger.warn(`Pipeline "${pipelineName}" not found`);
      return null;
    } catch (error) {
      logger.error(`Failed to find pipeline "${pipelineName}":`, error.message);
      throw error;
    }
  }

  /**
   * Get user information by ID
   */
  async getUser(userId) {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Get contact information by ID
   */
  async getContact(contactId) {
    try {
      const response = await this.api.get(`/contacts/${contactId}`, {
        params: { 'with': 'custom_fields' }
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get contact ${contactId}:`, error.message);
      return null;
    }
  }

  /**
   * Get company information by ID
   */
  async getCompany(companyId) {
    try {
      const response = await this.api.get(`/companies/${companyId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get company ${companyId}:`, error.message);
      return null;
    }
  }

  /**
   * Check if deal belongs to "ЕВГ СПБ" pipeline
   */
  async isDealFromEvgSpbPipeline(deal) {
    try {
      // Если отладка отключена, проверяем фильтр
      if (process.env.DEBUG_SKIP_FILTER === 'true') {
        logger.info('DEBUG mode: skipping pipeline filter');
        return true;
      }

      const pipelineId = deal.pipeline_id;
      if (!pipelineId) {
        logger.warn('Deal has no pipeline_id');
        return false;
      }

      // Кэшируем ID воронки "ЕВГ СПБ"
      if (!this.evgSpbPipelineId) {
        const pipeline = await this.findPipelineByName('ЕВГ СПБ');
        if (pipeline) {
          this.evgSpbPipelineId = pipeline.id;
        } else {
          logger.error('ЕВГ СПБ pipeline not found');
          return false;
        }
      }

      const isEvgSpbDeal = pipelineId === this.evgSpbPipelineId;
      logger.info(`Deal ${deal.id} pipeline check:`, {
        dealPipelineId: pipelineId,
        evgSpbPipelineId: this.evgSpbPipelineId,
        isEvgSpbDeal
      });

      return isEvgSpbDeal;
    } catch (error) {
      logger.error('Error checking deal pipeline:', error.message);
      return false;
    }
  }

  /**
   * Get deal stage name
   */
  getStageName(deal, pipelines) {
    try {
      const pipeline = pipelines.find(p => p.id === deal.pipeline_id);
      if (!pipeline) return 'Неизвестный этап';

      const stage = pipeline.statuses?.find(s => s.id === deal.status_id);
      return stage ? stage.name : 'Неизвестный этап';
    } catch (error) {
      logger.error('Error getting stage name:', error.message);
      return 'Неизвестный этап';
    }
  }

  /**
   * Extract phone from contact custom fields
   */
  extractPhone(contact) {
    try {
      if (!contact || !contact.custom_fields_values) return '';

      const phoneField = contact.custom_fields_values.find(field => 
        field.field_name === 'Телефон' || field.field_code === 'PHONE'
      );

      if (phoneField && phoneField.values && phoneField.values[0]) {
        return phoneField.values[0].value || '';
      }

      return '';
    } catch (error) {
      logger.error('Error extracting phone:', error.message);
      return '';
    }
  }

  /**
   * Extract email from contact custom fields
   */
  extractEmail(contact) {
    try {
      if (!contact || !contact.custom_fields_values) return '';

      const emailField = contact.custom_fields_values.find(field => 
        field.field_name === 'Email' || field.field_code === 'EMAIL'
      );

      if (emailField && emailField.values && emailField.values[0]) {
        return emailField.values[0].value || '';
      }

      return '';
    } catch (error) {
      logger.error('Error extracting email:', error.message);
      return '';
    }
  }

  /**
   * Format deal data for Google Sheets
   */
  async formatDealForSheets(deal) {
    try {
      // Get additional data
      const [pipelines, responsible, contacts, companies] = await Promise.all([
        this.getPipelines(),
        deal.responsible_user_id ? this.getUser(deal.responsible_user_id) : null,
        deal._embedded?.contacts ? Promise.all(
          deal._embedded.contacts.map(c => this.getContact(c.id))
        ) : [],
        deal._embedded?.companies ? Promise.all(
          deal._embedded.companies.map(c => this.getCompany(c.id))
        ) : []
      ]);

      // Format contact info
      const mainContact = contacts.find(Boolean);
      const contactName = mainContact ? mainContact.name : '';
      const contactPhone = mainContact ? this.extractPhone(mainContact) : '';
      const contactEmail = mainContact ? this.extractEmail(mainContact) : '';

      // Format company info
      const mainCompany = companies.find(Boolean);
      const companyName = mainCompany ? mainCompany.name : '';

      return {
        id: deal.id,
        name: deal.name || '',
        price: deal.price || 0,
        created_at: deal.created_at ? new Date(deal.created_at * 1000).toISOString() : '',
        updated_at: deal.updated_at ? new Date(deal.updated_at * 1000).toISOString() : '',
        stage: this.getStageName(deal, pipelines),
        responsible: responsible ? responsible.name : '',
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        company: companyName,
        status: deal.is_deleted ? 'Удалена' : 'Активна',
        source: 'AMO CRM'
      };
    } catch (error) {
      logger.error('Error formatting deal for sheets:', error.message);
      throw error;
    }
  }
}

module.exports = new AmoService();
