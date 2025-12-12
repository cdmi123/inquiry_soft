const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Contact = require('../models/Contact');
const Note = require('../models/Note');

async function seed() {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/contactdb';
  await mongoose.connect(MONGO_URL);
  console.log('Connected to', MONGO_URL);

  await Contact.deleteMany({});
  await Note.deleteMany({});

  const contacts = await Contact.create([
    { name: 'Ravi Jasoliya', phone: '9999999991', description: 'Test contact 1' },
    { name: 'Amit Patel', phone: '9999999992', description: 'Test contact 2' },
    { name: 'Sita Sharma', phone: '9999999993', description: 'Test contact 3' }
  ]);

  await Note.create([
    { contact: contacts[0]._id, noteText: 'Called regarding project, left voicemail.' },
    { contact: contacts[1]._id, noteText: 'Interested in web dev course.' }
  ]);

  // update notesCount
  for (let c of contacts) {
    const cnt = await Note.countDocuments({ contact: c._id });
    c.notesCount = cnt;
    await c.save();
  }

  console.log('Seed completed');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
