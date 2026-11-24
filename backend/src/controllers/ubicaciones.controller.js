 
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
    const conductorId = req.usuario.id;

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
      precision_metros !== null &&
      (!Number.isFinite(precision_metros) || precision_metros < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Precisión GPS inválida'
      });
    }

    // Verificar que la cuenta esté activa
    const usuario = await pool.query(
      `SELECT id
       FROM public.usuarios
       WHERE id = $1
         AND rol = 'conductor'
         AND estado = 'activo'`,
      [conductorId]
    );

    if (usuario.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta del conductor no está activa'
      });
    }

    // Actualizar ubicación mientras esté disponible
    const disponibilidad = await pool.query(
      `UPDATE public.conductores_estado
       SET ultima_latitud = $2,
           ultima_longitud = $3,
           ultima_actualizacion = NOW()
       WHERE conductor_id = $1
         AND disponible = TRUE
       RETURNING conductor_id, ultima_latitud,
                 ultima_longitud, ultima_actualizacion`,
      [conductorId, latitud, longitud]
    );

    // Mantener el seguimiento de viajes activos
    const viajeActivo = await pool.query(
      `INSERT INTO public.ubicaciones_conductores
       (conductor_id, latitud, longitud, precision_metros, actualizado_en)
       SELECT $1, $2, $3, $4, NOW()
       WHERE EXISTS (
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
        conductorId,
        latitud,
        longitud,
        precision_metros ?? null
      ]
    );

    if (
      disponibilidad.rows.length === 0 &&
      viajeActivo.rows.length === 0
    ) {
      return res.status(409).json({
        success: false,
        message: 'Debes estar disponible o tener un viaje activo'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ubicación actualizada',
      ubicacion: {
        latitud,
        longitud,
        precision_metros: precision_metros ?? null
      }
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

