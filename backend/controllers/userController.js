const pool = require('../config/database');

// Rango de claves por tipo de usuario
const claveRanges = {
    '1': { min: 1, max: 999 },
    '2': { min: 1000, max: 1800 },
    '3': { min: 1801, max: 1999 },
    '4': { min: 2000, max: 2999 },
    '5': { min: 3000, max: 3999 },
};

// Crear usuario
const createUser = async (req, res) => {
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

        res.status(201).json(insertResult.rows[0]);
    } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send('Error saving user data.');
    }
};

// Obtener última clave por tipo de usuario
const getLastClave = async (req, res) => {
    const { tipoUsuario } = req.params;

    try {
        const query = `
            SELECT MAX(clave) AS lastClave
            FROM users
            WHERE tipo_usuario = $1;
        `;
        const result = await pool.query(query, [tipoUsuario]);
        const lastClave = result.rows[0].lastclave || 0;
        res.json({ lastClave });
    } catch (error) {
        console.error('Error fetching last clave:', error);
        res.status(500).send('Error fetching last clave.');
    }
};

// Obtener supervisores
const getSupervisores = async (req, res) => {
    try {
        const result = await pool.query('SELECT clave, nombre FROM users WHERE tipo_usuario = $1', ['3']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching supervisores:', error);
        res.status(500).send('Error fetching supervisores.');
    }
};

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).send('Error obteniendo usuarios.');
    }
};

// Actualizar usuario
const updateUser = async (req, res) => {
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
};

// Obtener agentes
const getAgentes = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre, clave FROM users WHERE tipo_usuario IN ('1','2') ORDER BY clave ASC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo agentes:', error);
        res.status(500).send('Error obteniendo agentes.');
    }
};

module.exports = {
    createUser,
    getLastClave,
    getSupervisores,
    getAllUsers,
    updateUser,
    getAgentes
};
