import {
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from './firebase.js';


// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('ok loaded');
    // Обработка регистрации (если форма существует)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('finded register');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const responseContainer = document.getElementById('response') || document.createElement('div');

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: e.target.email.value,
                        displayName: e.target.nick.value,
                        password: e.target.password.value
                    })
                });

                const result = await response.json();
                console.log('ok');
                if (result.success) {
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
                    window.location.href = '/login';
                    e.target.reset();
                } else {
                    responseContainer.innerHTML = `
            <div class="error">${result.error || 'Registration failed'}</div>
          `;
                }
            } catch (error) {
                responseContainer.innerHTML = `
          <div class="error">${error.message || 'Network error'}</div>
        `;
            }
        });
    }

    // Обработка входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const responseContainer = document.getElementById('response')

            try {
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    e.target.email.value,
                    e.target.password.value
                );
                window.location.href = '/chat';
            } catch (error) {
                responseContainer.innerHTML = `
          <div class="error">${error.message.replace('firebase','') || 'Network error'}</div>`
            }
        });
    }
});

// Управление сессией
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});

// Функция выхода (если используется)