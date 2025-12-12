const Contact = require('../models/Contact');
const Note = require('../models/Note');
const { appendNoteRow, getSheetRows } = require('../helpers/sheetsHelper');

exports.list = async (req, res) => {
  const perPage = 70;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const totalCount = await Contact.countDocuments();
  const totalPages = Math.ceil(totalCount / perPage) || 1;

  const contacts = await Contact.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);

  res.render('contacts/list', { contacts, currentPage: page, totalPages, totalCount, perPage });
};

exports.showAdd = (req, res) => {
  res.render('contacts/add');
};

exports.add = async (req, res) => {
  const { name, phone, description } = req.body;
  await Contact.create({ name, phone, description });
  res.redirect('/');
};

exports.detail = async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  const notes = await Note.find({ contact: contact._id }).sort({ createdAt: -1 });
  res.render('contacts/detail', { contact, notes });
};

// Log a call (called from client before navigating to tel:)
exports.logCall = async (req, res) => {
  try {
    const id = req.params.id;
    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).json({ ok: false, msg: 'Contact not found' });
    contact.lastCallAt = new Date();
    await contact.save();
    res.json({ ok: true, lastCallAt: contact.lastCallAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
};

// Add note and sync to Google Sheets
exports.addNote = async (req, res) => {
  try {
    const id = req.params.id;
    const { noteText } = req.body;
    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).json({ ok: false, msg: 'Contact not found' });
    const note = await Note.create({ contact: contact._id, noteText });
    contact.notesCount = (contact.notesCount || 0) + 1;
    await contact.save();

    // Try to append note to Google Sheet (non-fatal)
    try {
      console.log(`Adding note to Google Sheets for ${contact.name} (${contact.phone})`);
      await appendNoteRow(contact.phone, noteText, note.createdAt, contact.name);
      console.log('Note successfully synced to Google Sheets');
    } catch (sheetErr) {
      console.warn('Google Sheets note sync failed:', sheetErr.message || sheetErr);
    }

    res.json({ ok: true, note });
  } catch (err) {
    console.error('Error adding note:', err);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
};


exports.syncContacts = async (req, res) => {
  try {
    console.log('Starting sync from Google Sheets...');
    const rows = await getSheetRows("Sheet1!A:C");
    console.log('Fetched rows from sheet:', rows);

    let added = 0;
    let updated = 0;

    for (let i = 1; i < rows.length; i++) {
      const phone = rows[i][0];
      const name = rows[i][1] || "Unknown";
      const description = rows[i][2] || "";

      if (!phone) continue;

      const existing = await Contact.findOne({ phone });

      if (existing) {
        existing.name = name;
        existing.description = description;
        await existing.save();
        updated++;
      } else {
        await Contact.create({ name, phone, description });
        added++;
      }
    }

    console.log(`Sync complete: added=${added}, updated=${updated}`);
    res.json({ ok: true, added, updated });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ ok: false, message: err.message || 'Sync failed' });
  }
};

// API: return paginated contacts as JSON for client-side polling
exports.apiList = async (req, res) => {
  try {
    const perPage = 70;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const totalCount = await Contact.countDocuments();
    const totalPages = Math.ceil(totalCount / perPage) || 1;

    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    const rows = contacts.map(c => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      lastCallAt: c.lastCallAt,
      notesCount: c.notesCount || 0,
      createdAt: c.createdAt
    }));

    res.json({ ok: true, contacts: rows, currentPage: page, totalPages, totalCount, perPage });
  } catch (err) {
    console.error('API list error:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};
