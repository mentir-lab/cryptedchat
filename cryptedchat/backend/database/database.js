var admin = require("firebase-admin");
require('dotenv').config();

admin.initializeApp({
    credential: admin.credential.cert(
        {
            "type": process.env.TYPE,
            "project_id": process.env.ID,
            "private_key_id": process.env.PRIVATE_KEY_ID,
            "private_key": process.env.PRIVATE_KEY,
            "client_email": process.env.EMAIL,
            "client_id": process.env.CLIENT_ID,
            "auth_uri": process.env.AUTH,
            "token_uri": process.env.TOKEN,
            "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER,
            "client_x509_cert_url": process.env.CLIENT_URL,
            "universe_domain": process.env.DOMAIN
        }
    ),
    databaseURL: "https://cryptedbase-36c89-default-rtdb.europe-west1.firebasedatabase.app"
});
module.exports = { admin }