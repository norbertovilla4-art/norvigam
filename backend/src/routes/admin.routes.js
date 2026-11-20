 
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');
const {
  verificarAdministrador
} = require('../middleware/admin.middleware');

  const {
    obtenerResumen,
  listarUsuarios,
  cambiarEstadoUsuario,
  listarVehiculos,
  cambiarEstadoVehiculo,
  listarViajes,
  obtenerReporteFinanciero 
} = require('../controllers/admin.controller');
 
// Protección para todas las rutas administrativas
router.use(verificarToken, verificarAdministrador);

// Resumen general
router.get('/resumen', obtenerResumen);

// Gestión de usuarios
router.get('/usuarios', listarUsuarios);
// Gestión administrativa de vehículos
router.get('/vehiculos', listarVehiculos);
router.get('/viajes', listarViajes);
router.get('/reporte-financiero', obtenerReporteFinanciero);
router.patch('/vehiculos/:id/estado', cambiarEstadoVehiculo);

// Activar, desactivar o suspender usuarios
router.patch('/usuarios/:id/estado', cambiarEstadoUsuario);

module.exports = router;

