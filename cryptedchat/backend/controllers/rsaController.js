const NodeRSA = require('node-rsa');// 2048 ��� ����
const admin = require('../database/database').admin;
const crypto = require('crypto')
const fs = require('fs');
const path = require('path');

// ������ ���� � �����
const keyPath = path.join(__dirname, '../../frontend/public/key.pem');

// ������ ����� �� �����
const keyPem = fs.readFileSync(keyPath, 'utf8');

// ����� ����������� �����
const encryptPrivateKey = (privateKey, password) => {
    const algorithm = 'aes-256-cbc'; // �������� ����������
    const iv = crypto.randomBytes(16); // ��������� ������� �������������
    const key = crypto.scryptSync(password, 'salt', 32); // ��������� ����� �� ������ ������

    const cipher = crypto.createCipheriv(algorithm, key, iv); // �������� ���������
    let encrypted = cipher.update(privateKey, 'utf8', 'hex'); // ���������� ������
    encrypted += cipher.final('hex'); // ���������� ����������

    return {
        iv: iv.toString('hex'), // ������ ������������� ��� �����������
        encryptedData: encrypted // ����������� ������
    };
};
const decryptPrivateKey = (iv, encryptedData, password) => { // ���������� IV � ������������� ������
    const algorithm = 'aes-256-cbc'; // �������� ����������
    const key = crypto.scryptSync(password, 'salt', 32); // ��������� ����� �� ������ ������
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex')); // �������� ����������������

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8'); // ������������� ������
    decrypted += decipher.final('utf8'); // ���������� �������������

    return decrypted; // ������� ��������������� ���������� �����
};

exports.encryptMessage = async (req, res) => {
    try {
        const { message, key, onkey, user, iv } = req.body;
        console.log('message1' + message)
        console.log('privatekey1' + key)
        console.log('simmetry1' + onkey)
        console.log('uid1' + user)
        console.log('vector1' + iv)

        const pkey = new NodeRSA(decryptPrivateKey(iv, key, user));
        const mykey = pkey.decrypt(onkey, 'utf8')
        return res.status(200).json({
            success: true,
            message: encryptPrivateKey(message, mykey)
        })
    } catch(error) {
        console.log(error)
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
exports.decryptMessage = async (req, res) => {

    try {
        const { onkey, key, user, message, iv } = req.body;
        console.log('message1' + message.encryptedData + " " + message.iv)
        console.log('privatekey1' + key)
        console.log('simmetry1' + onkey)
        console.log('uid1' + user)
        console.log('vector1' + iv)
        const pkey = new NodeRSA(decryptPrivateKey(iv, key, user));
        const mykey = pkey.decrypt(onkey, 'utf8')
        console.log('decryptedkey' + mykey)
        return res.status(200).json({
            success: true,
            message: decryptPrivateKey(message.iv, message.encryptedData, mykey)
        })
    } catch (error) {
        console.log(error)
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
exports.createKeys = async (req, res) => {
    try {
        const { user } = req.body; // �������� ���������� � ������������ �� ���� �������; // ID ������������
        // ������ �� �������� ������������ � Realtime Database
        const userRef = admin.database().ref(`users/${user.uid}`);

        // �������� ������������� ���������
        userRef.once('value')
            .then(async (snapshot) => {
                if (!snapshot.exists()) {
                    const key = new NodeRSA({ b: 2048 }); // 2048 ��� ����
                    const public = key.exportKey('public')
                    // ���������� ���������� � ���������� ������                   
                    const encryptedKey = encryptPrivateKey(key.exportKey('private'), user.uid)
                    console.log('publickey' + key.exportKey('public'))
                    console.log('privatekey' + encryptedKey.encryptedData)
                    console.log('simmetry' + key.encrypt(keyPem, 'base64'))
                    console.log('uid' + user.uid)
                    console.log('vector' + encryptedKey.iv)
                    // �������� �� ����������, ������� �����
                    const newUserData = {
                        publicKey: key.exportKey('public'), // ������ ���������� � ��������
                        iv: encryptedKey.iv,//������ ��������
                        key: encryptedKey.encryptedData,//��������
                        onkey: key.encrypt(keyPem, 'base64')// ������ ������, ������� �� ������ ���������
                        // �������� ����� ������ ����������� ����������//������������� ���������
                    };

                    await userRef.set(newUserData); // ���������� ������ ���������

                    // ����� ������������
                    return res.status(201).json({
                        success: true // ���������� ID ������������
                         // ������ ����� ������������ ���� ����� ��� �����
                    });
                } else {
                    // �������� ��� ����������
                    return res.status(200).json({
                        success: true,
                        public: '�������� ������������ ��� ����������.',
                       // ������ ����� ������������ ���� ����� ��� �����
                    });
                }
            });
    } catch (error) {
        console.log(error)
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};