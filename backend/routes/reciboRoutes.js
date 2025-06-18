const express = require('express');
const router = express.Router();
const {
    uploadStatement,
    buscarPolizas,
    buscarRecibosPorFecha
} = require('../controllers/reciboController');

// Rutas de recibos y pólizas
router.post('/upload-statement', uploadStatement);
router.get('/por-fecha', buscarRecibosPorFecha);

module.exports = router;
