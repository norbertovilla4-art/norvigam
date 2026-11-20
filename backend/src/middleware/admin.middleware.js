
function verificarAdministrador(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso exclusivo para administradores'
    });
  }

  next();
}

module.exports = { verificarAdministrador };
