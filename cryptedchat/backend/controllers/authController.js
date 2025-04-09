const admin = require('../database/database').admin;

exports.register = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        // 1. ������ ������������ ����� Admin SDK
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        // 2. ���������� ����� ��� ��������������� �����
        const token = await admin.auth().createCustomToken(userRecord.uid);

        res.status(201).json({
            success: true,
            uid: userRecord.uid,
            token // ������ ����� ������������ ���� ����� ��� �����
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
exports.showRegisterPage = (req, res) => {
    res.render('register'); // ��� Pug
    // ��� ��� HTML:
    // res.sendFile(path.join(__dirname, '../public/register.html'));
};