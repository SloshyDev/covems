const express = require('express');
const router = express.Router();
const { addSaldo, getSaldosByClave, getSaldosByClaveYFecha, getSaldoMasReciente, getSaldoPendiente, getSaldosDetallePendiente, getInfoCortesSaldo, getMultiplesSaldosPendientes, getMultiplesSaldosDetallePendientes, updateSaldo } = require('../controllers/saldoController');

// Rutas de saldos
router.post('/', addSaldo);
router.post('/multiples-pendientes', getMultiplesSaldosPendientes);
router.post('/multiples-detalle-pendientes', getMultiplesSaldosDetallePendientes);
router.get('/:clave/mas-reciente', getSaldoMasReciente);
router.get('/:clave/por-fecha', getSaldosByClaveYFecha);
router.get('/:clave', getSaldosByClave);
router.get('/:clave/pendiente', getSaldoPendiente);
router.get('/:clave/detalle-pendiente', getSaldosDetallePendiente);
router.get('/:clave/cortes', getInfoCortesSaldo);
router.put('/', updateSaldo);

module.exports = router;
