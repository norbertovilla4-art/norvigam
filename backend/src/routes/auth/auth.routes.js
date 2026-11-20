const express = require('express');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

const {
  registrarUsuario,
  iniciarSesion
} = require('../../controllers/auth.controller');

const {
  verificarToken
} = require('../../middleware/auth.middleware');

// Limite de intentos de inicio de sesion por IP
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta nuevamente en 15 minutos.'
  }
});

// Limite de registros por IP
const limiteRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Se alcanzo el limite de registros. Intenta mas tarde.'
  }
});

router.post('/register', limiteRegistro, registrarUsuario);
router.post('/login', limiteLogin, iniciarSesion);

router.get('/me', verificarToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Usuario autenticado correctamente',
    usuario: req.usuario
  });
});

module.exports = router;
