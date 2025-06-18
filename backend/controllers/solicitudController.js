const pool = require('../config/database');

// Crear nueva solicitud
const createSolicitud = async (req, res) => {
    const {
        no_solicitud,
        fecha_recepcion,
        nombre_asegurado,
        contratante,
        agente_clave,
        pase,
        prima_ahorro,
        forma_pago,
        prima_solicitada,
        no_poliza
    } = req.body;
    try {
        const query = `
            INSERT INTO solicitudes (
                no_solicitud, fecha_recepcion, nombre_asegurado, contratante, agente_clave, pase, prima_ahorro, forma_pago, prima_solicitada, no_poliza
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const values = [
            no_solicitud,
            fecha_recepcion,
            nombre_asegurado,
            contratante,
            agente_clave,
            pase,
            prima_ahorro,
            forma_pago,
            prima_solicitada,
            no_poliza
        ];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).send('Error creando solicitud.');
    }
};

// Obtener todas las solicitudes
const getAllSolicitudes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM solicitudes ORDER BY no_solicitud ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        res.status(500).send('Error obteniendo solicitudes.');
    }
};

// Actualizar no_poliza en solicitudes en lote
const updatePolizasLote = async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar.' });
    }
    let updated = 0;
    let notFound = [];
    let joined = [];
    try {
        for (const { no_solicitud, no_poliza } of updates) {
            const result = await pool.query(
                `UPDATE solicitudes SET no_poliza = $1 WHERE no_solicitud = $2 RETURNING no_solicitud, no_poliza, agente_clave`,
                [no_poliza, no_solicitud]
            );
            if (result.rowCount === 0) {
                notFound.push(no_solicitud);
            } else {
                updated++;
                const solicitud = result.rows[0];
                let usuario = null;
                if (solicitud && solicitud.agente_clave) {
                    const userRes = await pool.query(
                        'SELECT nombre FROM users WHERE clave = $1',
                        [solicitud.agente_clave]
                    );
                    usuario = userRes.rows[0]?.nombre || null;
                }
                joined.push({
                    no_solicitud: solicitud.no_solicitud,
                    no_poliza: solicitud.no_poliza,
                    agente_clave: solicitud.agente_clave,
                    usuario
                });
            }
        }
        res.json({ updated, notFound, joined });
    } catch (error) {
        console.error('Error actualizando pólizas:', error);
        res.status(500).json({ error: 'Error actualizando pólizas.' });
    }
};

module.exports = {
    createSolicitud,
    getAllSolicitudes,
    updatePolizasLote
};
