
const pool = require('../config/database');

// Registrar o actualizar la ubicación GPS del conductor
async function actualizarUbicacion(req, res) {
  try {
    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Acceso exclusivo para conductores'
      });
    }

    const { latitud, longitud, precision_metros } = req.body;

    if (
      typeof latitud !== 'number' ||
      typeof longitud !== 'number' ||
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      latitud < -90 || latitud > 90 ||
      longitud < -180 || longitud > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas GPS inválidas'
      });
    }

    if (
      precision_metros !== undefined &&
      (!Number.isFinite(precision_metros) || precision_metros < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Precisión GPS inválida'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO public.ubicaciones_conductores
       (conductor_id, latitud, longitud, precision_metros, actualizado_en)
       SELECT $1, $2, $3, $4, NOW()
       WHERE EXISTS (
         SELECT 1
         FROM public.usuarios
         WHERE id = $1
           AND rol = 'conductor'
           AND estado = 'activo'
       )
       AND EXISTS (
         SELECT 1
         FROM public.viajes
         WHERE conductor_id = $1
           AND estado IN ('aceptado', 'en_camino', 'en_curso')
       )
       ON CONFLICT (conductor_id)
       DO UPDATE SET
         latitud = EXCLUDED.latitud,
         longitud = EXCLUDED.longitud,
         precision_metros = EXCLUDED.precision_metros,
         actualizado_en = NOW()
       RETURNING conductor_id, latitud, longitud,
                 precision_metros, actualizado_en`,
      [
        req.usuario.id,
        latitud,
        longitud,
        precision_metros ?? null
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'No tienes un viaje activo para compartir ubicación'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ubicación actualizada',
      ubicacion: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar ubicación:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar la ubicación'
    });
  }
}

// Consultar la ubicación del conductor de un viaje propio
async function obtenerUbicacionConductor(req, res) {
  try {
    if (req.usuario.rol !== 'pasajero') {
      return res.status(403).json({
        success: false,
        message: 'Acceso exclusivo para pasajeros'
      });
    }

    const { viajeId } = req.params;

    const resultado = await pool.query(
      `SELECT
         u.latitud,
         u.longitud,
         u.precision_metros,
         u.actualizado_en
       FROM public.viajes v
       INNER JOIN public.ubicaciones_conductores u
         ON u.conductor_id = v.conductor_id
       WHERE v.id = $1
         AND v.pasajero_id = $2
         AND v.estado IN ('aceptado', 'en_camino', 'en_curso')
       LIMIT 1`,
      [viajeId, req.usuario.id]
    );

    return res.status(200).set({
      'Cache-Control': 'no-store'
    }).json({
      success: true,
      ubicacion: resultado.rows[0] || null
    });

  } catch (error) {
    console.error('Error al consultar ubicación:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar la ubicación del conductor'
    });
  }
}

module.exports = {
  actualizarUbicacion,
  obtenerUbicacionConductor
};
