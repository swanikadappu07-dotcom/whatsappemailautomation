const axios = require('axios');

class WhatsAppService {
  constructor(accessToken, phoneNumberId) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  // Send text message
  async sendTextMessage(to, message) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Send template message
  async sendTemplateMessage(to, templateName, language, components = []) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            components: components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Template Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Send media message
  async sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Media Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Send document message
  async sendDocumentMessage(to, documentUrl, filename, caption = '') {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'document',
          document: {
            link: documentUrl,
            filename: filename,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Document Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Status Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Create template
  async createTemplate(templateData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/message_templates`,
        templateData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Template Creation Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get templates
  async getTemplates() {
    try {
      const response = await axios.get(
        `${this.baseURL}/${this.phoneNumberId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Templates Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`WhatsApp Mark Read Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Send bulk messages
  async sendBulkMessages(messages) {
    const results = [];
    const errors = [];

    for (const message of messages) {
      try {
        let result;
        if (message.type === 'template') {
          result = await this.sendTemplateMessage(
            message.to,
            message.templateName,
            message.language,
            message.components
          );
        } else if (message.type === 'text') {
          result = await this.sendTextMessage(message.to, message.text);
        } else if (message.type === 'media') {
          result = await this.sendMediaMessage(
            message.to,
            message.mediaType,
            message.mediaUrl,
            message.caption
          );
        }

        results.push({
          to: message.to,
          success: true,
          messageId: result.messages[0].id
        });
      } catch (error) {
        errors.push({
          to: message.to,
          error: error.message
        });
      }
    }

    return { results, errors };
  }
}

module.exports = WhatsAppService;
