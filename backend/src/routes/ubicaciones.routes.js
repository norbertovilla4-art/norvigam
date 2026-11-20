
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  actualizarUbicacion,
  obtenerUbicacionConductor
} = require('../controllers/ubicaciones.controller');

router.post('/actualizar', verificarToken, actualizarUbicacion);

router.get('/viaje/:viajeId', verificarToken, obtenerUbicacionConductor);

module.exports = router;
