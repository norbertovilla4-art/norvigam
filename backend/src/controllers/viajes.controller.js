 
const pool = require('../config/database');
// Convertir coordenadas GPS en una dirección legible
async function obtenerDireccion(latitud, longitud) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitud)}&lon=${encodeURIComponent(longitud)}&zoom=18&addressdetails=1`;

    const respuesta = await fetch(url, {
      headers: {
        'User-Agent': 'TuraMovil/1.0 (aplicacion de transporte)'
      }
    });

    if (!respuesta.ok) {
      return 'Dirección no disponible';
    }

    const datos = await respuesta.json();

    return datos.display_name || 'Dirección no disponible';

  } catch (error) {
    console.error('Error obteniendo dirección:', error.message);
    return 'Dirección no disponible';
  }
}

// TARIFAS OFICIALES DE PRUEBA - TURA MOVIL
const TARIFAS = {
  Moto: {
    base: 2500,
    kilometro: 1200,
    minuto: 180,
    minimo: 4500
  },
  Carro: {
    base: 4000,
    kilometro: 1800,
    minuto: 250,
    minimo: 7000
  },
  Taxi: {
    base: 4000,
    kilometro: 1800,
    minuto: 250,
    minimo: 7000
  }
};

// CALCULAR RUTA Y TARIFA EXCLUSIVAMENTE EN EL SERVIDOR
async function calcularRutaYTarifa(origenLat, origenLon, destinoLat, destinoLon, tipoVehiculo) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origenLon},${origenLat};${destinoLon},${destinoLat}` +
    '?overview=false';

  const respuesta = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent': 'TuraMovil/1.0'
    }
  });

  if (!respuesta.ok) {
    throw new Error('No se pudo calcular la ruta');
  }

  const datos = await respuesta.json();

  if (datos.code !== 'Ok' || !datos.routes?.length) {
    throw new Error('No existe una ruta disponible');
  }

  const ruta = datos.routes[0];

  const distanciaKm = Number((ruta.distance / 1000).toFixed(2));
  const duracionMinutos = Math.ceil(ruta.duration / 60);

  if (
    !Number.isFinite(distanciaKm) ||
    !Number.isFinite(duracionMinutos) ||
    distanciaKm <= 0 ||
    duracionMinutos <= 0
  ) {
    throw new Error('La ruta calculada no es válida');
  }

  const tarifaConfig = TARIFAS[tipoVehiculo];

  const tarifaCalculada = Math.max(
    tarifaConfig.minimo,
    Math.round(
      tarifaConfig.base +
      distanciaKm * tarifaConfig.kilometro +
      duracionMinutos * tarifaConfig.minuto
    )
  );

  return {
    distancia_km: distanciaKm,
    duracion_minutos: duracionMinutos,
    tarifa: tarifaCalculada
  };
}

// PASAJEROS: solicitar un viaje
 
