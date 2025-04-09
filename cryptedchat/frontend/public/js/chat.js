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

let messagesRef;
let userRef;
let currentUser = '';
const profile = {
    'my': {
        'name': 'My profile',
    },
    'other': {
        'name': 'Other profile',
    }
};

// ----- ������������� ���� ----- //
function isEnglish(text) {
    // ���������� ��������� ��� �������� ���������� �������� � ����������
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
        console.log('������������ �� ����������������');
        return null; // ���������� null, ���� ������������ �� ����������������
    }

    const userRef = ref(db, 'users/' + auth.currentUser.uid);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const userData = snapshot.val();

        return {
            key: userData.key,
            onkey: userData.onkey,
            iv: userData.iv
        }
    } else {
        console.log('������ ������������ �� �������');
        return null; // ���������� null, ���� ������ �� �������
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
async function initChat(user) {
    currentUser = user;
    try {
        const response = await fetch('/api/rsa/createKeys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser })
        });
        const result = await response.json();
        console.log('RSA Keys:', result.success ? 'OK' : 'Failed');
    } catch (error) {
        console.error('RSA Keygen Error:', error);
    }

    messagesRef = ref(db, 'messages');
    const keys = await getKeys();

    // ������ ID ��� ����������� ���������, ����� �� ��������� �� ��������
    const displayedMessageIds = new Set();

    // ������������� �� ��������� � ���� ������
    onValue(messagesRef, async (snapshot) => {
        const messagesData = snapshot.val();
        if (!messagesData) return;

        // �������� ��� ��������� � ���� ������� [id, message]
        const messageEntries = Object.entries(messagesData);

        // ��������� ������ ����� ��������� (������� ��� �� ����������)
        const newMessages = messageEntries.filter(([id]) => !displayedMessageIds.has(id));

        if (newMessages.length === 0) return; // ���� ����� ��������� ���, �������

        // ���������� ����� ���������
        const decryptedMessages = await Promise.all(
            newMessages.map(async ([messageId, message]) => {
                try {
                    const response = await fetch('/api/rsa/decrypt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message.text,
                            key: keys.key,
                            onkey: keys.onkey,
                            user: auth.currentUser.uid,
                            iv: keys.iv
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        return { ...message, id: messageId, text: result.message }; // ��������� id ��� ������������
                    } else {
                        console.error('Decryption failed for message:', messageId);
                        return null;
                    }
                } catch (error) {
                    console.error('Decryption error:', error);
                    return null;
                }
            })
        );

        // ��������� ������ ������� �������������� ���������
        decryptedMessages
            .filter(msg => msg !== null)
            .forEach(msg => {
                renderMessage(msg); // �������� ���������
                displayedMessageIds.add(msg.id); // ����������, ��� ��� ��� ����������
            });

        // ������������ ��� ����
        chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
    });
}



// ----- ��������� ��������� ----- //
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

// ----- �������� ��������� ----- //
async function sendMessage() {
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
        // �������� ������ �� ������������ // ���������� await �����
        const keys = await getKeys()
        const response = await fetch('/api/rsa/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: messageText,
                key: keys.key,
                onkey: keys.onkey,
                user: auth.currentUser.uid,
                iv: keys.iv
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
            console.log('�� �� ��');
        }

        chatInput.value = '';
        chatInput.style.height = '40px';
    } catch (error) {
        console.error('������ �������� ���������:', error);
    }
}


// ----- ����������� ������� ----- //
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

// ----- �������� ����������� endpoint ----- //
async function fetchProtectedData(user) {
    try {
        // �������� ������ ID �����
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

// ----- ������������� ��� �������� ----- //
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            try {
                console.log('Access granted, initializing chat');
                await initChat(user);
            } catch (error) {
                console.error('Access verification failed:', error);
                // ���������������� � ����������:
                window.location.href = '/login';
            }
        } else {
            console.warn('No authenticated user');
            // ���������������� � ����������:
            window.location.href = '/login';
        }
    });
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        // ����� �� Firebase Auth
        await auth.signOut();

        // ��������������� �� �������� �����
        window.location.href = '/login'; // �������� �� ��� URL �����
    } catch (error) {
        console.error('������ ��� ������:', error);
        alert('��������� ������ ��� ������� ������');
    }
});