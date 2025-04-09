const express = require('express');
const router = express.Router();
const viewsController = require('../controllers/viewsController');

router.get('/', viewsController.renderHome);
router.get('/login', viewsController.renderLogin);
router.get('/register', viewsController.renderRegister);
router.get('/chat', viewsController.renderChat);

module.exports = router;