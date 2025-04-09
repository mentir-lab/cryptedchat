exports.renderHome = (req, res) => {
    res.redirect('/login');
};

exports.renderLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Вход',
        error: req.query.error
    });
};

exports.renderRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Регистрация',
        error: req.query.error
    });
};

exports.renderChat = (req, res) => {
    // Проверка аутентификации может быть здесь
    res.render('chat/chat', {
        title: 'Чат',
        user: req.user // Если передаёте данные пользователя
    });
};