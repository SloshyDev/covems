const pool = require('../config/database');

// Agregar un saldo
const addSaldo = async (req, res) => {
    const { clave, fecha, saldo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO saldos (clave, fecha, saldo) VALUES ($1, $2, $3) RETURNING *',
            [clave, fecha, saldo]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error insertando saldo:', error);
        res.status(500).send('Error insertando saldo');
    }
};

// Obtener los saldos de un usuario
const getSaldosByClave = async (req, res) => {
    const { clave } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM saldos WHERE clave = $1 ORDER BY fecha DESC',
            [clave]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo saldos:', error);
        res.status(500).send('Error obteniendo saldos');
    }
};

module.exports = {
    addSaldo,
    getSaldosByClave
};
