
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  actualizarDisponibilidad,
  obtenerDisponibilidad,
  obtenerConductoresCercanos
} = require('../controllers/conductores.controller');

// Consultar disponibilidad del conductor
router.get('/disponibilidad', verificarToken, obtenerDisponibilidad);

// Actualizar disponibilidad del conductor
router.patch('/disponibilidad', verificarToken, actualizarDisponibilidad);

// Consultar conductores cercanos para pasajeros
router.get('/cercanos', verificarToken, obtenerConductoresCercanos);

module.exports = router;
 