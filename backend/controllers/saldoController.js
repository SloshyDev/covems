const pool = require('../config/database');
const { formatDateYMD } = require('../utils/dateFormat');

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
        // Formatear fechas en los resultados
        const rowsFormateadas = result.rows.map(row => ({
            ...row,
            fecha: formatDateYMD(row.fecha),
        }));
        res.json(rowsFormateadas);
    } catch (error) {
        console.error('Error obteniendo saldos:', error);
        res.status(500).send('Error obteniendo saldos');
    }
};

// Obtener saldos por clave y rango de fechas
const getSaldosByClaveYFecha = async (req, res) => {
    const { clave } = req.params;
    const { inicio, fin } = req.query;
    console.log(`getSaldosByClaveYFecha: clave=${clave}, inicio=${inicio}, fin=${fin}`);
    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }
    try {
        const result = await pool.query(
            'SELECT * FROM saldos WHERE clave = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha DESC',
            [clave, inicio, fin]
        );
        console.log('Resultados SQL:', result.rows);
        // Formatear fechas en los resultados
        const rowsFormateadas = result.rows.map(row => ({
            ...row,
            fecha: formatDateYMD(row.fecha),
        }));
        console.log('Resultados formateados:', rowsFormateadas);
        res.json(rowsFormateadas);
    } catch (error) {
        console.error('Error obteniendo saldos por fecha:', error);
        res.status(500).send('Error obteniendo saldos por fecha');
    }
};

// Obtener el saldo más reciente por clave (hasta una fecha límite)
const getSaldoMasReciente = async (req, res) => {
    const { clave } = req.params;
    const { fechaLimite } = req.query;
    
    try {
        const query = fechaLimite 
            ? 'SELECT * FROM saldos WHERE clave = $1 AND fecha <= $2 ORDER BY fecha DESC LIMIT 1'
            : 'SELECT * FROM saldos WHERE clave = $1 ORDER BY fecha DESC LIMIT 1';
        
        const params = fechaLimite ? [clave, fechaLimite] : [clave];
        const result = await pool.query(query, params);
        
        // Formatear fecha en el resultado
        if (result.rows.length > 0) {
            const row = result.rows[0];
            row.fecha = formatDateYMD(row.fecha);
            res.json(row);
        } else {
            res.json({ clave, fecha: null, saldo: 0 });
        }
    } catch (error) {
        console.error('Error obteniendo saldo más reciente:', error);
        res.status(500).send('Error obteniendo saldo más reciente');
    }
};

// Obtener el saldo más reciente por clave (dentro del rango o anterior, nunca posterior)
const getSaldoPendiente = async (req, res) => {
    const { clave } = req.params;
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }

    try {
        // Buscar todos los saldos dentro del rango, ordenados por fecha ASC (más antiguo primero)
        let result = await pool.query(
            'SELECT * FROM saldos WHERE clave = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha ASC',
            [clave, inicio, fin]
        );        // Buscar el saldo base (último saldo antes del rango - corte anterior)
        let saldoAnterior = await pool.query(
            'SELECT * FROM saldos WHERE clave = $1 AND fecha < $2 ORDER BY fecha DESC LIMIT 1',
            [clave, inicio]
        );
        
        let saldoTotal = 0;
        let fechaBase = null;
        
        // Inicializar con el saldo base del corte anterior
        if (saldoAnterior.rows.length > 0) {
            saldoTotal = saldoAnterior.rows[0].saldo;
            fechaBase = saldoAnterior.rows[0].fecha;
        }
        
        // Sumar/restar todos los ajustes dentro del rango
        for (let i = 0; i < result.rows.length; i++) {
            if (i === 0 && saldoAnterior.rows.length === 0) {
                // Si no hay saldo anterior, el primer saldo del rango es el base
                saldoTotal = result.rows[i].saldo;
                fechaBase = result.rows[i].fecha;
            } else {
                // Sumar los ajustes del período
                saldoTotal += result.rows[i].saldo;
            }
        }
        
        // Usar la fecha más reciente para el resultado
        if (result.rows.length > 0) {
            fechaBase = result.rows[result.rows.length - 1].fecha;
        }
        // Formatear fechaBase
        if (fechaBase) fechaBase = formatDateYMD(fechaBase);
        // Formatear fechas en los resultados
        const rowsFormateadas = result.rows.map(row => ({
            ...row,
            fecha: formatDateYMD(row.fecha),
        }));
        // Si hay saldo base o algún saldo en el rango, devolver resultado
        if (fechaBase !== null || result.rows.length > 0) {
            res.json({ clave, fecha: fechaBase, saldo: saldoTotal, detalles: rowsFormateadas });
        } else {
            res.json({ clave, fecha: null, saldo: 0 });
        }
    } catch (error) {
        console.error('Error obteniendo saldo pendiente:', error);
        res.status(500).send('Error obteniendo saldo pendiente');
    }
};

