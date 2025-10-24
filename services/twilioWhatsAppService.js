const twilio = require('twilio');

class TwilioWhatsAppService {
  constructor(accountSid, authToken, fromNumber) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber; // Your Twilio WhatsApp number (e.g., 'whatsapp:+14155238886')
  }

  // Send text message
  async sendTextMessage(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: `whatsapp:${to}`
      });
      return {
        success: true,
        messageId: result.sid,
        status: 'sent'
      };
    } catch (error) {
      throw new Error(`Twilio WhatsApp Error: ${error.message}`);
    }
  }

  // Send media message
  async sendMediaMessage(to, mediaUrl, caption = '') {
    try {
      const result = await this.client.messages.create({
        body: caption,
        mediaUrl: [mediaUrl],
        from: this.fromNumber,
        to: `whatsapp:${to}`
      });
      return {
        success: true,
        messageId: result.sid,
        status: 'sent'
      };
    } catch (error) {
      throw new Error(`Twilio WhatsApp Media Error: ${error.message}`);
    }
  }

  // Send bulk messages
  async sendBulkMessages(messages) {
    const results = [];
    const errors = [];

    for (const message of messages) {
      try {
        let result;
        if (message.type === 'text') {
          result = await this.sendTextMessage(message.to, message.text);
        } else if (message.type === 'media') {
          result = await this.sendMediaMessage(message.to, message.mediaUrl, message.caption);
        }

        results.push({
          to: message.to,
          success: true,
          messageId: result.messageId
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

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        status: message.status,
        sentAt: message.dateCreated,
        deliveredAt: message.dateUpdated
      };
    } catch (error) {
      throw new Error(`Twilio Status Error: ${error.message}`);
    }
  }

  // Send to unlimited numbers (no restrictions!)
  async sendToUnlimitedNumbers(phoneNumbers, message) {
    const results = [];
    const errors = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.sendTextMessage(phoneNumber, message);
        results.push({
          phoneNumber,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        errors.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    return { results, errors };
  }
}

module.exports = TwilioWhatsAppService;
