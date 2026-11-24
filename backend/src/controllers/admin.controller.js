 
const pool = require('../config/database');

// RESUMEN GENERAL
async function obtenerResumen(req, res) {
  try {
    const consultas = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE rol = 'pasajero') AS pasajeros,
          COUNT(*) FILTER (WHERE rol = 'conductor') AS conductores,
          COUNT(*) FILTER (WHERE estado = 'activo') AS usuarios_activos,
          COUNT(*) AS total_usuarios
        FROM public.usuarios
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE estado = 'activo') AS activos
        FROM public.vehiculos
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_viajes,
          COUNT(*) FILTER (WHERE estado = 'solicitado') AS solicitados,
          COUNT(*) FILTER (WHERE estado = 'aceptado') AS aceptados,
          COUNT(*) FILTER (WHERE estado = 'en_camino') AS en_camino,
          COUNT(*) FILTER (WHERE estado = 'en_curso') AS en_curso,
          COUNT(*) FILTER (WHERE estado = 'completado') AS completados,
          COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados,
          COALESCE(SUM(tarifa) FILTER (WHERE estado = 'completado'), 0) AS ingresos_brutos
        FROM public.viajes
      `)
    ]);

    const usuarios = consultas[0].rows[0];
    const vehiculos = consultas[1].rows[0];
    const viajes = consultas[2].rows[0];
    const ingresos = Number(viajes.ingresos_brutos);

    return res.json({
      success: true,
      resumen: {
        usuarios: {
          total: Number(usuarios.total_usuarios),
          pasajeros: Number(usuarios.pasajeros),
          conductores: Number(usuarios.conductores),
          activos: Number(usuarios.usuarios_activos)
        },
        vehiculos: {
          total: Number(vehiculos.total),
          activos: Number(vehiculos.activos)
        },
        viajes: Object.fromEntries(
          Object.entries(viajes).map(([key, value]) => [key, Number(value)])
        ),
        finanzas: {
          ingresos_brutos: ingresos,
          comision_15: Math.round(ingresos * 0.15),
          ganancias_conductores: Math.round(ingresos * 0.85)
        }
      }
    });
  } catch (error) {
    console.error('Error en resumen administrativo:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudo consultar el resumen administrativo'
    });
  }
}

// LISTAR Y BUSCAR USUARIOS
async function listarUsuarios(req, res) {
  try {
    const busqueda = String(req.query.buscar || '').trim();
    const rol = String(req.query.rol || '').trim();
    const estado = String(req.query.estado || '').trim();

    if (rol && !['pasajero', 'conductor', 'administrador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Filtro de rol inválido'
      });
    }

    if (estado && !['activo', 'inactivo', 'bloqueado'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Filtro de estado inválido'
      });
    }

    const valores = [];
    const condiciones = [];

    if (busqueda) {
      valores.push(`%${busqueda}%`);
      condiciones.push(
        `(nombre ILIKE $${valores.length}
          OR apellido ILIKE $${valores.length}
          OR telefono ILIKE $${valores.length}
          OR correo ILIKE $${valores.length})`
      );
    }

    if (rol) {
      valores.push(rol);
      condiciones.push(`rol = $${valores.length}`);
    }

    if (estado) {
      valores.push(estado);
      condiciones.push(`estado = $${valores.length}`);
    }

    const where = condiciones.length
      ? `WHERE ${condiciones.join(' AND ')}`
      : '';

    const resultado = await pool.query(
      `SELECT id, nombre, apellido, telefono, correo, rol, estado, fecha_registro
       FROM public.usuarios
       ${where}
       ORDER BY fecha_registro DESC
       LIMIT 200`,
      valores
    );

    return res.json({
      success: true,
      total: resultado.rows.length,
      usuarios: resultado.rows
    });
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los usuarios'
    });
  }
}

// ACTIVAR O SUSPENDER CUENTAS
async function cambiarEstadoUsuario(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const administradorId = req.usuario.id;

    if (!['activo', 'inactivo', 'bloqueado'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no permitido'
      });
    }

    if (id === administradorId) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar tu propia cuenta'
      });
    }

    const resultado = await pool.query(
      `UPDATE public.usuarios
       SET estado = $1
       WHERE id = $2
         AND rol IN ('pasajero', 'conductor')
       RETURNING id, nombre, apellido, telefono, correo, rol, estado`,
      [estado, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o no modificable'
      });
    }

    if (resultado.rows[0].rol === 'conductor' && estado !== 'activo') {
      await pool.query(
        `UPDATE public.conductores_estado
         SET disponible = false,
             ultima_actualizacion = NOW()
         WHERE conductor_id = $1`,
        [id]
      );
    }

    return res.json({
      success: true,
      message: 'Estado del usuario actualizado',
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar el estado del usuario'
    });
  }
}

 
// LISTAR VEHÍCULOS DE TODA LA PLATAFORMA
async function listarVehiculos(req, res) {
  try {
    const estado = String(req.query.estado || '').trim();

    if (estado && !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de vehículo inválido'
      });
    }

    const valores = [];
    let condicion = '';

    if (estado) {
      valores.push(estado);
      condicion = `WHERE v.estado = $1`;
    }

    const resultado = await pool.query(
      `SELECT
         v.id,
         v.conductor_id,
         v.tipo_vehiculo,
         v.marca,
         v.modelo,
         v.placa,
         v.color,
         v.estado,
         v.fecha_registro,
         u.nombre AS conductor_nombre,
         u.apellido AS conductor_apellido,
         u.telefono AS conductor_telefono
       FROM public.vehiculos v
       LEFT JOIN public.usuarios u ON u.id = v.conductor_id
       ${condicion}
       ORDER BY v.fecha_registro DESC
       LIMIT 200`,
      valores
    );

    return res.json({
      success: true,
      total: resultado.rows.length,
      vehiculos: resultado.rows
    });

  } catch (error) {
    console.error('Error al listar vehículos:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los vehículos'
    });
  }
}

// ACTIVAR O DESACTIVAR VEHÍCULOS
async function cambiarEstadoVehiculo(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de vehículo no permitido'
      });
    }

    const resultado = await pool.query(
      `UPDATE public.vehiculos
       SET estado = $1
       WHERE id = $2
       RETURNING id, conductor_id, tipo_vehiculo,
                 marca, modelo, placa, color, estado`,
      [estado, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Estado del vehículo actualizado correctamente',
      vehiculo: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al cambiar estado del vehículo:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar el vehículo'
    });
  }
}

// LISTAR Y FILTRAR VIAJES DE TODA LA PLATAFORMA
async function listarViajes(req, res) {
  try {
    const estado = String(req.query.estado || '').trim();

    const estadosPermitidos = [
      'solicitado',
      'aceptado',
      'en_camino',
      'en_curso',
      'completado',
      'cancelado'
    ];

    if (estado && !estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de viaje inválido'
      });
    }

    const valores = [];
    let condicion = '';

    if (estado) {
      valores.push(estado);
      condicion = 'WHERE v.estado = $1';
    }

    const resultado = await pool.query(
      `SELECT
         v.id,
         v.pasajero_id,
         v.conductor_id,
         v.origen_latitud,
         v.origen_longitud,
         v.destino_latitud,
         v.destino_longitud,
         v.tipo_vehiculo,
         v.distancia_km,
         v.duracion_minutos,
         v.tarifa,
         v.estado,
         v.fecha_creacion,
         v.fecha_actualizacion,
         p.nombre AS pasajero_nombre,
         p.apellido AS pasajero_apellido,
         p.telefono AS pasajero_telefono,
         c.nombre AS conductor_nombre,
         c.apellido AS conductor_apellido,
         c.telefono AS conductor_telefono
       FROM public.viajes v
       LEFT JOIN public.usuarios p ON p.id = v.pasajero_id
       LEFT JOIN public.usuarios c ON c.id = v.conductor_id
       ${condicion}
       ORDER BY v.fecha_creacion DESC
       LIMIT 200`,
      valores
    );

    return res.json({
      success: true,
      total: resultado.rows.length,
      viajes: resultado.rows
    });

  } catch (error) {
    console.error('Error al listar viajes:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los viajes'
    });
  }
}

async function obtenerReporteFinanciero(req, res) { 
  try {
    const periodo = String(req.query.periodo || 'mes');

    const periodosPermitidos = {
      dia: 'day',
      semana: 'week',
      mes: 'month'
    };

    if (!periodosPermitidos[periodo]) {
      return res.status(400).json({
        success: false,
        message: 'Periodo inválido. Use dia, semana o mes.'
      });
    }

    const unidad = periodosPermitidos[periodo];

    const consultas = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_viajes,
          COALESCE(SUM(tarifa), 0) AS ingresos_brutos
        FROM public.viajes
        WHERE estado = 'completado'
          AND fecha_creacion >= date_trunc('${unidad}', NOW())
      `),

      pool.query(`
        SELECT
          tipo_vehiculo,
          COUNT(*) AS total_viajes,
          COALESCE(SUM(tarifa), 0) AS ingresos_brutos
        FROM public.viajes
        WHERE estado = 'completado'
          AND fecha_creacion >= date_trunc('${unidad}', NOW())
        GROUP BY tipo_vehiculo
        ORDER BY tipo_vehiculo
      `)
    ]);

    const totalViajes = Number(consultas[0].rows[0].total_viajes);
    const ingresos = Number(consultas[0].rows[0].ingresos_brutos);

    return res.json({
      success: true,
      reporte: {
        periodo,
        total_viajes: totalViajes,
        ingresos_brutos: ingresos,
        comision_15: Math.round(ingresos * 0.15),
        ganancias_conductores: Math.round(ingresos * 0.85),
        por_vehiculo: consultas[1].rows.map((fila) => ({
          tipo_vehiculo: fila.tipo_vehiculo,
          total_viajes: Number(fila.total_viajes),
          ingresos_brutos: Number(fila.ingresos_brutos)
        }))
      }
    });

  } catch (error) {
    console.error('Error en reporte financiero:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo generar el reporte financiero'
    });
  }
}

