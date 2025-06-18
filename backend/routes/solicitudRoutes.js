const express = require('express');
const router = express.Router();
const {
    createSolicitud,
    getAllSolicitudes,
    updatePolizasLote
} = require('../controllers/solicitudController');

// Rutas de solicitudes
router.post('/', createSolicitud);
router.get('/', getAllSolicitudes);
router.post('/update-polizas', updatePolizasLote);

module.exports = router;
