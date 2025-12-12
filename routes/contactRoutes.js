const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.get('/', contactController.list);
router.get('/contacts/add', contactController.showAdd);
router.post('/contacts/add', contactController.add);
router.get('/contacts/:id', contactController.detail);
router.post('/contacts/:id/call', contactController.logCall);
router.post('/contacts/:id/notes', contactController.addNote);

router.get('/sync-sheet', contactController.syncContacts);

module.exports = router;