// Obtener detalle de saldos pendientes (incluyendo saldo anterior si es negativo)
const getSaldosDetallePendiente = async (req, res) => {
    const { clave } = req.params;
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }

    try {
        // Buscar TODOS los saldos dentro del rango, ordenados por fecha ASC
        let result = await pool.query(
            'SELECT fecha, saldo FROM saldos WHERE clave = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha ASC',
            [clave, inicio, fin]
        );        // Buscar el saldo base: último saldo ANTES del rango de fechas (para cortes cada 6 días)
        let saldoBase = await pool.query(
            'SELECT fecha, saldo FROM saldos WHERE clave = $1 AND fecha < $2 ORDER BY fecha DESC LIMIT 1',
            [clave, inicio]
        );
        
        let saldoAnteriorNegativo = null;
        if (saldoBase.rows.length > 0) {
            // Tomar el último saldo antes del rango como saldo inicial
            saldoAnteriorNegativo = {
                fecha: saldoBase.rows[0].fecha,
                saldo: saldoBase.rows[0].saldo
            };
        } else {
            // Si no hay saldo antes del rango, buscar el último saldo negativo histórico
            let ultimoSaldoNegativo = await pool.query(
                'SELECT fecha, saldo FROM saldos WHERE clave = $1 AND saldo < 0 ORDER BY fecha DESC LIMIT 1',
                [clave]
            );
            
            if (ultimoSaldoNegativo.rows.length > 0) {
                saldoAnteriorNegativo = {
                    fecha: ultimoSaldoNegativo.rows[0].fecha,
                    saldo: ultimoSaldoNegativo.rows[0].saldo
                };
            }
        }
        // Formatear fechas en los resultados
        if (saldoAnteriorNegativo && saldoAnteriorNegativo.fecha) {
            saldoAnteriorNegativo.fecha = formatDateYMD(saldoAnteriorNegativo.fecha);
        }
        const saldosRangoFormateados = result.rows.map(r => ({ fecha: formatDateYMD(r.fecha), saldo: r.saldo }));
        res.json({ saldoAnteriorNegativo, saldosRango: saldosRangoFormateados });
    } catch (error) {
        console.error('Error obteniendo detalle de saldos pendientes:', error);
        res.status(500).send('Error obteniendo detalle de saldos pendientes');
    }
};

// Función utilitaria para obtener información de cortes de saldo
const getInfoCortesSaldo = async (req, res) => {
    const { clave } = req.params;
    
    try {
        // Obtener todos los saldos del agente ordenados por fecha
        const result = await pool.query(
            'SELECT fecha, saldo FROM saldos WHERE clave = $1 ORDER BY fecha ASC',
            [clave]
        );
        
        // Calcular diferencias entre cortes
        const cortesConDiferencias = result.rows.map((corte, index) => {
            if (index === 0) {
                return {
                    fecha: corte.fecha,
                    saldo: corte.saldo,
                    diferencia: corte.saldo, // Primera entrada
                    tipo: corte.saldo >= 0 ? 'positivo' : 'negativo'
                };
            } else {
                const diferencia = corte.saldo - result.rows[index - 1].saldo;
                return {
                    fecha: corte.fecha,
                    saldo: corte.saldo,
                    diferencia: diferencia,
                    tipo: diferencia >= 0 ? 'mejora' : 'empeora'
                };
            }
        });
        
        res.json({
            clave,
            totalCortes: result.rows.length,
            cortes: cortesConDiferencias,
            ultimoSaldo: result.rows.length > 0 ? result.rows[result.rows.length - 1].saldo : 0
        });
    } catch (error) {
        console.error('Error obteniendo información de cortes:', error);
        res.status(500).send('Error obteniendo información de cortes');
    }
};

// Obtener múltiples saldos pendientes de una vez
const getMultiplesSaldosPendientes = async (req, res) => {
    const { claves } = req.body; // Array de claves
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }

    if (!claves || !Array.isArray(claves) || claves.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de claves' });
    }

    try {
        const resultados = {};

        // Procesar todas las claves en paralelo
        await Promise.all(claves.map(async (clave) => {
            try {
                // Buscar todos los saldos dentro del rango, ordenados por fecha ASC
                let result = await pool.query(
                    'SELECT * FROM saldos WHERE clave = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha ASC',
                    [clave, inicio, fin]
                );

                // Buscar el saldo base (último saldo antes del rango)
                let saldoAnterior = await pool.query(
                    'SELECT * FROM saldos WHERE clave = $1 AND fecha < $2 ORDER BY fecha DESC LIMIT 1',
                    [clave, inicio]
                );

                let saldoTotal = 0;
                let fechaBase = null;

                if (saldoAnterior.rows.length > 0) {
                    saldoTotal = parseFloat(saldoAnterior.rows[0].saldo) || 0;
                    fechaBase = saldoAnterior.rows[0].fecha;
                } else {
                    saldoTotal = 0;
                    fechaBase = null;
                }

                resultados[clave] = {
                    saldo: saldoTotal,
                    fecha: formatDateYMD(fechaBase)
                };
            } catch (error) {
                console.error(`Error obteniendo saldo pendiente para clave ${clave}:`, error);
                resultados[clave] = {
                    saldo: 0,
                    fecha: null
                };
            }
        }));

        res.json(resultados);
    } catch (error) {
        console.error('Error obteniendo múltiples saldos pendientes:', error);
        res.status(500).send('Error obteniendo múltiples saldos pendientes');
    }
};

