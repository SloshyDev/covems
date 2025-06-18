const pool = require('../config/database');
const zlib = require('zlib');

// Lógica para procesar pólizas y recibos
const processPolizasRecibos = async (polizas, recibos, req, res) => {
    if (!Array.isArray(polizas) || polizas.length === 0 || !Array.isArray(recibos) || recibos.length === 0) {
        return res.status(400).json({ error: 'No hay datos para procesar.' });
    }
    
    // Backend validation for clave_agente
    const invalidPolizas = polizas.filter(p => !p.clave_agente || isNaN(Number(p.clave_agente)) || String(p.clave_agente).trim() === '' || p.clave_agente === 'SIN_AGENTE');
    const invalidRecibos = recibos.filter(r => !r.clave_agente || isNaN(Number(r.clave_agente)) || String(r.clave_agente).trim() === '' || r.clave_agente === 'SIN_AGENTE');
    
    if (invalidPolizas.length > 0 || invalidRecibos.length > 0) {
        return res.status(400).json({
            error: 'Algunos registros tienen clave_agente inválida o faltante.',
            detalles: {
                polizas: invalidPolizas.map(p => ({ no_poliza: p.no_poliza, clave_agente: p.clave_agente })),
                recibos: invalidRecibos.map(r => ({ no_poliza: r.no_poliza, recibo: r.recibo, clave_agente: r.clave_agente }))
            }
        });
    }
    
    let recibos_insertados = 0;
    let polizas_insertadas = 0;
    let detalles = [];
    
    try {
        // 1. Insertar/actualizar polizas únicas
        for (const poliza of polizas) {
            let solicitud_ligada = poliza.solicitud_ligada;
            if (!solicitud_ligada && poliza.no_poliza) {
                const solicitudRes = await pool.query(
                    'SELECT no_solicitud FROM solicitudes WHERE no_poliza = $1',
                    [poliza.no_poliza]
                );
                if (solicitudRes.rows.length > 0) {
                    solicitud_ligada = solicitudRes.rows[0].no_solicitud;
                }
            }
            await pool.query(
                `INSERT INTO polizas (
                    grupo, clave_agente, no_poliza, nombre_asegurado, ultimo_recibo, dsn, fecha_inicio, fecha_ultimo_mov, forma_pago, estatus, solicitud_ligada
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                ON CONFLICT (no_poliza) DO UPDATE SET
                    grupo=EXCLUDED.grupo,
                    clave_agente=EXCLUDED.clave_agente,
                    nombre_asegurado=EXCLUDED.nombre_asegurado,
                    ultimo_recibo=EXCLUDED.ultimo_recibo,
                    dsn=EXCLUDED.dsn,
                    fecha_inicio=EXCLUDED.fecha_inicio,
                    fecha_ultimo_mov=EXCLUDED.fecha_ultimo_mov,
                    forma_pago=EXCLUDED.forma_pago,
                    estatus=EXCLUDED.estatus,
                    solicitud_ligada=EXCLUDED.solicitud_ligada
                `,
                [
                    poliza.grupo,
                    Number(poliza.clave_agente),
                    poliza.no_poliza,
                    poliza.nombre_asegurado,
                    poliza.ultimo_recibo,
                    poliza.dsn,
                    poliza.fecha_inicio,
                    poliza.fecha_ultimo_mov,
                    poliza.forma_pago,
                    poliza.estatus,
                    solicitud_ligada
                ]
            );
            polizas_insertadas++;
        }
        
        // 2. Insertar todos los recibos
        for (const row of recibos) {
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
                    Number(row.clave_agente),
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
        res.json({ polizas_insertadas, recibos_insertados, detalles });
    } catch (error) {
        console.error('Error procesando polizas/recibos:', error);
        if (error.code === '23502' && error.column === 'clave_agente') {
            return res.status(400).json({
                error: "Error: Se intentó insertar un registro con clave_agente nulo o inválido en la base de datos.",
                detalles: error.detail || error.message
            });
        }
        res.status(500).json({ error: 'Error procesando polizas/recibos.' });
    }
};

// Cargar estado de cuenta
const uploadStatement = async (req, res) => {
    let polizas, recibos;
    
    // Detectar si el contenido es gzip
    if (req.headers['content-type'] === 'application/octet-stream') {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                zlib.gunzip(buffer, async (err, result) => {
                    if (err) return res.status(400).json({ error: 'Error descomprimiendo datos.' });
                    let data;
                    try {
                        data = JSON.parse(result.toString());
                    } catch (e) {
                        return res.status(400).json({ error: 'JSON inválido tras descompresión.' });
                    }
                    polizas = data.polizas;
                    recibos = data.recibos;
                    await processPolizasRecibos(polizas, recibos, req, res);
                });
            } catch (e) {
                return res.status(400).json({ error: 'Error procesando datos comprimidos.' });
            }
        });
        return;
    } else {
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
    try {
        const result = await pool.query(
            `SELECT no_poliza, recibo, fecha_ultimo_mov AS fecha_movimiento, nombre_asegurado, clave_agente, comis_agente, comis_super, comis_promo
             FROM recibos
             WHERE fecha_ultimo_mov >= $1 AND fecha_ultimo_mov <= $2
             ORDER BY fecha_ultimo_mov ASC`,
            [inicio, fin]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error buscando recibos por fecha:', error);
        res.status(500).json({ error: 'Error buscando recibos por fecha.' });
    }
};

module.exports = {
    uploadStatement,
    buscarPolizas,
    buscarRecibosPorFecha
};
