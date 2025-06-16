const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const zlib = require('zlib');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
// Permitir payloads grandes
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// Configuración de CORS (ajusta el origin según tu frontend)
const allowedOrigins = [
    'https://covems.com.mx',
    'http://localhost:3001', // agrega aquí los que necesites
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origin (como Postman) o si está en la lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    }
}));

// Configure Neon database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Use DATABASE_URL from .env
    ssl: {
        rejectUnauthorized: false, // Required for Neon
    },
});

// API endpoint to add a user
app.post('/api/users', async (req, res) => {
    let {
        nombre,
        fechaNacimiento,
        rfc,
        curp,
        localidad,
        celular,
        banco,
        cuentaClabe,
        clave,
        tipo_usuario,
        supervisor_clave,
        estado,
    } = req.body;

    // Normalizar clave y tipo_usuario para la base de datos
    if (clave !== undefined && clave !== null && clave !== '') {
        clave = parseInt(clave);
    } else {
        clave = null;
    }
    if (tipo_usuario !== undefined && tipo_usuario !== null && tipo_usuario !== '') {
        tipo_usuario = parseInt(tipo_usuario);
    } else {
        tipo_usuario = null;
    }

    // Rango de claves por tipo de usuario
    const claveRanges = {
        '1': { min: 1, max: 999 },
        '2': { min: 1000, max: 1800 },
        '3': { min: 1801, max: 1999 },
        '4': { min: 2000, max: 2999 },
        '5': { min: 3000, max: 3999 },
    };

    // Si no hay clave, asignar automáticamente
    if (!clave && tipo_usuario && claveRanges[tipo_usuario]) {
        const { min, max } = claveRanges[tipo_usuario];
        try {
            const result = await pool.query(
                'SELECT MAX(clave::int) as max_clave FROM users WHERE clave::int >= $1 AND clave::int <= $2',
                [min, max]
            );
            const maxClave = result.rows[0].max_clave;
            let nextClave = maxClave ? parseInt(maxClave) + 1 : min;
            if (nextClave > max) {
                return res.status(400).json({ error: 'No hay claves disponibles para este tipo de usuario.' });
            }
            clave = nextClave.toString();
        } catch (error) {
            console.error('Error buscando clave:', error);
            return res.status(500).send('Error generando clave.');
        }
    }

    try {
        const query = `
            INSERT INTO users (nombre, fecha_nacimiento, rfc, curp, localidad, celular, banco, cuenta_clabe, clave, tipo_usuario, supervisor_clave, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [nombre, fechaNacimiento, rfc, curp, localidad, celular, banco, cuentaClabe, clave, tipo_usuario, supervisor_clave, estado || 'activo'];
        const insertResult = await pool.query(query, values);

        res.status(201).json(insertResult.rows[0]); // Return the inserted user
    } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send('Error saving user data.');
    }
});

// API endpoint to get the last clave for a given tipoUsuario
app.get('/api/users/last-clave/:tipoUsuario', async (req, res) => {
    const { tipoUsuario } = req.params;

    try {
        const query = `
            SELECT MAX(clave) AS lastClave
            FROM users
            WHERE tipo_usuario = $1;
        `;
        const result = await pool.query(query, [tipoUsuario]);
        const lastClave = result.rows[0].lastclave || 0; // Default to 0 if no rows exist
        res.json({ lastClave });
    } catch (error) {
        console.error('Error fetching last clave:', error);
        res.status(500).send('Error fetching last clave.');
    }
});

// Endpoint para obtener supervisores
app.get('/api/supervisores', async (req, res) => {
    try {
        const result = await pool.query('SELECT clave, nombre FROM users WHERE tipo_usuario = $1', ['3']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching supervisores:', error);
        res.status(500).send('Error fetching supervisores.');
    }
});

// Endpoint para obtener todos los usuarios
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).send('Error obteniendo usuarios.');
    }
});

// Endpoint para actualizar usuario
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        fecha_nacimiento,
        rfc,
        curp,
        localidad,
        celular,
        banco,
        cuenta_clabe,
        tipo_usuario,
        supervisor_clave,
        estado,
        clave,
    } = req.body;

    // Validar y convertir clave y tipo_usuario a número o null
    let clave_num = (!clave || clave === 'undefined' || isNaN(Number(clave))) ? null : parseInt(clave);
    let tipo_usuario_num = (!tipo_usuario || tipo_usuario === 'undefined' || isNaN(Number(tipo_usuario))) ? null : parseInt(tipo_usuario);

    try {
        const query = `
            UPDATE users SET
                nombre = $1,
                fecha_nacimiento = $2,
                rfc = $3,
                curp = $4,
                localidad = $5,
                celular = $6,
                banco = $7,
                cuenta_clabe = $8,
                tipo_usuario = $9,
                supervisor_clave = $10,
                estado = $11,
                clave = $12
            WHERE id = $13
            RETURNING *;
        `;
        const values = [
            nombre,
            fecha_nacimiento,
            rfc,
            curp,
            localidad,
            celular,
            banco,
            cuenta_clabe,
            tipo_usuario_num,
            supervisor_clave,
            estado,
            clave_num,
            id
        ];
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).send('Error actualizando usuario.');
    }
});

// Endpoint para crear una nueva solicitud
app.post('/api/solicitudes', async (req, res) => {
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
});

// Endpoint para obtener agentes
app.get('/api/agentes', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre, clave FROM users WHERE tipo_usuario IN ('1','2') ORDER BY clave ASC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo agentes:', error);
        res.status(500).send('Error obteniendo agentes.');
    }
});

// Endpoint para obtener todas las solicitudes
app.get('/api/solicitudes', async (req, res) => {
    try {
        // No hay columna id, así que ordenamos por no_solicitud
        const result = await pool.query('SELECT * FROM solicitudes ORDER BY no_solicitud ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        res.status(500).send('Error obteniendo solicitudes.');
    }
});

// Endpoint para actualizar no_poliza en solicitudes en lote y mostrar detalles de unión
app.post('/api/solicitudes/update-polizas', async (req, res) => {
    const { updates } = req.body; // [{ no_solicitud, no_poliza }, ...]
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar.' });
    }
    let updated = 0;
    let notFound = [];
    let joined = [];
    try {
        for (const { no_solicitud, no_poliza } of updates) {
            // Actualizar y obtener datos de la solicitud y usuario
            const result = await pool.query(
                `UPDATE solicitudes SET no_poliza = $1 WHERE no_solicitud = $2 RETURNING no_solicitud, no_poliza, agente_clave`,
                [no_poliza, no_solicitud]
            );
            if (result.rowCount === 0) {
                notFound.push(no_solicitud);
            } else {
                updated++;
                const solicitud = result.rows[0];
                // Buscar usuario
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
});

// Endpoint para cargar estado de cuenta, insertar recibos y polizas ligadas a solicitudes y usuarios
app.post('/api/recibos/upload-statement', async (req, res) => {
    let polizas, recibos;
    // Detectar si el contenido es gzip
    if (req.headers['content-type'] === 'application/octet-stream') {
        // Recibir el buffer completo
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
        // JSON normal
        polizas = req.body.polizas;
        recibos = req.body.recibos;
        await processPolizasRecibos(polizas, recibos, req, res);
        return;
    }
});

// Lógica original extraída a función para reutilizar
async function processPolizasRecibos(polizas, recibos, req, res) {
    if (!Array.isArray(polizas) || polizas.length === 0 || !Array.isArray(recibos) || recibos.length === 0) {
        return res.status(400).json({ error: 'No hay datos para procesar.' });
    }
    // --- Backend validation for clave_agente ---
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
            // Buscar la solicitud correspondiente
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
            // Buscar la solicitud correspondiente
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
            // --- Sanitize date fields: convert empty string to null ---
            const fecha_inicio = row.fecha_inicio && String(row.fecha_inicio).trim() !== '' ? row.fecha_inicio : null;
            const fecha_movimiento = row.fecha_movimiento && String(row.fecha_movimiento).trim() !== '' ? row.fecha_movimiento : null;
            const fecha_vencimiento = row.fecha_vencimiento && String(row.fecha_vencimiento).trim() !== '' ? row.fecha_vencimiento : null;
            // --- Sanitize new numeric fields ---
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
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)` +
                '',
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
                    row.clave_supervisor // Nuevo campo
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
        // Mejorar el mensaje si es un error de NOT NULL constraint
        if (error.code === '23502' && error.column === 'clave_agente') {
            return res.status(400).json({
                error: "Error: Se intentó insertar un registro con clave_agente nulo o inválido en la base de datos.",
                detalles: error.detail || error.message
            });
        }
        res.status(500).json({ error: 'Error procesando polizas/recibos.' });
    }
}

// Endpoint para buscar pólizas por número de póliza, nombre asegurado, usuario (clave/nombre de agente), o promotoría
app.get('/api/polizas/buscar', async (req, res) => {
    const q = (req.query.q || '').trim();
    const tipo = (req.query.tipo || '').trim(); // nuevo parámetro para tipo de búsqueda
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
            // Buscar por clave de agente o nombre de agente
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.clave_agente::text ILIKE $1 OR u.nombre ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else if (tipo === 'promotoria') {
            // Suponiendo que hay un campo p.promotoria o p.clave_promotoria, ajustar según tu modelo
            result = await pool.query(`
                SELECT p.*, u.nombre AS nombre_agente
                FROM polizas p
                LEFT JOIN users u ON p.clave_agente::text = u.clave::text
                WHERE p.promotoria ILIKE $1
                ORDER BY p.no_poliza ASC
                LIMIT 100
            `, [`%${q}%`]);
        } else {
            // Búsqueda flexible (compatibilidad hacia atrás)
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
});

// API endpoint para agregar un saldo
app.post('/api/saldos', async (req, res) => {
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
});

// API endpoint para obtener los saldos de un usuario
app.get('/api/saldos/:clave', async (req, res) => {
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
});

// Endpoint para buscar recibos por rango de fechas
app.get('/api/recibos/por-fecha', async (req, res) => {
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});