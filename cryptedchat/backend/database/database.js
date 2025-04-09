var admin = require("firebase-admin");
require('dotenv').config();
var serviceAccount = require("./serviceAccountKeys.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cryptedbase-36c89-default-rtdb.europe-west1.firebasedatabase.app"
});
module.exports = { admin }