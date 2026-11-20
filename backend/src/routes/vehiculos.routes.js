const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth.middleware');

const {
  registrarVehiculo,
  obtenerMisVehiculos
} = require('../controllers/vehiculos.controller');

router.post('/', verificarToken, registrarVehiculo);
router.get('/mis-vehiculos', verificarToken, obtenerMisVehiculos);

module.exports = router;
