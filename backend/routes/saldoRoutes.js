const express = require('express');
const router = express.Router();
const { addSaldo, getSaldosByClave } = require('../controllers/saldoController');

// Rutas de saldos
router.post('/', addSaldo);
router.get('/:clave', getSaldosByClave);

module.exports = router;
