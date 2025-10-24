const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all clients (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const query = { role: 'client' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const clients = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single client
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const client = await User.findOne({
      _id: req.params.id,
      role: 'client'
    }).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client subscription
router.put('/:id/subscription', adminAuth, async (req, res) => {
  try {
    const { plan, messagesLimit, expiresAt } = req.body;

    const client = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'client' },
      {
        'subscription.plan': plan,
        'subscription.messagesLimit': messagesLimit,
        'subscription.expiresAt': expiresAt ? new Date(expiresAt) : undefined
      },
      { new: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      message: 'Client subscription updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activate/Deactivate client
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;

    const client = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'client' },
      { isActive },
      { new: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      message: `Client ${isActive ? 'activated' : 'deactivated'} successfully`,
      client
    });
  } catch (error) {
    console.error('Update client status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client statistics
router.get('/:id/stats', adminAuth, async (req, res) => {
  try {
    const client = await User.findOne({
      _id: req.params.id,
      role: 'client'
    }).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client's message usage
    const Message = require('../models/Message');
    const Contact = require('../models/Contact');
    const Appointment = require('../models/Appointment');
    const Billing = require('../models/Billing');

    const [messageStats, contactCount, appointmentCount, billingStats] = await Promise.all([
      Message.aggregate([
        { $match: { userId: client._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        }
      ]),
      Contact.countDocuments({ userId: client._id }),
      Appointment.countDocuments({ userId: client._id }),
      Billing.aggregate([
        { $match: { userId: client._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
          }
        }
      ])
    ]);

    const stats = {
      messages: messageStats[0] || { total: 0, sent: 0, delivered: 0, failed: 0 },
      contacts: contactCount,
      appointments: appointmentCount,
      billing: billingStats[0] || { total: 0, totalAmount: 0, paid: 0, paidAmount: 0 },
      subscription: client.subscription,
      whatsappConfig: {
        isActive: client.whatsappConfig.isActive,
        phoneNumberId: client.whatsappConfig.phoneNumberId
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset client message usage
router.post('/:id/reset-usage', adminAuth, async (req, res) => {
  try {
    const client = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'client' },
      { 'subscription.messagesUsed': 0 },
      { new: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      message: 'Client message usage reset successfully',
      client
    });
  } catch (error) {
    console.error('Reset client usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all clients statistics (admin dashboard)
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { role: 'client' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [clientStats, subscriptionStats] = await Promise.all([
      User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
            withWhatsapp: { $sum: { $cond: ['$whatsappConfig.isActive', 1, 0] } }
          }
        }
      ]),
      User.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      clients: clientStats[0] || { total: 0, active: 0, inactive: 0, withWhatsapp: 0 },
      subscriptions: subscriptionStats.reduce((acc, sub) => {
        acc[sub._id] = sub.count;
        return acc;
      }, {})
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get clients overview stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete client
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const client = await User.findOneAndDelete({
      _id: req.params.id,
      role: 'client'
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Note: In a production environment, you might want to soft delete
    // and also handle related data cleanup

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
