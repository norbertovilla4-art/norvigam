
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  actualizarDisponibilidad,
  obtenerDisponibilidad
} = require('../controllers/conductores.controller');

// Consultar disponibilidad
router.get('/disponibilidad', verificarToken, obtenerDisponibilidad);

// Activar o desactivar disponibilidad
router.patch('/disponibilidad', verificarToken, actualizarDisponibilidad);

module.exports = router;
