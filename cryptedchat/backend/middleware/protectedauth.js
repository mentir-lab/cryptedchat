const admin = require('../database/database.js')

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) return res.status(401).json({ error: '����� �����������' });

        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: '�������� �����' });
    }
};

module.exports = verifyToken;