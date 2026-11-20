 const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  solicitarViaje,
  obtenerViajesPendientes,
  aceptarViaje,
  cambiarEstadoViaje,
  obtenerMiViajeActivo,
  obtenerHistorialGanancias
} = require('../controllers/viajes.controller');

// Pasajeros
router.post('/', verificarToken, solicitarViaje);

// Conductores
router.get('/pendientes', verificarToken, obtenerViajesPendientes);
router.get('/mi-viaje-activo', verificarToken, obtenerMiViajeActivo);
router.get('/historial-ganancias', verificarToken, obtenerHistorialGanancias);
router.patch('/:id/aceptar', verificarToken, aceptarViaje);
router.patch('/:id/estado', verificarToken, cambiarEstadoViaje);

module.exports = router;