// Obtener múltiples saldos detalle-pendientes de una vez
const getMultiplesSaldosDetallePendientes = async (req, res) => {
    const { claves } = req.body; // Array de claves
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }

    if (!claves || !Array.isArray(claves) || claves.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de claves' });
    }

    try {
        const resultados = {};

        // Procesar todas las claves en paralelo
        await Promise.all(claves.map(async (clave) => {
            try {
                // Buscar todos los saldos dentro del rango, ordenados por fecha ASC
                let saldosRango = await pool.query(
                    'SELECT * FROM saldos WHERE clave = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha ASC',
                    [clave, inicio, fin]
                );

                // Buscar el saldo base (último saldo antes del rango)
                let saldoAnterior = await pool.query(
                    'SELECT * FROM saldos WHERE clave = $1 AND fecha < $2 ORDER BY fecha DESC LIMIT 1',
                    [clave, inicio]
                );

                // Formatear fechas en los resultados
                const saldosRangoFormateados = saldosRango.rows.map(row => ({
                    ...row,
                    fecha: formatDateYMD(row.fecha),
                }));
                let saldoAnteriorNegativo = null;
                if (saldoAnterior.rows.length > 0) {
                    saldoAnteriorNegativo = {
                        fecha: formatDateYMD(saldoAnterior.rows[0].fecha),
                        saldo: parseFloat(saldoAnterior.rows[0].saldo) || 0
                    };
                }
                resultados[clave] = {
                    saldoAnteriorNegativo,
                    saldosRango: saldosRangoFormateados
                };
            } catch (error) {
                console.error(`Error obteniendo saldo detalle-pendiente para clave ${clave}:`, error);
                resultados[clave] = {
                    saldoAnteriorNegativo: null,
                    saldosRango: []
                };
            }
        }));

        res.json(resultados);
    } catch (error) {
        console.error('Error obteniendo múltiples saldos detalle-pendientes:', error);
        res.status(500).send('Error obteniendo múltiples saldos detalle-pendientes');
    }
};

// Actualizar o crear saldo (upsert)
const updateSaldo = async (req, res) => {
    const { clave, fecha, saldo } = req.body;
    if (!clave || !fecha || saldo === undefined) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO saldos (clave, fecha, saldo)
             VALUES ($1, $2, $3)
             ON CONFLICT (clave, fecha) DO UPDATE SET saldo = EXCLUDED.saldo
             RETURNING *`,
            [clave, fecha, saldo]
        );
        // Formatear fecha antes de responder
        const row = result.rows[0];
        row.fecha = require('../utils/dateFormat').formatDateYMD(row.fecha);
        res.json(row);
    } catch (error) {
        console.error('Error actualizando saldo:', error);
        res.status(500).json({ error: 'Error actualizando saldo' });
    }
};

module.exports = {
    addSaldo,
    getSaldosByClave,
    getSaldosByClaveYFecha,
    getSaldoMasReciente,
    getSaldoPendiente,
    getSaldosDetallePendiente,
    getInfoCortesSaldo,
    getMultiplesSaldosPendientes,
    getMultiplesSaldosDetallePendientes,
    updateSaldo
};

// =======================================================================================
// LÓGICA DE CORTES CADA 6 DÍAS:
// 
// Ejemplo de funcionamiento:
// - 28 de mayo: Saldo = -500 (último corte)
// - 4 de junio: Saldo = -300 (nuevo corte, ajuste de +200)
// - 10 de junio: Saldo = 100 (nuevo corte, ajuste de +400)
//
// Si consulto del 1 al 8 de junio:
// - Saldo inicial: -500 (del 28 de mayo, último antes del rango)
// - Saldos del rango: 4 de junio = -300
// - Evolución: -500 -> -300 (mejoró +200)
//
// Si consulto del 5 al 15 de junio:
// - Saldo inicial: -300 (del 4 de junio, último antes del 5)
// - Saldos del rango: 10 de junio = 100
// - Evolución: -300 -> 100 (mejoró +400)
// =======================================================================================
