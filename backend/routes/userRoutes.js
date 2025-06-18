const express = require('express');
const router = express.Router();
const {
    createUser,
    getLastClave,
    getSupervisores,
    getAllUsers,
    updateUser,
    getAgentes
} = require('../controllers/userController');

// Rutas de usuarios
router.post('/', createUser);
router.get('/last-clave/:tipoUsuario', getLastClave);
router.get('/supervisores', getSupervisores);
router.get('/agentes', getAgentes);
router.get('/', getAllUsers);
router.put('/:id', updateUser);

module.exports = router;
