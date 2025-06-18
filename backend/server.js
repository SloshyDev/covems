const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Importar middlewares
const corsMiddleware = require('./middleware/cors');

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');
const reciboRoutes = require('./routes/reciboRoutes');
const polizaRoutes = require('./routes/polizaRoutes');
const saldoRoutes = require('./routes/saldoRoutes');

const app = express();

// Middlewares
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(corsMiddleware);

// Configurar rutas
app.use('/api/users', userRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/recibos', reciboRoutes);
app.use('/api/polizas', polizaRoutes);
app.use('/api/saldos', saldoRoutes);

// Rutas específicas para mantener compatibilidad
app.get('/api/agentes', require('./controllers/userController').getAgentes);
app.get('/api/supervisores', require('./controllers/userController').getSupervisores);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});