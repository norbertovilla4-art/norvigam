
const express = require('express');
const multer = require('multer');

const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  subirDocumento,
  obtenerMisDocumentos
} = require('../controllers/documentos.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    if (!tiposPermitidos.includes(file.mimetype)) {
      return callback(
        new Error('Solo se permiten archivos PDF, JPG y PNG')
      );
    }

    callback(null, true);
  }
});

router.post(
  '/subir',
  verificarToken,
  upload.single('archivo'),
  subirDocumento
);

router.get(
  '/mis-documentos',
  verificarToken,
  obtenerMisDocumentos
);

module.exports = router;
