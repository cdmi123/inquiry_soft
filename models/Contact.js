const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  description: { type: String },
  lastCallAt: { type: Date },
  notesCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);
