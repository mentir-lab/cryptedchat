const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/protectedauth');

router.get('/protected', verifyToken, (req, res) => {
    res.json({
        message: '������ ��������',
        user: req.user
    });
});

module.exports = router;