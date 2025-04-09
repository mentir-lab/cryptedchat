exports.renderHome = (req, res) => {
    res.redirect('/login');
};

exports.renderLogin = (req, res) => {
    res.render('auth/login', {
        title: '����',
        error: req.query.error
    });
};

exports.renderRegister = (req, res) => {
    res.render('auth/register', {
        title: '�����������',
        error: req.query.error
    });
};

exports.renderChat = (req, res) => {
    // �������� �������������� ����� ���� �����
    res.render('chat/chat', {
        title: '���',
        user: req.user // ���� �������� ������ ������������
    });
};