const NodeRSA = require('node-rsa');// 2048 бит ключ
const admin = require('../database/database').admin;
const crypto = require('crypto')
const fs = require('fs');
const path = require('path');

// Полный путь к файлу
const keyPath = path.join(__dirname, '../../frontend/public/key.pem');

// Чтение ключа из файла
const keyPem = fs.readFileSync(keyPath, 'utf8');

// Вывод содержимого ключа
const encryptPrivateKey = (privateKey, password) => {
    const algorithm = 'aes-256-cbc'; // Алгоритм шифрования
    const iv = crypto.randomBytes(16); // Генерация вектора инициализации
    const key = crypto.scryptSync(password, 'salt', 32); // Генерация ключа на основе пароля

    const cipher = crypto.createCipheriv(algorithm, key, iv); // Создание шифратора
    let encrypted = cipher.update(privateKey, 'utf8', 'hex'); // Шифрование данных
    encrypted += cipher.final('hex'); // Завершение шифрования

    return {
        iv: iv.toString('hex'), // Вектор инициализации для расшифровки
        encryptedData: encrypted // Шифрованные данные
    };
};
const decryptPrivateKey = (iv, encryptedData, password) => { // Извлечение IV и зашифрованных данных
    const algorithm = 'aes-256-cbc'; // Алгоритм шифрования
    const key = crypto.scryptSync(password, 'salt', 32); // Генерация ключа на основе пароля
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex')); // Создание расшифровывателя

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8'); // Расшифрование данных
    decrypted += decipher.final('utf8'); // Завершение расшифрования

    return decrypted; // Возврат расшифрованного приватного ключа
};

exports.encryptMessage = async (req, res) => {
    try {
        const { message, key } = req.body;
        return res.status(200).json({
            success: true,
            message: encryptPrivateKey(message, key)
        })
    } catch(error) {
        console.log(error)
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
exports.decryptkey = async (req, res) => {
    try {
        const { onkey, key, user, iv } = req.body;
        const pkey = new NodeRSA(decryptPrivateKey(iv, key, user));
        const mykey = pkey.decrypt(onkey, 'utf8')
        return res.status(200).json({
            success: true,
            key: mykey
        })
    } catch (error) {
        console.log(error)
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}
exports.decryptMessage = async (req, res) => {

    try {
        const { message, key } = req.body;
        return res.status(200).json({
            success: true,
            message: decryptPrivateKey(message.iv, message.encryptedData, key)
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
        const { user } = req.body; // Получаем информацию о пользователе из тела запроса; // ID пользователя
        // Ссылка на документ пользователя в Realtime Database
        const userRef = admin.database().ref(`users/${user.uid}`);

        // Проверка существования документа
        userRef.once('value')
            .then(async (snapshot) => {
                if (!snapshot.exists()) {
                    const key = new NodeRSA({ b: 2048 }); // 2048 бит ключ
                    const public = key.exportKey('public')
                    // Сохранение приватного и публичного ключей                   
                    const encryptedKey = encryptPrivateKey(key.exportKey('private'), user.uid)
                    // Документ не существует, создаем новый
                    const newUserData = {
                        publicKey: key.exportKey('public'), // Пример информации о создании
                        iv: encryptedKey.iv,//вектор приватки
                        key: encryptedKey.encryptedData,//приватка
                        onkey: key.encrypt(keyPem, 'base64')// Другие данные, которые вы хотите сохранить
                        // Добавьте любую другую необходимую информацию//зашифрованный симметрия
                    };

                    await userRef.set(newUserData); // Сохранение нового документа

                    // Ответ пользователю
                    return res.status(201).json({
                        success: true // Возвращаем ID пользователя
                         // Клиент может использовать этот токен для входа
                    });
                } else {
                    // Документ уже существует
                    return res.status(200).json({
                        success: true,
                        public: 'Документ пользователя уже существует.',
                       // Клиент может использовать этот токен для входа
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