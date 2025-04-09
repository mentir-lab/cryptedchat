const express = require('express');
const router = express.Router();
const rsaController = require('../controllers/rsaController');

router.post('/createKeys', rsaController.createKeys)
router.post('/encrypt', rsaController.encryptMessage)
router.post('/decrypt', rsaController.decryptMessage)

module.exports = router