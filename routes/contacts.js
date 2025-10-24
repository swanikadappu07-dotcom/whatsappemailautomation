const express = require('express');
const Contact = require('../models/Contact');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all contacts
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tags } = req.query;
    const query = { userId: req.user.userId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single contact
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create contact
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, tags, customFields, notes } = req.body;

    const contact = new Contact({
      userId: req.user.userId,
      name,
      phone,
      email,
      tags: tags || [],
      customFields: customFields || [],
      notes
    });

    await contact.save();

    res.status(201).json({
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, tags, customFields, notes } = req.body;

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, phone, email, tags, customFields, notes },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk import contacts from CSV
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const contacts = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const contact = {
            userId: req.user.userId,
            name: row.name || '',
            phone: row.phone || '',
            email: row.email || '',
            tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
            notes: row.notes || ''
          };

          if (contact.name && contact.phone) {
            contacts.push(contact);
          }
        } catch (error) {
          errors.push({ row, error: error.message });
        }
      })
      .on('end', async () => {
        try {
          // Insert contacts in batches
          const batchSize = 100;
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            await Contact.insertMany(batch, { ordered: false });
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Contacts imported successfully',
            imported: contacts.length,
            errors: errors.length
          });
        } catch (error) {
          console.error('Import error:', error);
          res.status(500).json({ message: 'Import failed', error: error.message });
        }
      });
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contact tags
router.get('/tags/list', auth, async (req, res) => {
  try {
    const tags = await Contact.distinct('tags', { userId: req.user.userId });
    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add tag to contact
router.post('/:id/tags', auth, async (req, res) => {
  try {
    const { tag } = req.body;

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $addToSet: { tags: tag } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({
      message: 'Tag added successfully',
      contact
    });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove tag from contact
router.delete('/:id/tags/:tag', auth, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $pull: { tags: req.params.tag } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({
      message: 'Tag removed successfully',
      contact
    });
  } catch (error) {
    console.error('Remove tag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
