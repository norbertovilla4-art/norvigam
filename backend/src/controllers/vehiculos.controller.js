 
const pool = require('../config/database');

async function registrarVehiculo(req, res) {
  try {
    const conductorId = req.usuario.id;
    const { tipo_vehiculo, marca, modelo, placa, color } = req.body;

    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden registrar vehículos'
      });
    }

    if (!['Moto', 'Carro', 'Taxi'].includes(tipo_vehiculo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de vehículo no permitido'
      });
    }

    if (!marca?.trim() || !modelo?.trim() || !placa?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Marca, modelo y placa son obligatorios'
      });
    }

    const resultado = await pool.query(
      `INSERT INTO public.vehiculos
       (conductor_id, tipo_vehiculo, marca, modelo, placa, color, estado)
       SELECT $1, $2, $3, $4, UPPER($5), $6, 'activo'
       WHERE EXISTS (
         SELECT 1 FROM public.usuarios
         WHERE id = $1 AND rol = 'conductor' AND estado = 'activo'
       )
       RETURNING id, conductor_id, tipo_vehiculo, marca, modelo, placa, color, estado`,
      [
        conductorId,
        tipo_vehiculo,
        marca.trim(),
        modelo.trim(),
        placa.trim(),
        color?.trim() || null
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta del conductor no está activa'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Vehículo registrado correctamente',
      vehiculo: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Esta placa ya está registrada'
      });
    }

    console.error('Error al registrar vehículo:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo registrar el vehículo'
    });
  }
}

async function obtenerMisVehiculos(req, res) {
  try {
    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Acceso exclusivo para conductores'
      });
    }

    const resultado = await pool.query(
      `SELECT id, tipo_vehiculo, marca, modelo, placa, color, estado, fecha_registro
       FROM public.vehiculos
       WHERE conductor_id = $1
       ORDER BY fecha_registro DESC`,
      [req.usuario.id]
    );

    console.log(
      'Vehículos encontrados:',
      resultado.rows.length,
      'Conductor:',
      req.usuario.id
    );

    return res.status(200).set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }).json({
      success: true,
      vehiculos: resultado.rows
    });

  } catch (error) {
    console.error('Error al consultar vehículos:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los vehículos'
    });
  }
}

module.exports = {
  registrarVehiculo,
  obtenerMisVehiculos
};

