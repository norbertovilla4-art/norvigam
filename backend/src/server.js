
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
 const pool = require('./config/database');

const authRoutes = require('./routes/auth/auth.routes');
const viajesRoutes = require('./routes/viajes.routes');
const conductoresRoutes = require('./routes/conductores.routes');
const vehiculosRoutes = require('./routes/vehiculos.routes');
const ubicacionesRoutes = require('./routes/ubicaciones.routes');
const app = express();
const adminRoutes = require('./routes/admin.routes');
app.use(helmet());
// CORS restringido a equipos de desarrollo y redes privadas
const corsOptions = {
  origin: (origin, callback) => {
    const localAllowed = !origin ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin);

    callback(null, localAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api/auth', authRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/conductores', conductoresRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);
app.use('/api/admin', adminRoutes);
// Ruta principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al servidor central de Tura Movil',
    version: '1.0.0'
  });
});

// Estado del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    service: 'Tura Movil API',
    timestamp: new Date().toISOString()
  });
});

if (process.env.ENABLE_DB_HEALTH === 'true') {
// Prueba de PostgreSQL
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS fecha, current_database() AS database'
    );

    res.json({
      success: true,
      message: 'Conexion con PostgreSQL exitosa',
      database: result.rows[0].database,
      timestamp: result.rows[0].fecha
    });

  } catch (error) {
    console.error('Error PostgreSQL:', error.message);

    res.status(500).json({
      success: false,
      message: 'Error conectando con PostgreSQL',
      detail: 'Servicio no disponible'
    });
  }
});

}
// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Errores generales
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('===================================');
  console.log('       TURA MOVIL API v1.0');
  console.log('===================================');
  console.log(`Servidor activo en puerto ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Salud: http://localhost:${PORT}/api/health`);
  console.log(`DB: http://localhost:${PORT}/api/db-health`);
});


