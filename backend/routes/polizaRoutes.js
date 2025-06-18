const express = require('express');
const router = express.Router();
const { buscarPolizas } = require('../controllers/reciboController');

// Rutas de pólizas
router.get('/buscar', buscarPolizas);

module.exports = router;
