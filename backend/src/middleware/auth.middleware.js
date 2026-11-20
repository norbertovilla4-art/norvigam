const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function verificarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticacion requerido'
      });
    }

    const token = authorization.slice(7).trim();

    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Token invalido o vencido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Token invalido'
      });
    }

    // Consultar el estado y rol vigentes en PostgreSQL
    const resultado = await pool.query(
      `SELECT id, rol, estado
       FROM public.usuarios
       WHERE id = $1`,
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    const usuario = resultado.rows[0];

    if (usuario.estado !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'La cuenta no esta activa'
      });
    }

    // No confiar en el rol antiguo del token
    req.usuario = {
      id: usuario.id,
      rol: usuario.rol
    };

    return next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalido o vencido'
      });
    }

    console.error('Error verificando autenticacion:', error.message);

    return res.status(503).json({
      success: false,
      message: 'Servicio de autenticacion temporalmente no disponible'
    });
  }
}

module.exports = { verificarToken };
