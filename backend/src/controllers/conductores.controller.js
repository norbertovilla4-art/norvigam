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

async function obtenerConductoresCercanos(req, res) {
  try {
    if (req.usuario.rol !== 'pasajero') {
      return res.status(403).json({
        success: false,
        message: 'Solo los pasajeros pueden consultar conductores cercanos.'
      });
    }

    const latitud = Number(req.query.latitud);
    const longitud = Number(req.query.longitud);
    const radioKm = Number(req.query.radio_km || 10);

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      latitud < -90 || latitud > 90 ||
      longitud < -180 || longitud > 180 ||
      radioKm <= 0 || radioKm > 30
    ) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas o radio no válidos.'
      });
    }

    const resultado = await pool.query(`
      SELECT *
      FROM (
        SELECT DISTINCT ON (u.id)
          u.id AS conductor_id,
          ce.ultima_latitud AS latitud,
          ce.ultima_longitud AS longitud,
          ce.ultima_actualizacion,
          v.tipo_vehiculo,
          v.marca,
          v.modelo,
          ROUND((
            6371 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(ce.ultima_latitud - $1) / 2), 2) +
              COS(RADIANS($1)) *
              COS(RADIANS(ce.ultima_latitud)) *
              POWER(SIN(RADIANS(ce.ultima_longitud - $2) / 2), 2)
            ))
          )::numeric, 2) AS distancia_km
        FROM public.usuarios u
        INNER JOIN public.conductores_estado ce
          ON ce.conductor_id = u.id
        INNER JOIN public.vehiculos v
          ON v.conductor_id = u.id
        WHERE u.rol = 'conductor'
          AND u.estado = 'activo'
          AND ce.disponible = TRUE
          AND ce.ultima_latitud IS NOT NULL
          AND ce.ultima_longitud IS NOT NULL
          AND ce.ultima_actualizacion >= NOW() - INTERVAL '5 minutes'
          AND v.estado = 'activo'
        ORDER BY u.id, v.fecha_registro DESC
      ) AS conductores
      WHERE distancia_km <= $3
      ORDER BY distancia_km ASC
      LIMIT 100
    `, [latitud, longitud, radioKm]);

    return res.status(200).json({
      success: true,
      total: resultado.rows.length,
      conductores: resultado.rows
    });

  } catch (error) {
    console.error('Error buscando conductores cercanos:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al consultar conductores cercanos.'
    });
  }
}

 module.exports = {
  actualizarDisponibilidad,
  obtenerDisponibilidad,
  obtenerConductoresCercanos
};