// LISTAR DOCUMENTOS DE CONDUCTORES
async function listarDocumentos(req, res) {
  try {
    const estado = String(req.query.estado || '').trim();
    const estadosPermitidos = ['pendiente', 'aprobado', 'rechazado'];

    if (estado && !estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de documento no permitido'
      });
    }

    const valores = [];
    let condicion = '';

    if (estado) {
      valores.push(estado);
      condicion = `WHERE d.estado = $1`;
    }

    const resultado = await pool.query(
      `SELECT
         d.id,
         d.conductor_id,
         d.vehiculo_id,
         d.tipo_documento,
         d.archivo_path,
         d.estado,
         d.observaciones,
         d.fecha_registro,
         d.fecha_revision,
         u.nombre AS conductor_nombre,
         u.apellido AS conductor_apellido,
         u.telefono AS conductor_telefono,
         v.placa AS vehiculo_placa
       FROM public.documentos_conductores d
       LEFT JOIN public.usuarios u ON u.id = d.conductor_id
       LEFT JOIN public.vehiculos v ON v.id = d.vehiculo_id
       ${condicion}
       ORDER BY d.fecha_registro DESC
       LIMIT 300`,
      valores
    );

    return res.json({
      success: true,
      total: resultado.rows.length,
      documentos: resultado.rows
    });

  } catch (error) {
    console.error('Error al listar documentos:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los documentos'
    });
  }
}


