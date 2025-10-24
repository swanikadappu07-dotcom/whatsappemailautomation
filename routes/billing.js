const express = require('express');
const Billing = require('../models/Billing');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const WhatsAppService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const moment = require('moment');

const router = express.Router();

// Get all bills
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bills = await Billing.find(query)
      .populate('contactId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Billing.countDocuments(query);

    res.json({
      bills,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single bill
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Billing.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json({ bill });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create bill
router.post('/', auth, async (req, res) => {
  try {
    const {
      contactId,
      amount,
      currency = 'USD',
      description,
      items,
      dueDate,
      notes
    } = req.body;

    // Check if contact exists
    const contact = await Contact.findOne({
      _id: contactId,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const bill = new Billing({
      userId: req.user.userId,
      contactId,
      amount,
      currency,
      description,
      items: items || [],
      dueDate: new Date(dueDate),
      notes
    });

    await bill.save();

    res.status(201).json({
      message: 'Bill created successfully',
      bill
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bill
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      amount,
      currency,
      description,
      items,
      dueDate,
      status,
      notes
    } = req.body;

    const bill = await Billing.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        amount,
        currency,
        description,
        items,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        notes
      },
      { new: true }
    ).populate('contactId', 'name phone email');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json({
      message: 'Bill updated successfully',
      bill
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete bill
router.delete('/:id', auth, async (req, res) => {
  try {
    const bill = await Billing.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send bill to customer
router.post('/:id/send', auth, async (req, res) => {
  try {
    const bill = await Billing.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    // Send bill message
    await sendBillNotification(bill, user);

    // Update bill status
    bill.status = 'sent';
    await bill.save();

    res.json({
      message: 'Bill sent successfully',
      bill
    });
  } catch (error) {
    console.error('Send bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark bill as paid
router.post('/:id/paid', auth, async (req, res) => {
  try {
    const { paymentMethod, paymentReference } = req.body;

    const bill = await Billing.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod,
        paymentReference
      },
      { new: true }
    ).populate('contactId', 'name phone email');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Send payment confirmation
    await sendPaymentConfirmation(bill, user);

    res.json({
      message: 'Bill marked as paid',
      bill
    });
  } catch (error) {
    console.error('Mark bill as paid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overdue bills
router.get('/overdue/list', auth, async (req, res) => {
  try {
    const overdueBills = await Billing.find({
      userId: req.user.userId,
      status: { $in: ['sent', 'viewed'] },
      dueDate: { $lt: new Date() }
    })
    .populate('contactId', 'name phone email')
    .sort({ dueDate: 1 });

    res.json({ overdueBills });
  } catch (error) {
    console.error('Get overdue bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send overdue reminders
router.post('/overdue/remind', auth, async (req, res) => {
  try {
    const { billIds } = req.body;

    const bills = await Billing.find({
      _id: { $in: billIds },
      userId: req.user.userId,
      status: { $in: ['sent', 'viewed'] }
    }).populate('contactId', 'name phone email');

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    let sentCount = 0;
    for (const bill of bills) {
      try {
        await sendOverdueReminder(bill, user);
        sentCount++;
      } catch (error) {
        console.error('Send overdue reminder error:', error);
      }
    }

    res.json({
      message: `Overdue reminders sent to ${sentCount} customers`,
      sentCount
    });
  } catch (error) {
    console.error('Send overdue reminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get billing statistics
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

    const stats = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $in: ['$status', ['sent', 'viewed']] }, { $lt: ['$dueDate', new Date()] }] }, 1, 0] } },
          overdueAmount: { $sum: { $cond: [{ $and: [{ $in: ['$status', ['sent', 'viewed']] }, { $lt: ['$dueDate', new Date()] }] }, '$amount', 0] } }
        }
      }
    ]);

    const result = stats[0] || { 
      total: 0, 
      totalAmount: 0, 
      paid: 0, 
      paidAmount: 0, 
      overdue: 0, 
      overdueAmount: 0 
    };

    res.json({
      stats: {
        total: result.total,
        totalAmount: result.totalAmount,
        paid: result.paid,
        paidAmount: result.paidAmount,
        overdue: result.overdue,
        overdueAmount: result.overdueAmount,
        collectionRate: result.totalAmount > 0 ? ((result.paidAmount / result.totalAmount) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate invoice PDF (placeholder - would need PDF generation library)
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const bill = await Billing.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // This would generate a PDF invoice
    // For now, return the bill data
    res.json({
      message: 'PDF generation not implemented yet',
      bill
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to send bill notification
async function sendBillNotification(bill, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Hi ${bill.contactId.name}, you have a new bill for ${bill.currency} ${bill.amount}. Due date: ${moment(bill.dueDate).format('MMMM Do YYYY')}. ${bill.description ? `Description: ${bill.description}` : ''}`;

    await whatsappService.sendTextMessage(bill.contactId.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: bill.userId,
      contactId: bill.contactId._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date()
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send bill notification error:', error);
  }
}

// Helper function to send payment confirmation
async function sendPaymentConfirmation(bill, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Hi ${bill.contactId.name}, thank you for your payment of ${bill.currency} ${bill.amount}. Payment received on ${moment(bill.paidDate).format('MMMM Do YYYY')}.`;

    await whatsappService.sendTextMessage(bill.contactId.phone, message);

  } catch (error) {
    console.error('Send payment confirmation error:', error);
  }
}

// Helper function to send overdue reminder
async function sendOverdueReminder(bill, user) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const daysOverdue = moment().diff(moment(bill.dueDate), 'days');
    const message = `Hi ${bill.contactId.name}, this is a reminder that your bill of ${bill.currency} ${bill.amount} is ${daysOverdue} days overdue. Please make payment as soon as possible.`;

    await whatsappService.sendTextMessage(bill.contactId.phone, message);

    // Log the reminder
    bill.reminders.push({
      sentAt: new Date(),
      type: 'whatsapp',
      status: 'sent'
    });
    await bill.save();

  } catch (error) {
    console.error('Send overdue reminder error:', error);
  }
}

module.exports = router;