async function solicitarViaje(req, res) {
  try {
    const pasajeroId = req.usuario.id;

    const {
      origen_latitud,
      origen_longitud,
      destino_latitud,
      destino_longitud,
      tipo_vehiculo
    } = req.body;

    if (req.usuario.rol !== 'pasajero') {
      return res.status(403).json({
        success: false,
        message: 'Solo los pasajeros pueden solicitar viajes'
      });
    }

    const coordenadas = [
      origen_latitud,
      origen_longitud,
      destino_latitud,
      destino_longitud
    ];

    if (
      coordenadas.some(v =>
        v === undefined ||
        v === null ||
        !Number.isFinite(Number(v))
      ) ||
      !['Moto', 'Carro', 'Taxi'].includes(tipo_vehiculo)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Datos del viaje incompletos o inválidos'
      });
    }

    const origenLat = Number(origen_latitud);
    const origenLon = Number(origen_longitud);
    const destinoLat = Number(destino_latitud);
    const destinoLon = Number(destino_longitud);

    if (
      Math.abs(origenLat) > 90 ||
      Math.abs(destinoLat) > 90 ||
      Math.abs(origenLon) > 180 ||
      Math.abs(destinoLon) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas geográficas inválidas'
      });
    }

    const usuario = await pool.query(
      `SELECT id FROM public.usuarios
       WHERE id = $1
         AND rol = 'pasajero'
         AND estado = 'activo'`,
      [pasajeroId]
    );

    if (usuario.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta del pasajero no está activa'
      });
    }

    // El servidor calcula la ruta y el precio.
    // No utiliza distancia, duración ni tarifa del celular.
    const calculo = await calcularRutaYTarifa(
      origenLat,
      origenLon,
      destinoLat,
      destinoLon,
      tipo_vehiculo
    );

    const resultado = await pool.query(
      `INSERT INTO public.viajes (
        pasajero_id,
        origen_latitud,
        origen_longitud,
        destino_latitud,
        destino_longitud,
        tipo_vehiculo,
        distancia_km,
        duracion_minutos,
        tarifa
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        pasajeroId,
        origenLat,
        origenLon,
        destinoLat,
        destinoLon,
        tipo_vehiculo,
        calculo.distancia_km,
        calculo.duracion_minutos,
        calculo.tarifa
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Solicitud de viaje registrada correctamente',
      viaje: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al solicitar viaje:', error.message);

    return res.status(503).json({
      success: false,
      message: 'No se pudo calcular la ruta o registrar el viaje'
    });
  }
}

// CONDUCTORES: consultar solicitudes pendientes
async function obtenerViajesPendientes(req, res) {
  try {
    const conductorId = req.usuario.id;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden consultar solicitudes'
      });
    }

    const resultado = await pool.query(
      `SELECT
         v.id,
         v.pasajero_id,
         v.origen_latitud,
         v.origen_longitud,
         v.destino_latitud,
         v.destino_longitud,
         v.tipo_vehiculo,
         v.distancia_km,
         v.duracion_minutos,
         v.tarifa,
         v.fecha_creacion
       FROM public.viajes v
       WHERE v.estado = 'solicitado'
         AND v.conductor_id IS NULL
         AND EXISTS (
           SELECT 1
           FROM public.vehiculos ve
           WHERE ve.conductor_id = $1
             AND ve.tipo_vehiculo = v.tipo_vehiculo
             AND ve.estado = 'activo'
         )
         AND EXISTS (
           SELECT 1
           FROM public.conductores_estado ce
           WHERE ce.conductor_id = $1
             AND ce.disponible = TRUE
         )
       ORDER BY v.fecha_creacion ASC`,
      [conductorId]
    );

    return res.status(200).set({
      'Cache-Control': 'no-store'
    }).json({
      success: true,
      solicitudes: resultado.rows
    });

  } catch (error) {
    console.error('Error al consultar solicitudes:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar las solicitudes'
    });
  }
}

// CONDUCTORES: aceptar un viaje de forma atómica
async function aceptarViaje(req, res) {
  try {
    const conductorId = req.usuario.id;
    const viajeId = req.params.id;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden aceptar viajes'
      });
    }

    const resultado = await pool.query(
      `UPDATE public.viajes v
       SET conductor_id = $1,
           estado = 'aceptado',
           fecha_actualizacion = NOW()
       WHERE v.id = $2
         AND v.estado = 'solicitado'
         AND v.conductor_id IS NULL
         AND EXISTS (
           SELECT 1
           FROM public.vehiculos ve
           WHERE ve.conductor_id = $1
             AND ve.tipo_vehiculo = v.tipo_vehiculo
             AND ve.estado = 'activo'
         )
         AND EXISTS (
           SELECT 1
           FROM public.conductores_estado ce
           WHERE ce.conductor_id = $1
             AND ce.disponible = TRUE
         )
         AND EXISTS (
           SELECT 1
           FROM public.usuarios u
           WHERE u.id = $1
             AND u.rol = 'conductor'
             AND u.estado = 'activo'
         )
       RETURNING v.*`,
      [conductorId, viajeId]
    );

    if (resultado.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'El viaje ya fue asignado o no tienes un vehículo disponible compatible'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Viaje aceptado correctamente',
      viaje: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al aceptar viaje:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo aceptar el viaje'
    });
  }
}

// CONDUCTORES: cambiar el estado de un viaje
async function cambiarEstadoViaje(req, res) {
  try {
    const conductorId = req.usuario.id;
    const viajeId = req.params.id;
    const nuevoEstado = req.body.estado;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden cambiar el estado del viaje'
      });
    }

    const transiciones = {
      aceptado: 'en_camino',
      en_camino: 'en_curso',
      en_curso: 'completado'
    };

    if (!Object.values(transiciones).includes(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado solicitado no válido'
      });
    }

    const estadoAnterior = Object.keys(transiciones).find(
      estado => transiciones[estado] === nuevoEstado
    );

    const resultado = await pool.query(
      `UPDATE public.viajes
       SET estado = $1,
           fecha_actualizacion = NOW()
       WHERE id = $2
         AND conductor_id = $3
         AND estado = $4
       RETURNING *`,
      [nuevoEstado, viajeId, conductorId, estadoAnterior]
    );

    if (resultado.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'No se pudo cambiar el estado. Verifica que el viaje te pertenezca y que su estado actual permita este cambio.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Estado del viaje actualizado correctamente',
      viaje: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al cambiar estado del viaje:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar el estado del viaje'
    });
  }
}
// CONDUCTORES: consultar el viaje activo
async function obtenerMiViajeActivo(req, res) {
  try {
    const conductorId = req.usuario.id;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden consultar su viaje activo'
      });
    }

    const resultado = await pool.query(
      `SELECT *
       FROM public.viajes
       WHERE conductor_id = $1
         AND estado IN ('aceptado', 'en_camino', 'en_curso')
       ORDER BY fecha_creacion DESC
       LIMIT 1`,
      [conductorId]
    );

    return res.status(200).set({
      'Cache-Control': 'no-store'
    }).json({
      success: true,
      viaje: resultado.rows[0] || null
    });

  } catch (error) {
    console.error('Error al consultar viaje activo:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar el viaje activo'
    });
  }
}
 
 
// CONDUCTORES: historial y ganancias por periodo
async function obtenerHistorialGanancias(req, res) {
  try {
    const conductorId = req.usuario.id;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden consultar sus ganancias'
      });
    }

    const resumen = await pool.query(
      `SELECT
         COUNT(*)::INTEGER AS total_viajes,
         COALESCE(ROUND(SUM(tarifa), 2), 0) AS ingresos_brutos,
         COALESCE(ROUND(SUM(tarifa * 0.15), 2), 0) AS comision,
         COALESCE(ROUND(SUM(tarifa * 0.85), 2), 0) AS ganancias_netas
       FROM public.viajes
       WHERE conductor_id = $1
         AND estado = 'completado'`,
      [conductorId]
    );

    const periodos = await pool.query(
      `WITH limites AS (
         SELECT
           date_trunc(
             'day',
             NOW() AT TIME ZONE 'America/Bogota'
           ) AT TIME ZONE 'America/Bogota' AS inicio_hoy,

           (date_trunc(
             'day',
             NOW() AT TIME ZONE 'America/Bogota'
           ) + INTERVAL '1 day')
           AT TIME ZONE 'America/Bogota' AS fin_hoy,

           date_trunc(
             'week',
             NOW() AT TIME ZONE 'America/Bogota'
           ) AT TIME ZONE 'America/Bogota' AS inicio_semana,

           (date_trunc(
             'week',
             NOW() AT TIME ZONE 'America/Bogota'
           ) + INTERVAL '1 week')
           AT TIME ZONE 'America/Bogota' AS fin_semana,

           date_trunc(
             'month',
             NOW() AT TIME ZONE 'America/Bogota'
           ) AT TIME ZONE 'America/Bogota' AS inicio_mes,

           (date_trunc(
             'month',
             NOW() AT TIME ZONE 'America/Bogota'
           ) + INTERVAL '1 month')
           AT TIME ZONE 'America/Bogota' AS fin_mes
       )
       SELECT
         COUNT(*) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_hoy
             AND v.fecha_actualizacion < l.fin_hoy
         )::INTEGER AS viajes_hoy,

         COALESCE(ROUND(SUM(v.tarifa) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_hoy
             AND v.fecha_actualizacion < l.fin_hoy
         ), 2), 0) AS ingresos_hoy,

         COALESCE(ROUND(SUM(v.tarifa * 0.15) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_hoy
             AND v.fecha_actualizacion < l.fin_hoy
         ), 2), 0) AS comision_hoy,

         COALESCE(ROUND(SUM(v.tarifa * 0.85) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_hoy
             AND v.fecha_actualizacion < l.fin_hoy
         ), 2), 0) AS ganancias_hoy,

         COUNT(*) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_semana
             AND v.fecha_actualizacion < l.fin_semana
         )::INTEGER AS viajes_semana,

         COALESCE(ROUND(SUM(v.tarifa) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_semana
             AND v.fecha_actualizacion < l.fin_semana
         ), 2), 0) AS ingresos_semana,

         COALESCE(ROUND(SUM(v.tarifa * 0.15) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_semana
             AND v.fecha_actualizacion < l.fin_semana
         ), 2), 0) AS comision_semana,

         COALESCE(ROUND(SUM(v.tarifa * 0.85) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_semana
             AND v.fecha_actualizacion < l.fin_semana
         ), 2), 0) AS ganancias_semana,

         COUNT(*) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_mes
             AND v.fecha_actualizacion < l.fin_mes
         )::INTEGER AS viajes_mes,

         COALESCE(ROUND(SUM(v.tarifa) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_mes
             AND v.fecha_actualizacion < l.fin_mes
         ), 2), 0) AS ingresos_mes,

         COALESCE(ROUND(SUM(v.tarifa * 0.15) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_mes
             AND v.fecha_actualizacion < l.fin_mes
         ), 2), 0) AS comision_mes,

         COALESCE(ROUND(SUM(v.tarifa * 0.85) FILTER (
           WHERE v.fecha_actualizacion >= l.inicio_mes
             AND v.fecha_actualizacion < l.fin_mes
         ), 2), 0) AS ganancias_mes

       FROM limites l
       LEFT JOIN public.viajes v
         ON v.conductor_id = $1
        AND v.estado = 'completado'
       GROUP BY l.inicio_hoy, l.fin_hoy,
                l.inicio_semana, l.fin_semana,
                l.inicio_mes, l.fin_mes`,
      [conductorId]
    );

     const historial = await pool.query(
  `SELECT
     id,
     tipo_vehiculo,
     origen_latitud,
     origen_longitud,
     destino_latitud,
     destino_longitud,
     distancia_km,
     duracion_minutos,
     tarifa,
     fecha_creacion,
     fecha_actualizacion
   FROM public.viajes
   WHERE conductor_id = $1
     AND estado = 'completado'
   ORDER BY fecha_actualizacion DESC`,
  [conductorId]
);

const viajesConDirecciones = await Promise.all(
  historial.rows.map(async (viaje) => {
    const [origen, destino] = await Promise.all([
      obtenerDireccion(viaje.origen_latitud, viaje.origen_longitud),
      obtenerDireccion(viaje.destino_latitud, viaje.destino_longitud)
    ]);

    return {
      ...viaje,
      direccion_origen: origen,
      direccion_destino: destino
    };
  })
);

    return res.status(200).set({
      'Cache-Control': 'no-store'
    }).json({
      success: true,
      resumen: resumen.rows[0],
      periodos: periodos.rows[0],
      viajes: viajesConDirecciones
    });

  } catch (error) {
    console.error('Error al consultar historial y ganancias:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar el historial de ganancias'
    });
  }
}

module.exports = {
  solicitarViaje,
  obtenerViajesPendientes,
  aceptarViaje,
  cambiarEstadoViaje,
  obtenerMiViajeActivo,
  obtenerHistorialGanancias
};