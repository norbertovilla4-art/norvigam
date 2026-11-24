
const pool = require('../config/database');
const supabaseStorage = require('../config/supabase.storage');
const crypto = require('crypto');
const path = require('path');

const BUCKET = 'tura-documentos';

const DOCUMENTOS_VALIDOS = [
  'cedula',
  'licencia_conduccion',
  'soat',
  'tarjeta_propiedad',
  'revision_tecnomecanica'
];

const DOCUMENTOS_VEHICULO = [
  'soat',
  'tarjeta_propiedad',
  'revision_tecnomecanica'
];

async function subirDocumento(req, res) {
  let archivoPath = null;

  try {
    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los conductores pueden subir documentos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar un archivo'
      });
    }

    const { tipo_documento, vehiculo_id } = req.body;
    const conductorId = req.usuario.id;

    if (!DOCUMENTOS_VALIDOS.includes(tipo_documento)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento no permitido'
      });
    }

    if (DOCUMENTOS_VEHICULO.includes(tipo_documento) && !vehiculo_id) {
      return res.status(400).json({
        success: false,
        message: 'Este documento debe estar asociado a un vehículo'
      });
    }

    if (vehiculo_id) {
      const vehiculo = await pool.query(
        `SELECT id FROM public.vehiculos
         WHERE id = $1 AND conductor_id = $2`,
        [vehiculo_id, conductorId]
      );

      if (vehiculo.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'El vehículo no pertenece a este conductor'
        });
      }
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const nombreArchivo = `${crypto.randomUUID()}${extension}`;

    archivoPath = `${conductorId}/${nombreArchivo}`;

    const { error: storageError } = await supabaseStorage
      .storage
      .from(BUCKET)
      .upload(archivoPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (storageError) {
      throw storageError;
    }

    const resultado = await pool.query(
      `INSERT INTO public.documentos_conductores
       (conductor_id, vehiculo_id, tipo_documento, archivo_path, estado)
       VALUES ($1, $2, $3, $4, 'pendiente')
       RETURNING id, conductor_id, vehiculo_id, tipo_documento,
                 estado, fecha_registro`,
      [
        conductorId,
        vehiculo_id || null,
        tipo_documento,
        archivoPath
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Documento cargado y enviado para revisión',
      documento: resultado.rows[0]
    });

  } catch (error) {
    if (archivoPath) {
      await supabaseStorage.storage
        .from(BUCKET)
        .remove([archivoPath])
        .catch(() => {});
    }

    console.error('Error al subir documento:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudo cargar el documento'
    });
  }
}

async function obtenerMisDocumentos(req, res) {
  try {
    if (req.usuario.rol !== 'conductor') {
      return res.status(403).json({
        success: false,
        message: 'Acceso exclusivo para conductores'
      });
    }

    const resultado = await pool.query(
      `SELECT id, vehiculo_id, tipo_documento, estado,
              observaciones, fecha_registro, fecha_revision
       FROM public.documentos_conductores
       WHERE conductor_id = $1
       ORDER BY fecha_registro DESC`,
      [req.usuario.id]
    );

    return res.status(200).json({
      success: true,
      documentos: resultado.rows
    });

  } catch (error) {
    console.error('Error al consultar documentos:', error.message);

    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los documentos'
    });
  }
}

module.exports = {
  subirDocumento,
  obtenerMisDocumentos
};
