const express = require('express');
const Appointment = require('../models/Appointment');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const WhatsAppService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const moment = require('moment');

const router = express.Router();

// Get all appointments
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('contactId', 'name phone email')
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create appointment
router.post('/', auth, async (req, res) => {
  try {
    const {
      contactId,
      title,
      description,
      date,
      time,
      duration,
      location,
      meetingLink,
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

    // Check for conflicts
    const conflict = await Appointment.findOne({
      userId: req.user.userId,
      date: new Date(date),
      time,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    const appointment = new Appointment({
      userId: req.user.userId,
      contactId,
      title,
      description,
      date: new Date(date),
      time,
      duration: duration || 60,
      location,
      meetingLink,
      notes
    });

    await appointment.save();

    // Send confirmation message
    await sendAppointmentConfirmation(appointment, contact);

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      duration,
      location,
      meetingLink,
      notes,
      status
    } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        title,
        description,
        date: date ? new Date(date) : undefined,
        time,
        duration,
        location,
        meetingLink,
        notes,
        status
      },
      { new: true }
    ).populate('contactId', 'name phone email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Send update notification if status changed
    if (status && status !== appointment.status) {
      await sendAppointmentUpdate(appointment);
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Send cancellation message
    await sendAppointmentCancellation(appointment);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointments for a specific date
router.get('/date/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const appointments = await Appointment.find({
      userId: req.user.userId,
      date: {
        $gte: moment(date).startOf('day').toDate(),
        $lte: moment(date).endOf('day').toDate()
      }
    })
    .populate('contactId', 'name phone email')
    .sort({ time: 1 });

    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments by date error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available time slots for a date
router.get('/availability/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const { duration = 60 } = req.query;

    // Get existing appointments for the date
    const existingAppointments = await Appointment.find({
      userId: req.user.userId,
      date: {
        $gte: moment(date).startOf('day').toDate(),
        $lte: moment(date).endOf('day').toDate()
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Generate available time slots (9 AM to 6 PM)
    const availableSlots = [];
    const startHour = 9;
    const endHour = 18;
    const slotDuration = parseInt(duration);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotTime = moment(date).hour(hour).minute(minute);
        
        // Check if slot is available
        const isBooked = existingAppointments.some(apt => {
          const aptTime = moment(apt.date).hour(parseInt(apt.time.split(':')[0])).minute(parseInt(apt.time.split(':')[1]));
          return slotTime.isSame(aptTime) || 
                 (slotTime.isBefore(aptTime) && slotTime.add(slotDuration, 'minutes').isAfter(aptTime));
        });

        if (!isBooked && slotTime.isAfter(moment())) {
          availableSlots.push(timeString);
        }
      }
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send appointment reminder
router.post('/:id/reminder', auth, async (req, res) => {
  try {
    const { type = 'whatsapp', scheduledFor } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('contactId', 'name phone email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const reminder = {
      type,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      status: 'pending'
    };

    appointment.reminders.push(reminder);
    await appointment.save();

    // Send reminder immediately if not scheduled
    if (!scheduledFor) {
      await sendAppointmentReminder(appointment, type);
    }

    res.json({
      message: 'Reminder scheduled successfully',
      reminder
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointment statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || { total: 0, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };

    res.json({
      stats: {
        total: result.total,
        scheduled: result.scheduled,
        confirmed: result.confirmed,
        completed: result.completed,
        cancelled: result.cancelled,
        noShow: result.noShow,
        completionRate: result.total > 0 ? ((result.completed / result.total) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to send appointment confirmation
async function sendAppointmentConfirmation(appointment, contact) {
  try {
    const user = await User.findById(appointment.userId);
    if (!user.whatsappConfig.isActive) return;

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Hi ${contact.name}, your appointment "${appointment.title}" has been scheduled for ${moment(appointment.date).format('MMMM Do YYYY')} at ${appointment.time}. ${appointment.location ? `Location: ${appointment.location}` : ''} ${appointment.meetingLink ? `Meeting Link: ${appointment.meetingLink}` : ''}`;

    await whatsappService.sendTextMessage(contact.phone, message);

    // Log the message
    const messageLog = new Message({
      userId: appointment.userId,
      contactId: contact._id,
      type: 'text',
      content: { text: message },
      status: 'sent',
      sentAt: new Date()
    });
    await messageLog.save();

  } catch (error) {
    console.error('Send appointment confirmation error:', error);
  }
}

// Helper function to send appointment update
async function sendAppointmentUpdate(appointment) {
  try {
    const user = await User.findById(appointment.userId);
    if (!user.whatsappConfig.isActive) return;

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Hi ${appointment.contactId.name}, your appointment "${appointment.title}" has been updated. New time: ${moment(appointment.date).format('MMMM Do YYYY')} at ${appointment.time}. Status: ${appointment.status}`;

    await whatsappService.sendTextMessage(appointment.contactId.phone, message);

  } catch (error) {
    console.error('Send appointment update error:', error);
  }
}

// Helper function to send appointment cancellation
async function sendAppointmentCancellation(appointment) {
  try {
    const user = await User.findById(appointment.userId);
    if (!user.whatsappConfig.isActive) return;

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Hi ${appointment.contactId.name}, your appointment "${appointment.title}" scheduled for ${moment(appointment.date).format('MMMM Do YYYY')} at ${appointment.time} has been cancelled.`;

    await whatsappService.sendTextMessage(appointment.contactId.phone, message);

  } catch (error) {
    console.error('Send appointment cancellation error:', error);
  }
}

// Helper function to send appointment reminder
async function sendAppointmentReminder(appointment, type) {
  try {
    if (type !== 'whatsapp') return;

    const user = await User.findById(appointment.userId);
    if (!user.whatsappConfig.isActive) return;

    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const message = `Reminder: You have an appointment "${appointment.title}" tomorrow at ${appointment.time}. ${appointment.location ? `Location: ${appointment.location}` : ''}`;

    await whatsappService.sendTextMessage(appointment.contactId.phone, message);

  } catch (error) {
    console.error('Send appointment reminder error:', error);
  }
}

module.exports = router;
