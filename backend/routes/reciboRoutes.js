const express = require('express');
const router = express.Router();
const {
    uploadStatement,
    buscarPolizas,
    buscarRecibosPorFecha,
    buscarRecibosDetalladosPorAgente,
    verificarRecibosExistentes
} = require('../controllers/reciboController');

// Rutas de recibos y pólizas
router.post('/upload-statement', uploadStatement);
router.get('/por-fecha', buscarRecibosPorFecha);
router.get('/agente/:clave/detallado', buscarRecibosDetalladosPorAgente);
router.post('/existentes', verificarRecibosExistentes);

module.exports = router;
