const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const WhatsAppService = require('../services/whatsappService');
const cron = require('node-cron');
const moment = require('moment');

const router = express.Router();

// Get all alerts
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    // This would typically come from an Alert model
    // For now, we'll return system alerts
    const alerts = [
      {
        id: 1,
        type: 'system',
        title: 'WhatsApp API Status',
        message: 'WhatsApp API is running normally',
        status: 'active',
        createdAt: new Date()
      }
    ];

    res.json({
      alerts,
      totalPages: 1,
      currentPage: page,
      total: alerts.length
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create custom alert
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, type, scheduledFor, contacts } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    // Create alert messages for selected contacts
    const alertMessages = [];
    for (const contactId of contacts) {
      const contact = await Contact.findOne({
        _id: contactId,
        userId: req.user.userId
      });

      if (contact) {
        const alertMessage = new Message({
          userId: req.user.userId,
          contactId,
          type: 'text',
          content: { text: message },
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          metadata: {
            alertType: type,
            alertTitle: title
          }
        });

        await alertMessage.save();
        alertMessages.push(alertMessage);
      }
    }

    res.status(201).json({
      message: 'Alert created successfully',
      alertMessages: alertMessages.length
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send appointment reminders
router.post('/appointments/remind', auth, async (req, res) => {
  try {
    const { hoursBefore = 24 } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const reminderTime = moment().add(hoursBefore, 'hours');
    const appointments = await Appointment.find({
      userId: req.user.userId,
      date: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      },
      time: {
        $gte: moment().format('HH:mm'),
        $lte: reminderTime.format('HH:mm')
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('contactId', 'name phone email');

    let sentCount = 0;
    for (const appointment of appointments) {
      try {
        await sendAppointmentReminder(appointment, user);
        sentCount++;
      } catch (error) {
        console.error('Send appointment reminder error:', error);
      }
    }

    res.json({
      message: `Appointment reminders sent to ${sentCount} customers`,
      sentCount
    });
  } catch (error) {
    console.error('Send appointment reminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send billing reminders
router.post('/billing/remind', auth, async (req, res) => {
  try {
    const { daysBefore = 3 } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const reminderDate = moment().add(daysBefore, 'days');
    const bills = await Billing.find({
      userId: req.user.userId,
      status: { $in: ['sent', 'viewed'] },
      dueDate: {
        $gte: moment().startOf('day').toDate(),
        $lte: reminderDate.endOf('day').toDate()
      }
    }).populate('contactId', 'name phone email');

    let sentCount = 0;
    for (const bill of bills) {
      try {
        await sendBillingReminder(bill, user);
        sentCount++;
      } catch (error) {
        console.error('Send billing reminder error:', error);
      }
    }

    res.json({
      message: `Billing reminders sent to ${sentCount} customers`,
      sentCount
    });
  } catch (error) {
    console.error('Send billing reminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send overdue notifications
router.post('/overdue/notify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const overdueBills = await Billing.find({
      userId: req.user.userId,
      status: { $in: ['sent', 'viewed'] },
      dueDate: { $lt: new Date() }
    }).populate('contactId', 'name phone email');

    let sentCount = 0;
    for (const bill of overdueBills) {
      try {
        await sendOverdueNotification(bill, user);
        sentCount++;
      } catch (error) {
        console.error('Send overdue notification error:', error);
      }
    }

    res.json({
      message: `Overdue notifications sent to ${sentCount} customers`,
      sentCount
    });
  } catch (error) {
    console.error('Send overdue notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send birthday wishes
router.post('/birthday/wishes', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    // This would require a birthday field in the Contact model
    // For now, we'll send a general message
    const contacts = await Contact.find({
      userId: req.user.userId,
      isActive: true
    });

    let sentCount = 0;
    for (const contact of contacts) {
      try {
        await sendBirthdayWish(contact, user);
        sentCount++;
      } catch (error) {
        console.error('Send birthday wish error:', error);
      }
    }

    res.json({
      message: `Birthday wishes sent to ${sentCount} contacts`,
      sentCount
    });
  } catch (error) {
    console.error('Send birthday wishes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send promotional messages
router.post('/promotional/send', auth, async (req, res) => {
  try {
    const { message, contacts, scheduledFor } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    if (user.hasReachedLimit(contacts.length)) {
      return res.status(400).json({ message: 'Message limit reached' });
    }

    const promotionalMessages = [];
    for (const contactId of contacts) {
      const contact = await Contact.findOne({
        _id: contactId,
        userId: req.user.userId
      });

      if (contact) {
        const promotionalMessage = new Message({
          userId: req.user.userId,
          contactId,
          type: 'text',
          content: { text: message },
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          metadata: {
            alertType: 'promotional',
            alertTitle: 'Promotional Message'
          }
        });

        await promotionalMessage.save();
        promotionalMessages.push(promotionalMessage);
      }
    }

    res.status(201).json({
      message: 'Promotional messages queued successfully',
      count: promotionalMessages.length
    });
  } catch (error) {
    console.error('Send promotional messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get alert statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get alert messages
    const alertMessages = await Message.find({
      ...query,
      'metadata.alertType': { $exists: true }
    });

    const stats = {
      total: alertMessages.length,
      sent: alertMessages.filter(m => m.status === 'sent').length,
      failed: alertMessages.filter(m => m.status === 'failed').length,
      pending: alertMessages.filter(m => m.status === 'pending').length
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to send appointment reminder
async function sendAppointmentReminder(appointment, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Reminder: You have an appointment "${appointment.title}" today at ${appointment.time}. ${appointment.location ? `Location: ${appointment.location}` : ''}`;

    await whatsappService.sendTextMessage(appointment.contactId.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: appointment.userId,
      contactId: appointment.contactId._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        alertType: 'appointment_reminder',
        alertTitle: 'Appointment Reminder'
      }
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send appointment reminder error:', error);
  }
}

// Helper function to send billing reminder
async function sendBillingReminder(bill, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Reminder: Your bill of ${bill.currency} ${bill.amount} is due on ${moment(bill.dueDate).format('MMMM Do YYYY')}. Please make payment to avoid late fees.`;

    await whatsappService.sendTextMessage(bill.contactId.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: bill.userId,
      contactId: bill.contactId._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        alertType: 'billing_reminder',
        alertTitle: 'Billing Reminder'
      }
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send billing reminder error:', error);
  }
}

// Helper function to send overdue notification
async function sendOverdueNotification(bill, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const daysOverdue = moment().diff(moment(bill.dueDate), 'days');
    const message = `URGENT: Your bill of ${bill.currency} ${bill.amount} is ${daysOverdue} days overdue. Please make payment immediately to avoid further action.`;

    await whatsappService.sendTextMessage(bill.contactId.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: bill.userId,
      contactId: bill.contactId._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        alertType: 'overdue_notification',
        alertTitle: 'Overdue Notification'
      }
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send overdue notification error:', error);
  }
}

// Helper function to send birthday wish
async function sendBirthdayWish(contact, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Happy Birthday ${contact.name}! 🎉 Wishing you a wonderful day filled with joy and happiness!`;

    await whatsappService.sendTextMessage(contact.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: user._id,
      contactId: contact._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        alertType: 'birthday_wish',
        alertTitle: 'Birthday Wish'
      }
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send birthday wish error:', error);
  }
}

// Schedule cron jobs for automated alerts
cron.schedule('0 9 * * *', async () => {
  // Daily at 9 AM - send appointment reminders
  try {
    const users = await User.find({ 'whatsappConfig.isActive': true });
    
    for (const user of users) {
      const appointments = await Appointment.find({
        userId: user._id,
        date: {
          $gte: moment().startOf('day').toDate(),
          $lte: moment().endOf('day').toDate()
        },
        status: { $in: ['scheduled', 'confirmed'] }
      }).populate('contactId', 'name phone email');

      for (const appointment of appointments) {
        try {
          await sendAppointmentReminder(appointment, user);
        } catch (error) {
          console.error('Cron appointment reminder error:', error);
        }
      }
    }
  } catch (error) {
    console.error('Cron appointment reminders error:', error);
  }
});

cron.schedule('0 10 * * *', async () => {
  // Daily at 10 AM - send billing reminders
  try {
    const users = await User.find({ 'whatsappConfig.isActive': true });
    
    for (const user of users) {
      const bills = await Billing.find({
        userId: user._id,
        status: { $in: ['sent', 'viewed'] },
        dueDate: {
          $gte: moment().startOf('day').toDate(),
          $lte: moment().add(3, 'days').endOf('day').toDate()
        }
      }).populate('contactId', 'name phone email');

      for (const bill of bills) {
        try {
          await sendBillingReminder(bill, user);
        } catch (error) {
          console.error('Cron billing reminder error:', error);
        }
      }
    }
  } catch (error) {
    console.error('Cron billing reminders error:', error);
  }
});

module.exports = router;
