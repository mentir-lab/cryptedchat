'use strict';
import {
    auth,
    db,
    ref,
    push,
    onValue,
    serverTimestamp,
    off,
    onAuthStateChanged,
    get
} from './firebase.js';
import swearjar from 'https://cdn.skypack.dev/swearjar';
const chatInput = document.querySelector('#chat_input');
const typing = document.querySelector('#typing');
const send = document.querySelector('#send');
const chatMessages = document.querySelector('#chat_messages');
const chatBoxBody = document.querySelector('#chat_box_body');
let currentUser = null
const profile = {
    'my': {
        'name': 'My profile',
    },
    'other': {
        'name': 'Other profile',
    }
};

// ----- Инициализация чата ----- //
function isEnglish(text) {
    // Регулярное выражение для проверки английских символов и пунктуации
    return /^[A-Za-z0-9\s\.,!?\'\"]+$/.test(text);
}
function showEnglishWarning() {
    const modal = document.getElementById('englishModal');
    const btn = document.getElementById('confirmEnglish');

    modal.style.display = 'block';
    const title = document.getElementById('title')
    const reason = document.getElementById('reason')
    title.textContent = "Language Restriction"
    reason.textContent = "Your message contains inappropriate language. Please use english."
    btn.onclick = function () {
        modal.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}
async function getKeys() {
    if (!auth.currentUser) {
        console.log('Пользователь не аутентифицирован');
        return null; // Возвращаем null, если пользователь не аутентифицирован
    }

    const userRef = ref(db, 'users/' + auth.currentUser.uid);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const userData = snapshot.val();
        try {
            const response = await fetch('/api/rsa/decryptKeys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: userData.key,
                    onkey: userData.onkey,
                    user: auth.currentUser.uid,
                    iv: userData.iv
                })
            });
            const result = await response.json();
            return result.key
        } catch (error) {
            console.log(error);
        }
        return 
    } else {
        console.log('Данные пользователя не найдены');
        return null; // Возвращаем null, если данные не найдены
    }
}
function showSwearWarning() {
    const modal = document.getElementById('englishModal');
    const btn = document.getElementById('confirmEnglish');

    modal.style.display = 'block';
    const title = document.getElementById('title')
    const reason = document.getElementById('reason')
    title.textContent = "Censor Restriction"
    reason.textContent = "Please do not use profanity in your speech."
    btn.onclick = function () {
        modal.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}
// Глобальные переменные для управления подписками
let currentKeys = null;
let unsubscribeChat = null;
let displayedMessageIds = new Set();
let isInitialLoad = true; // Флаг первой загрузки
async function initChat(user) {
    currentUser = user;

    // 1. Очистка предыдущей подписки
    if (unsubscribeChat) {
        unsubscribeChat();
        displayedMessageIds.clear();
    }

    // 2. Инициализация ключей
        try {
            const response = await fetch('/api/rsa/createKeys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: user })
            });
            await response.json();
        } catch (error) {
            console.error('RSA Keygen Error:', error);
        }
    

    // 3. Подписка на сообщения
    const messagesRef = ref(db, 'messages');
    currentKeys = await getKeys(); // Получаем ключи один раз перед подпиской

    unsubscribeChat = onValue(messagesRef, async (snapshot) => {
        const messagesData = snapshot.val();
        if (!messagesData || !currentKeys) return;
       
        // Для первой загрузки обрабатываем все сообщения
        const messagesToProcess = isInitialLoad
            ? Object.entries(messagesData)
            : Object.entries(messagesData)
                .filter(([id]) => !displayedMessageIds.has(id));

        if (messagesToProcess.length === 0) {
            isInitialLoad = false;
            return;
        }
        
        // Декодирование
        const decryptedMessages = await Promise.all(
            messagesToProcess.map(async ([messageId, message]) => {
                if (messageId === messagesData.id) {
                    console.log('Сообщение уже обработано:', messagesData.id);
                    return;
                }
                try {
                    const response = await fetch('/api/rsa/decrypt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message.text,
                            key: currentKeys
                        })
                    });
                    const result = await response.json();
                    return result.success
                        ? { ...message, id: messageId, text: result.message }
                        : null;
                } catch (error) {
                    console.error('Decrypt error:', error);
                    return null;
                }
            })
        );

        // Отображение
        decryptedMessages.filter(Boolean).forEach(msg => {
            renderMessage(msg);
            displayedMessageIds.add(msg.id);
        });

        isInitialLoad = false;
        chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
    });
}

// Функция очистки
function cleanupChat() {
    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
    displayedMessageIds.clear();
    isInitialLoad = true;
}

// Функция для ручной очистки



// ----- Рендеринг сообщений ----- //
function renderMessage(message) {
    const isMyMessage = message.uid === currentUser.uid;
    const profileType = isMyMessage ? 'my' : 'other';

    const profileHtml = `
        <div class="profile ${profileType}-profile">
            <span>${isMyMessage ? 'You' + '(' + message.displayName + ')' : message.displayName || 'Other'}</span>
        </div>
    `;

    const messageHtml = `
        <div class="message ${profileType}-message">
            ${message.text}
        </div>
    `;

    chatMessages.insertAdjacentHTML('beforeend', profileHtml + messageHtml);
}

// ----- Отправка сообщений ----- //
async function sendMessage() {
    const messagesRef = ref(db, 'messages');
    const messageText = chatInput.value.trim();
    if (!isEnglish(messageText)) {
        chatInput.value = '';
        showEnglishWarning();
        return;
    }
    if (swearjar.profane(messageText)) {
        chatInput.value = '';
        showSwearWarning();
        return;
    }
    if (!messageText) return;
;

    try {
        // Получаем ссылку на пользователя // Используем await здесь
        const response = await fetch('/api/rsa/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: messageText,
                key: currentKeys
            })
        });

        const result = await response.json();
        if (result.success) {
            await push(messagesRef, {
                text: result.message,
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Anonymous',
                timestamp: serverTimestamp()
            });
        } else {
            console.log('всё не ок');
        }

        chatInput.value = '';
        chatInput.style.height = '40px';
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
    }
}


// ----- Обработчики событий ----- //
chatInput.addEventListener('input', function () {
    this.style.height = '0';
    this.style.height = this.scrollHeight + 1 + 'px';
});

chatInput.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' && !evt.shiftKey) {
        sendMessage();
        evt.preventDefault();
    }
});

send.addEventListener('click', sendMessage);

// ----- Проверка защищенного endpoint ----- //
async function fetchProtectedData(user) {
    try {
        // Получаем свежий ID токен
        const token = await user.getIdToken();
        console.log('Using fresh ID token:', token);

        const response = await fetch('/api/protected', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server responded with:', response.status, errorData);
            throw new Error(`Server responded with ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Network/protected endpoint error:', error);
        throw error;
    }
}

// ----- Инициализация при загрузке ----- //
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            try {
                console.log('Access granted, initializing chat');
                await initChat(user);
            } catch (error) {
                console.error('Access verification failed:', error);
                // Раскомментируйте в продакшене:
            }
        } else {
            console.warn('No authenticated user');
            // Раскомментируйте в продакшене:
            window.location.href = '/login';
        }
    });
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        // Выход из Firebase Auth
        await auth.signOut();

        // Перенаправление на страницу входа
        window.location.href = '/login'; // Измените на ваш URL входа
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        alert('Произошла ошибка при попытке выхода');
    }
});