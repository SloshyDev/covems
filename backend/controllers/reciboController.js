const pool = require('../config/database');
const zlib = require('zlib');
const { formatDateYMD } = require('../utils/dateFormat');

// Lógica para procesar pólizas y recibos
const processPolizasRecibos = async (polizas, recibos, req, res) => {
    console.log('INICIO processPolizasRecibos');
    if (!Array.isArray(polizas) || polizas.length === 0 || !Array.isArray(recibos) || recibos.length === 0) {
        console.log('No hay datos para procesar');
        return res.status(400).json({ error: 'No hay datos para procesar.' });
    }
    // Validar que todas las pólizas existan en la base de datos
    const polizasExistentes = [];
    for (const poliza of polizas) {
        const polizaRes = await pool.query('SELECT 1 FROM polizas WHERE no_poliza = $1', [poliza.no_poliza]);
        if (polizaRes.rows.length > 0) {
            polizasExistentes.push(poliza);
        }
    }
    console.log('Polizas existentes:', polizasExistentes.length);
    if (polizasExistentes.length === 0) {
        console.log('No hay pólizas válidas para procesar');
        return res.status(400).json({ error: 'No hay pólizas válidas para procesar.' });
    }
    // Filtrar recibos que correspondan a pólizas existentes
    let recibosFiltrados = recibos.filter(r => polizasExistentes.some(p => p.no_poliza === r.no_poliza));
    console.log('Recibos filtrados:', recibosFiltrados.length);
    // Eliminar recibos duplicados (por No. poliza, Fecha movimiento y Dsn)
    const recibosUnicos = [];
    for (const recibo of recibosFiltrados) {
        const existe = await pool.query(
            'SELECT 1 FROM recibos WHERE no_poliza = $1 AND fecha_movimiento = $2 AND dsn = $3',
            [recibo.no_poliza, recibo.fecha_movimiento, recibo.dsn]
        );
        if (existe.rows.length === 0) {
            recibosUnicos.push(recibo);
        }
    }
    console.log('Recibos únicos para insertar:', recibosUnicos.length);
    if (recibosUnicos.length === 0) {
        console.log('Todos los recibos ya existen en la base de datos');
        return res.status(400).json({ error: 'Todos los recibos ya existen en la base de datos.' });
    }
    let recibos_insertados = 0;
    let detalles = [];
    try {
        // Solo insertar recibos
        for (const row of recibosUnicos) {
            let solicitud_ligada = null;
            if (row.no_poliza) {
                const solicitudRes = await pool.query(
                    'SELECT no_solicitud FROM solicitudes WHERE no_poliza = $1',
                    [row.no_poliza]
                );
                if (solicitudRes.rows.length > 0) {
                    solicitud_ligada = solicitudRes.rows[0].no_solicitud;
                }
            }
            
            // Sanitize date fields
            const fecha_inicio = row.fecha_inicio && String(row.fecha_inicio).trim() !== '' ? row.fecha_inicio : null;
            const fecha_movimiento = row.fecha_movimiento && String(row.fecha_movimiento).trim() !== '' ? row.fecha_movimiento : null;
            const fecha_vencimiento = row.fecha_vencimiento && String(row.fecha_vencimiento).trim() !== '' ? row.fecha_vencimiento : null;
            
            // Sanitize numeric fields
            const prima_fracc = row.prima_fracc && String(row.prima_fracc).trim() !== '' ? Math.round(Number(row.prima_fracc) * 100) / 100 : null;
            const recargo_fijo = row.recargo_fijo && String(row.recargo_fijo).trim() !== '' ? Math.round(Number(row.recargo_fijo) * 100) / 100 : null;
            const importe_comble = row.importe_comble && String(row.importe_comble).trim() !== '' ? Math.round(Number(row.importe_comble) * 100) / 100 : null;
            const porcentaje_comis = row.porcentaje_comis && String(row.porcentaje_comis).trim() !== '' ? Math.round(Number(row.porcentaje_comis) * 100) / 100 : null;
            const nivelacion_variable = row.nivelacion_variable && String(row.nivelacion_variable).trim() !== '' ? Math.round(Number(row.nivelacion_variable) * 100) / 100 : null;
            const comis_primer_ano = row.comis_primer_ano && String(row.comis_primer_ano).trim() !== '' ? Math.round(Number(row.comis_primer_ano) * 100) / 100 : null;
            const comis_renovacion = row.comis_renovacion && String(row.comis_renovacion).trim() !== '' ? Math.round(Number(row.comis_renovacion) * 100) / 100 : null;
            const ano_vig = row.ano_vig && String(row.ano_vig).trim() !== '' ? Math.round(Number(row.ano_vig) * 100) / 100 : null;
            const comis_promo = row.comis_promo && String(row.comis_promo).trim() !== '' ? Math.round(Number(row.comis_promo) * 100) / 100 : null;
            const comis_agente = row.comis_agente && String(row.comis_agente).trim() !== '' ? Math.round(Number(row.comis_agente) * 100) / 100 : null;
            
            let comis_agente_calc = comis_agente;
            // Calcular comis_agente si DSN es EMI
            if ((row.dsn || '').toString().trim().toUpperCase() === 'EMI') {
                const prima = Number(prima_fracc) || 0;
                const recargo = Number(recargo_fijo) || 0;
                const formaPago = (row.forma_pago || '').toString().trim().toUpperCase();
                let factor = 1;
                if (formaPago === 'H') factor = 24;
                else if (formaPago === 'M') factor = 12;
                comis_agente_calc = Math.round(((prima - recargo) * factor * 0.225) * 100) / 100;
            }
            
            const comis_super = row.comis_super && String(row.comis_super).trim() !== '' ? Math.round(Number(row.comis_super) * 100) / 100 : null;
            
            await pool.query(
                `INSERT INTO recibos (
                    grupo, clave_agente, no_poliza, nombre_asegurado, recibo, dsn, fecha_inicio, fecha_ultimo_mov, fecha_vencimiento, forma_pago, estatus, solicitud_ligada,
                    prima_fracc, recargo_fijo, importe_comble, porcentaje_comis, nivelacion_variable, comis_primer_ano, comis_renovacion,
                    ano_vig, comis_promo, comis_agente, comis_super, clave_supervisor
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
                [
                    row.grupo,
                    row.clave_agente || null, // Permitir null
                    row.no_poliza,
                    row.nombre_asegurado,
                    row.recibo,
                    row.dsn,
                    fecha_inicio,
                    fecha_movimiento,
                    fecha_vencimiento,
                    row.forma_pago,
                    row.estatus,
                    solicitud_ligada,
                    prima_fracc,
                    recargo_fijo,
                    importe_comble,
                    porcentaje_comis,
                    nivelacion_variable,
                    comis_primer_ano,
                    comis_renovacion,
                    ano_vig,
                    comis_promo,
                    comis_agente_calc,
                    comis_super,
                    row.clave_supervisor
                ]
            );
            recibos_insertados++;
            detalles.push({
                no_poliza: row.no_poliza,
                recibo: row.recibo,
                solicitud_ligada
            });
        }
        console.log('Recibos insertados:', recibos_insertados);
        res.json({ recibos_insertados, detalles });
    } catch (error) {
        console.error('Error procesando polizas/recibos:', error);
        if (error.code === '23502' && error.column === 'clave_agente') {
            return res.status(400).json({
                error: "Error: Se intentó insertar un registro con clave_agente nulo o inválido en la base de datos.",
                detalles: error.detail || error.message
            });
        }
        res.status(500).json({ error: 'Error procesando polizas/recibos.', detalles: error.message, stack: error.stack });
    }
};

// Cargar estado de cuenta
const uploadStatement = async (req, res) => {
    console.log('INICIO uploadStatement');
    let polizas, recibos;

    if (req.headers['content-type'] === 'application/octet-stream') {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                console.log('Recibido archivo comprimido');
                const buffer = Buffer.concat(chunks);
                zlib.gunzip(buffer, async (err, result) => {
                    if (err) {
                        console.error('Error descomprimiendo datos:', err);
                        return res.status(400).json({ error: 'Error descomprimiendo datos.' });
                    }
                    let data;
                    try {
                        data = JSON.parse(result.toString());
                        console.log('JSON descomprimido correctamente');
                    } catch (e) {
                        console.error('JSON inválido tras descompresión:', e);
                        return res.status(400).json({ error: 'JSON inválido tras descompresión.' });
                    }
                    polizas = data.polizas;
                    recibos = data.recibos;
                    await processPolizasRecibos(polizas, recibos, req, res);
                });
            } catch (e) {
                console.error('Error procesando datos comprimidos:', e);
                return res.status(400).json({ error: 'Error procesando datos comprimidos.' });
            }
        });
        return;
    } else {
        console.log('Recibido datos por JSON normal');
        polizas = req.body.polizas;
        recibos = req.body.recibos;
        await processPolizasRecibos(polizas, recibos, req, res);
        return;
    }
};

// Buscar pólizas
const buscarPolizas = async (req, res) => {
    const q = (req.query.q || '').trim();
    const tipo = (req.query.tipo || '').trim();
    if (!q) {
        return res.status(400).json({ error: 'Debe proporcionar un parámetro de búsqueda (q).' });
    }
    try {
        let result;
        if (tipo === 'poliza') {
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.no_poliza ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else if (tipo === 'nombre_asegurado') {
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.nombre_asegurado ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else if (tipo === 'agente') {
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.clave_agente::text ILIKE $1 OR u.nombre ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else if (tipo === 'promotoria') {
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.promotoria ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else {
            // Búsqueda flexible
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.no_poliza ILIKE $1
                   OR p.clave_agente::text ILIKE $1
                   OR u.nombre ILIKE $1
                   OR p.nombre_asegurado ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error buscando pólizas:', error);
        res.status(500).json({ error: 'Error buscando pólizas.' });
    }
};

// Buscar recibos por rango de fechas
const buscarRecibosPorFecha = async (req, res) => {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Debes proporcionar las fechas "inicio" y "fin" en formato YYYY-MM-DD.' });
    }
    try {        const result = await pool.query(
            `SELECT r.no_poliza, r.recibo, r.fecha_ultimo_mov AS fecha_movimiento, r.nombre_asegurado, 
                    r.clave_agente, r.comis_agente, r.comis_super, r.comis_promo, r.clave_supervisor,
                    u.nombre as nombre_agente
             FROM recibos r
             LEFT JOIN users u ON r.clave_agente::text = u.clave::text
             WHERE r.fecha_ultimo_mov >= $1 AND r.fecha_ultimo_mov <= $2
             AND (u.estado IS NULL OR u.estado != 'cancelado')
             ORDER BY r.fecha_ultimo_mov ASC`,
            [inicio, fin]
        );
        // Formatear fechas antes de enviar la respuesta
        const rowsFormateadas = result.rows.map(row => ({
            ...row,
            fecha_movimiento: formatDateYMD(row.fecha_movimiento),
            fecha_inicio: formatDateYMD(row.fecha_inicio),
            fecha_vencimiento: formatDateYMD(row.fecha_vencimiento),
        }));
        res.json(rowsFormateadas);
    } catch (error) {
        console.error('Error buscando recibos por fecha:', error);
        res.status(500).json({ error: 'Error buscando recibos por fecha.' });
    }
};

// Buscar recibos detallados por clave de agente y fecha
const buscarRecibosDetalladosPorAgente = async (req, res) => {
    const { clave } = req.params;
    const { inicio, fin } = req.query;
    
    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Debes proporcionar las fechas "inicio" y "fin" en formato YYYY-MM-DD.' });
    }
    
    try {
        const result = await pool.query(
            `SELECT 
                r.no_poliza, 
                r.recibo, 
                r.fecha_ultimo_mov AS fecha_movimiento, 
                r.nombre_asegurado, 
                r.clave_agente, 
                r.comis_agente, 
                r.comis_super, 
                r.comis_promo,
                r.prima_fracc,
                r.recargo_fijo,
                r.forma_pago,
                r.dsn,
                r.estatus,
                r.fecha_inicio,
                r.fecha_vencimiento,
                r.solicitud_ligada,
                p.grupo,
                p.fecha_inicio AS poliza_fecha_inicio,
                p.estatus AS poliza_estatus,
                u.nombre AS nombre_agente
             FROM recibos r
             LEFT JOIN polizas p ON r.no_poliza = p.no_poliza
             LEFT JOIN users u ON r.clave_agente::text = u.clave::text
             WHERE r.clave_agente::text = $1
             AND r.fecha_ultimo_mov >= $2 AND r.fecha_ultimo_mov <= $3
             AND (u.estado IS NULL OR u.estado != 'cancelado')
             ORDER BY r.fecha_ultimo_mov ASC`,
            [clave, inicio, fin]
        );
        // Formatear fechas antes de enviar la respuesta
        const rowsFormateadas = result.rows.map(row => ({
            ...row,
            fecha_movimiento: formatDateYMD(row.fecha_movimiento),
            fecha_inicio: formatDateYMD(row.fecha_inicio),
            fecha_vencimiento: formatDateYMD(row.fecha_vencimiento),
        }));
        res.json(rowsFormateadas);
    } catch (error) {
        console.error('Error buscando recibos detallados:', error);
        res.status(500).json({ error: 'Error buscando recibos detallados.' });
    }
};

const verificarRecibosExistentes = async (req, res) => {
    try {
        const recibos = req.body.recibos; // [{ no_poliza, recibo }]
        if (!Array.isArray(recibos) || recibos.length === 0) {
            return res.status(400).json({ error: 'No se enviaron recibos para verificar.' });
        }
        // Construir consulta dinámica
        const values = [];
        const conditions = recibos.map((r, i) => {
            values.push(r.no_poliza, r.recibo);
            return `(no_poliza = $${i * 2 + 1} AND recibo = $${i * 2 + 2})`;
        });
        const query = `SELECT no_poliza, recibo FROM recibos WHERE ${conditions.join(' OR ')}`;
        const result = await pool.query(query, values);
        return res.json({ existentes: result.rows });
    } catch (err) {
        return res.status(500).json({ error: 'Error verificando recibos existentes', details: err.message });
    }
};

module.exports = {
    uploadStatement,
    buscarPolizas,
    buscarRecibosPorFecha,
    buscarRecibosDetalladosPorAgente,
    verificarRecibosExistentes
};

console.log('Servidor backend iniciado');
