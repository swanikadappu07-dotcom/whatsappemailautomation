const express = require('express');
const Template = require('../models/Template');
const WhatsAppService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get all templates
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;
    const query = { userId: req.user.userId };

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Template.countDocuments(query);

    res.json({
      templates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create template
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, language, components } = req.body;

    const template = new Template({
      userId: req.user.userId,
      name,
      category,
      language,
      components
    });

    await template.save();

    res.status(201).json({
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update template
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, language, components, isActive } = req.body;

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, category, language, components, isActive },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit template to WhatsApp for approval
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    // Prepare template data for WhatsApp API
    const templateData = {
      name: template.name,
      category: template.category,
      language: template.language,
      components: template.components
    };

    const result = await whatsappService.createTemplate(templateData);

    // Update template with WhatsApp template ID
    template.whatsappTemplateId = result.id;
    template.status = 'PENDING';
    await template.save();

    res.json({
      message: 'Template submitted for approval',
      whatsappTemplateId: result.id
    });
  } catch (error) {
    console.error('Submit template error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sync templates from WhatsApp
router.post('/sync', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const whatsappTemplates = await whatsappService.getTemplates();

    // Update local templates with WhatsApp status
    for (const whatsappTemplate of whatsappTemplates.data) {
      await Template.findOneAndUpdate(
        { whatsappTemplateId: whatsappTemplate.id, userId: req.user.userId },
        { 
          status: whatsappTemplate.status,
          isActive: whatsappTemplate.status === 'APPROVED'
        }
      );
    }

    res.json({
      message: 'Templates synced successfully',
      synced: whatsappTemplates.data.length
    });
  } catch (error) {
    console.error('Sync templates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get template usage statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      template: {
        name: template.name,
        usage: template.usage,
        status: template.status,
        isActive: template.isActive
      }
    });
  } catch (error) {
    console.error('Get template stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test template
router.post('/:id/test', auth, async (req, res) => {
  try {
    const { phoneNumber, variables } = req.body;

    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Template not approved yet' });
    }

    const user = await User.findById(req.user.userId);
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    // Prepare components with variables
    const components = template.components.map(component => {
      if (component.type === 'BODY' && variables) {
        return {
          ...component,
          example: {
            body_text: variables
          }
        };
      }
      return component;
    });

    const result = await whatsappService.sendTemplateMessage(
      phoneNumber,
      template.name,
      template.language,
      components
    );

    res.json({
      message: 'Test message sent successfully',
      messageId: result.messages[0].id
    });
  } catch (error) {
    console.error('Test template error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
