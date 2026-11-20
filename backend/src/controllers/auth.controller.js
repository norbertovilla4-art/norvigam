
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function registrarUsuario(req, res) {
  try {
    const {
      nombre,
      apellido,
      telefono,
      correo,
      password,
      rol
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !telefono || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, teléfono, contraseña y rol son obligatorios'
      });
    }

    // Validar rol
    if (!['pasajero', 'conductor'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no permitido'
      });
    }

    // Validar contraseña
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener mínimo 8 caracteres'
      });
    }

    // Proteger contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Guardar usuario
    const resultado = await pool.query(
      `INSERT INTO public.usuarios
       (nombre, apellido, telefono, correo, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, apellido, telefono, correo, rol, estado, fecha_registro`,
      [
        nombre.trim(),
        apellido?.trim() || null,
        telefono.trim(),
        correo?.trim().toLowerCase() || null,
        passwordHash,
        rol
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      usuario: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error.message);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El teléfono o correo ya está registrado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno al registrar usuario'
    });
  }
}

async function iniciarSesion(req, res) {
  try {
    const { telefono, password } = req.body;

    if (!telefono || !password) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono y contraseña son obligatorios'
      });
    }

    const resultado = await pool.query(
      `SELECT id, nombre, apellido, telefono, correo,
              password_hash, rol, estado
       FROM public.usuarios
       WHERE telefono = $1`,
      [telefono.trim()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    const usuario = resultado.rows[0];

    if (usuario.estado !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'La cuenta no está activa'
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    const jwt = require('jsonwebtoken');

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete usuario.password_hash;

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      usuario
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error interno al iniciar sesión'
    });
  }
}

module.exports = {
  registrarUsuario,
  iniciarSesion
};
