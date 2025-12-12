const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// DB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/contactdb';
mongoose.connect(MONGO_URL)
  .then(()=> console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connect error', err));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
const contactRoutes = require('./routes/contactRoutes');
app.use('/', contactRoutes);

app.listen(PORT, ()=> {
  console.log('Server running on http://localhost:' + PORT);
});
