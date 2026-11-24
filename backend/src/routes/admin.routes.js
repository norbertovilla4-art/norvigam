 
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
  obtenerReporteFinanciero,
  listarDocumentos,
  revisarDocumento,
  obtenerEnlaceDocumento
} = require('../controllers/admin.controller');

// Protección de todas las rutas administrativas
router.use(verificarToken, verificarAdministrador);

// Resumen general
router.get('/resumen', obtenerResumen);

// Gestión de usuarios
router.get('/usuarios', listarUsuarios);
router.patch('/usuarios/:id/estado', cambiarEstadoUsuario);

// Gestión de vehículos
router.get('/vehiculos', listarVehiculos);
router.patch('/vehiculos/:id/estado', cambiarEstadoVehiculo);

// Gestión de viajes
router.get('/viajes', listarViajes);

// Reportes financieros
router.get('/reporte-financiero', obtenerReporteFinanciero);

// Gestión de documentos de conductores
router.get('/documentos', listarDocumentos);
router.patch('/documentos/:id/revision', revisarDocumento);
router.get('/documentos/:id/enlace', obtenerEnlaceDocumento);

module.exports = router;