// APROBAR O RECHAZAR DOCUMENTOS
async function revisarDocumento(req, res) {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;

    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'La revisión debe ser aprobado o rechazado'
      });
    }

    if (
      estado === 'rechazado' &&
      !String(observaciones || '').trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Debes indicar el motivo del rechazo'
      });
    }

    const resultado = await pool.query(
      `UPDATE public.documentos_conductores
       SET estado = $1,
           observaciones = $2,
           fecha_revision = NOW()
       WHERE id = $3
       RETURNING id, conductor_id, vehiculo_id,
                 tipo_documento, estado, observaciones,
                 fecha_revision`,
      [
        estado,
        String(observaciones || '').trim() || null,
        id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    return res.json({
      success: true,
      message: estado === 'aprobado'
        ? 'Documento aprobado correctamente'
        : 'Documento rechazado correctamente',
      documento: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al revisar documento:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudo revisar el documento'
    });
  }
}


// GENERAR ENLACE TEMPORAL PARA VER DOCUMENTO PRIVADO
async function obtenerEnlaceDocumento(req, res) {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT archivo_path
       FROM public.documentos_conductores
       WHERE id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    const { data, error } = await require('../config/supabase.storage')
      .storage
      .from('tura-documentos')
      .createSignedUrl(resultado.rows[0].archivo_path, 300);

    if (error) throw error;

    return res.json({
      success: true,
      url: data.signedUrl,
      expira_en_segundos: 300
    });

  } catch (error) {
    console.error('Error al generar enlace:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudo generar el enlace del documento'
    });
  }
}
module.exports = {
  obtenerResumen,
  listarUsuarios,
  cambiarEstadoUsuario,
  listarVehiculos,
  cambiarEstadoVehiculo,
  listarViajes,
  obtenerReporteFinanciero,
  listarDocumentos,
  revisarDocumento,
  obtenerEnlaceDocumento
};
