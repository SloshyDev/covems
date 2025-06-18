const cors = require('cors');

const allowedOrigins = [
    'https://covems.com.mx',
    'http://localhost:3001',
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir solicitudes sin origin (como Postman) o si está en la lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    }
};

module.exports = cors(corsOptions);
