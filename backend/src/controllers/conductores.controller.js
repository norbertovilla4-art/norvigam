const pool = require('../config/database');

// Activar o desactivar disponibilidad
async function actualizarDisponibilidad(req, res) {
  try {
    const conductorId = req.usuario.id;
    const { disponible } = req.body;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden cambiar su disponibilidad'
      });
    }

    if (typeof disponible !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo disponible debe ser verdadero o falso'
      });
    }

    const usuario = await pool.query(
      `SELECT id FROM public.usuarios
       WHERE id = $1 AND rol = 'conductor' AND estado = 'activo'`,
      [conductorId]
    );

    if (usuario.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta del conductor no está activa'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO public.conductores_estado
       (conductor_id, disponible, ultima_actualizacion)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conductor_id)
       DO UPDATE SET
         disponible = EXCLUDED.disponible,
         ultima_actualizacion = NOW()
       RETURNING *`,
      [conductorId, disponible]
    );

    return res.status(200).json({
      success: true,
      message: disponible
        ? 'Conductor disponible para recibir viajes'
        : 'Conductor desconectado',
      estado: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar la disponibilidad'
    });
  }
}

// Consultar disponibilidad del conductor
async function obtenerDisponibilidad(req, res) {
  try {
    const conductorId = req.usuario.id;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Acceso exclusivo para conductores'
      });
    }

    const resultado = await pool.query(
      `SELECT disponible, ultima_latitud, ultima_longitud,
              ultima_actualizacion
       FROM public.conductores_estado
       WHERE conductor_id = $1`,
      [conductorId]
    );

    return res.status(200).json({
      success: true,
      estado: resultado.rows[0] || {
        disponible: false,
        ultima_latitud: null,
        ultima_longitud: null
      }
    });

  } catch (error) {
    console.error('Error al consultar disponibilidad:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar la disponibilidad'
    });
  }
}

module.exports = {
  actualizarDisponibilidad,
  obtenerDisponibilidad
};