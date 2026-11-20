 
import React, { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = 'http://192.168.1.19:3000/api';

type Usuario = {
  id: string;
  nombre: string;
  apellido?: string;
  telefono: string;
  correo?: string;
  rol: string;
  estado: string;
};
type Vehiculo = {
  id: string;
  conductor_id: string;
  tipo_vehiculo: string;
  marca: string;
  modelo: string;
  placa: string;
  color: string;
  estado: string;
  conductor_nombre: string;
  conductor_telefono: string;
};
type Viaje = {
  id: string;
  pasajero_id: string;
  conductor_id: string | null;
  origen_latitud: number;
  origen_longitud: number;
  destino_latitud: number;
  destino_longitud: number;
  tipo_vehiculo: string;
  distancia_km: number;
  duracion_minutos: number;
  tarifa: number;
  estado: string;
  fecha_creacion: string;
  pasajero_nombre: string;
  pasajero_apellido: string;
  pasajero_telefono: string;
  conductor_nombre: string | null;
  conductor_apellido: string | null;
  conductor_telefono: string | null;
};
type Resumen = {
  usuarios: {
    total: number;
    pasajeros: number;
    conductores: number;
    activos: number;
  };
  vehiculos: { total: number; activos: number };
   viajes: {
  total_viajes: number;
  solicitados: number;
  aceptados: number;
  en_camino: number;
  en_curso: number;
  completados: number;
  cancelados: number;
  ingresos_brutos: number;
};
  finanzas: {
    ingresos_brutos: number;
    comision_15: number;
    ganancias_conductores: number;
  };
};
type ReporteFinanciero = {
  periodo: string;
  total_viajes: number;
  ingresos_brutos: number;
  comision_15: number;
  ganancias_conductores: number;
  por_vehiculo: {
    tipo_vehiculo: string;
    total_viajes: number;
    ingresos_brutos: number;
  }[];
};
const pesos = (valor: number) =>
  '$' + Number(valor || 0).toLocaleString('es-CO');

export default function HomeScreen() {
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [nombre, setNombre] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [reporteFinanciero, setReporteFinanciero] =
  useState<ReporteFinanciero | null>(null);

const [periodoFinanciero, setPeriodoFinanciero] = useState('mes');

const [cargandoReporte, setCargandoReporte] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [cargando, setCargando] = useState(false);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);

const [filtroViaje, setFiltroViaje] = useState('todos');
const [busquedaViaje, setBusquedaViaje] = useState('');
  function error(mensaje: string) {
    Alert.alert('Tura Móvil', mensaje);
  }

  async function cargarResumen(authToken: string) {
    const respuesta = await fetch(`${API_URL}/admin/resumen`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      throw new Error(datos.message || 'Error al cargar resumen');
    }

    setResumen(datos.resumen);
  }

async function generarReportePDF() {
  if (!reporteFinanciero) {
    Alert.alert('Tura Móvil', 'No hay un reporte financiero disponible.');
    return;
  }

  const periodoTexto = {
    dia: 'DIARIO',
    semana: 'SEMANAL',
    mes: 'MENSUAL',
  }[reporteFinanciero.periodo] || 'FINANCIERO';

  const filasVehiculos = reporteFinanciero.por_vehiculo
    .map((vehiculo) => `
      <tr>
        <td>${vehiculo.tipo_vehiculo}</td>
        <td>${vehiculo.total_viajes}</td>
        <td>${pesos(vehiculo.ingresos_brutos)}</td>
      </tr>
    `)
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #222;
          }
          h1 {
            color: #123B70;
            text-align: center;
          }
          h2 {
            color: #123B70;
            margin-top: 30px;
          }
          .periodo {
            text-align: center;
            color: #555;
            margin-bottom: 30px;
          }
          .dato {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #123B70;
            color: white;
          }
          .pie {
            margin-top: 40px;
            text-align: center;
            color: #777;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>TURA MÓVIL</h1>
        <div class="periodo">REPORTE FINANCIERO ${periodoTexto}</div>

        <div class="dato">
          <strong>Viajes completados:</strong>
          ${reporteFinanciero.total_viajes}
        </div>
        <div class="dato">
          <strong>Ingresos brutos:</strong>
          ${pesos(reporteFinanciero.ingresos_brutos)}
        </div>
        <div class="dato">
          <strong>Comisión Tura Móvil (15%):</strong>
          ${pesos(reporteFinanciero.comision_15)}
        </div>
        <div class="dato">
          <strong>Ganancias conductores (85%):</strong>
          ${pesos(reporteFinanciero.ganancias_conductores)}
        </div>

        <h2>Ingresos por vehículo</h2>
        <table>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Viajes</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            ${filasVehiculos}
          </tbody>
        </table>

        <div class="pie">
          Documento generado desde el panel administrativo de Tura Móvil.
        </div>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }

    const archivo = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archivo.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Reporte financiero Tura Móvil',
      });
    } else {
      Alert.alert('Tura Móvil', 'No está disponible la opción para compartir el PDF.');
    }
  } catch (error) {
    console.error('Error generando PDF:', error);
    Alert.alert('Tura Móvil', 'No se pudo generar el reporte PDF.');
  }
}

  async function compartirReporteWhatsApp() {

  if (!reporteFinanciero) {
    Alert.alert('Tura Móvil', 'No hay un reporte financiero disponible.');
    return;
  }

  const periodoTexto = {
    dia: 'DIARIO',
    semana: 'SEMANAL',
    mes: 'MENSUAL',
  }[reporteFinanciero.periodo] || 'FINANCIERO';

  const detalleVehiculos = reporteFinanciero.por_vehiculo
    .map((vehiculo) =>
      `${vehiculo.tipo_vehiculo}: ${vehiculo.total_viajes} viajes - ${pesos(vehiculo.ingresos_brutos)}`
    )
    .join('\n');

  const mensaje = [
    '*TURA MÓVIL - REPORTE FINANCIERO*',
    '',
    `*Período:* ${periodoTexto}`,
    `*Viajes completados:* ${reporteFinanciero.total_viajes}`,
    `*Ingresos brutos:* ${pesos(reporteFinanciero.ingresos_brutos)}`,
    `*Comisión Tura Móvil (15%):* ${pesos(reporteFinanciero.comision_15)}`,
    `*Ganancias conductores (85%):* ${pesos(reporteFinanciero.ganancias_conductores)}`,
    '',
    '*INGRESOS POR VEHÍCULO*',
    detalleVehiculos || 'Sin ingresos registrados',
    '',
    'Reporte generado desde el panel administrativo de Tura Móvil.',
  ].join('\n');

  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Tura Móvil', 'No se pudo abrir WhatsApp.');
  }
}
async function cargarReporteFinanciero(
  authToken: string,
  periodo = periodoFinanciero
) {
  setCargandoReporte(true);

  try {
    const respuesta = await fetch(
      `${API_URL}/admin/reporte-financiero?periodo=${periodo}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      throw new Error(
        datos.message || 'Error al consultar reporte financiero'
      );
    }

    setReporteFinanciero(datos.reporte);

  } catch (e: any) {
    error(e.message || 'No se pudo cargar el reporte financiero');
  } finally {
    setCargandoReporte(false);
  }
}
  async function cargarUsuarios(
    authToken: string,
    buscar = busqueda,
    rol = filtroRol
  ) {
    const parametros = new URLSearchParams();

    if (buscar.trim()) parametros.set('buscar', buscar.trim());
    if (rol !== 'todos') parametros.set('rol', rol);

    const respuesta = await fetch(
      `${API_URL}/admin/usuarios?${parametros.toString()}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      throw new Error(datos.message || 'Error al consultar usuarios');
    }

    setUsuarios(datos.usuarios || []);
  }
 
  async function cargarVehiculos(authToken: string) {
    const respuesta = await fetch(`${API_URL}/admin/vehiculos`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      throw new Error(datos.message || 'Error al consultar vehículos');
    }

    setVehiculos(datos.vehiculos || []);
  }

async function cargarViajes(authToken: string) {
  const respuesta = await fetch(`${API_URL}/admin/viajes`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.success) {
    throw new Error(datos.message || 'Error al consultar viajes');
  }

  setViajes(datos.viajes || []);
}

  async function cambiarEstadoVehiculo(vehiculo: Vehiculo) {
    const nuevoEstado =
      vehiculo.estado === 'activo' ? 'inactivo' : 'activo';

    Alert.alert(
      'Confirmar operación',
      `¿Deseas ${nuevoEstado === 'activo' ? 'activar' : 'desactivar'} el vehículo de placa ${vehiculo.placa}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setCargando(true);
            try {
              const respuesta = await fetch(
                `${API_URL}/admin/vehiculos/${encodeURIComponent(vehiculo.id)}/estado`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ estado: nuevoEstado }),
                }
              );

              const datos = await respuesta.json();

              if (!respuesta.ok || !datos.success) {
                throw new Error(datos.message || 'No se pudo cambiar el estado');
              }

              await cargarVehiculos(token);
              await cargarResumen(token);
              Alert.alert('Tura Móvil', 'Estado del vehículo actualizado.');
            } catch (e: any) {
              error(e.message || 'No se pudo actualizar el vehículo.');
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  }


  async function iniciarSesion() {
    if (!telefono.trim() || !password) {
      error('Ingresa teléfono y contraseña.');
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: telefono.trim(),
          password,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.success) {
        throw new Error(datos.message || 'Error de inicio de sesión');
      }

      if (datos.usuario?.rol !== 'administrador') {
        throw new Error('Esta cuenta no tiene permisos administrativos.');
      }

      setToken(datos.token);
      setNombre(datos.usuario.nombre || 'Administrador');

      await cargarResumen(datos.token);
      await cargarUsuarios(datos.token, '', 'todos');
      await cargarVehiculos(datos.token);
      await cargarViajes(datos.token);
      await cargarReporteFinanciero(datos.token, periodoFinanciero);
    } catch (e: any) {
      setToken('');
      setResumen(null);
      setUsuarios([]);
      error(e.message || 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  async function buscarUsuarios() {
    setCargando(true);
    try {
      await cargarUsuarios(token, busqueda, filtroRol);
    } catch (e: any) {
      error(e.message || 'No se pudo consultar usuarios.');
    } finally {
      setCargando(false);
    }
  }

   
async function cambiarEstado(usuario: Usuario) {
  if (usuario.rol === 'administrador') {
    error('Las cuentas administrativas no se pueden modificar desde aquí.');
    return;
  }

  const nuevoEstado =
    usuario.estado === 'activo' ? 'bloqueado' : 'activo';

  const mensaje = `¿Deseas ${
    nuevoEstado === 'activo' ? 'activar' : 'suspender'
  } la cuenta de ${usuario.nombre}?`;

  const ejecutarCambio = async () => {
    setCargando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/admin/usuarios/${encodeURIComponent(usuario.id)}/estado`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: nuevoEstado }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.success) {
        throw new Error(
          datos.message || `Error HTTP ${respuesta.status}`
        );
      }

      await cargarUsuarios(token, '', filtroRol);
      await cargarResumen(token);

      const mensajeExito = 'Estado actualizado correctamente.';

      if (Platform.OS === 'web') {
        window.alert(mensajeExito);
      } else {
        Alert.alert('Tura Móvil', mensajeExito);
      }
    } catch (e: any) {
      const mensajeError =
        e.message || 'No se pudo actualizar el usuario.';

      if (Platform.OS === 'web') {
        window.alert(mensajeError);
      } else {
        Alert.alert('Error', mensajeError);
      }
    } finally {
      setCargando(false);
    }
  };

  if (Platform.OS === 'web') {
    if (window.confirm(mensaje)) {
      await ejecutarCambio();
    }
    return;
  }

  Alert.alert(
    'Confirmar operación',
    mensaje,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: ejecutarCambio,
      },
    ]
  );
}

  async function actualizarPanel() {
    setCargando(true);
    try {
      await cargarResumen(token);
      await cargarUsuarios(token);
      await cargarVehiculos(token);
      await cargarReporteFinanciero(token, periodoFinanciero);
    } catch (e: any) {
      {/* GESTIÓN DE VIAJES */}
<View style={styles.userHeader}>
  <Text style={styles.userName}>Gestión de viajes</Text>
  <Text style={styles.userInfo}>
    Total de viajes: {viajes.length}
  </Text>
</View>

{viajes.length === 0 ? (
  <Text style={styles.empty}>No hay viajes registrados.</Text>
) : (
  viajes.map((viaje) => (
    <View key={viaje.id} style={styles.userCard}>
      <Text style={styles.userName}>
        Viaje: {viaje.tipo_vehiculo}
      </Text>

      <Text style={styles.userInfo}>
        Pasajero: {viaje.pasajero_nombre} {viaje.pasajero_apellido}
      </Text>

      <Text style={styles.userInfo}>
        Teléfono: {viaje.pasajero_telefono}
      </Text>

      <Text style={styles.userInfo}>
        Conductor: {viaje.conductor_nombre
          ? `${viaje.conductor_nombre} ${viaje.conductor_apellido || ''}`
          : 'Sin asignar'}
      </Text>

      <Text style={styles.userInfo}>
        Estado: {viaje.estado}
      </Text>

      <Text style={styles.userInfo}>
        Distancia: {viaje.distancia_km} km
      </Text>

      <Text style={styles.userInfo}>
        Tarifa: ${Number(viaje.tarifa).toLocaleString('es-CO')}
      </Text>

      <Text style={styles.userInfo}>
        Fecha: {new Date(viaje.fecha_creacion).toLocaleString('es-CO')}
      </Text>
    </View>
  ))
)}
      error(e.message || 'Error al actualizar información.');
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    setToken('');
    setPassword('');
    setNombre('');
    setResumen(null);
    setUsuarios([]);
  }

  const tarjeta = (titulo: string, valor: string | number) => (
    <View style={styles.card} key={titulo}>
      <Text style={styles.cardTitle}>{titulo}</Text>
      <Text style={styles.cardValue}>{valor}</Text>
    </View>
  );

  if (!token || !resumen) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.logo}>TURA MÓVIL</Text>
          <Text style={styles.subtitle}>Panel de administración</Text>

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Número de teléfono"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={styles.loginButton}
            onPress={iniciarSesion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>
            Acceso exclusivo para administradores
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.dashboard}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>TURA MÓVIL</Text>
          <Text style={styles.welcome}>Bienvenido, {nombre}</Text>
        </View>
        <Pressable onPress={cerrarSesion} style={styles.logoutButton}>
          <Text style={styles.buttonText}>Salir</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Resumen general</Text>
      <View style={styles.grid}>
        {tarjeta('Usuarios', resumen.usuarios.total)}
        {tarjeta('Pasajeros', resumen.usuarios.pasajeros)}
        {tarjeta('Conductores', resumen.usuarios.conductores)}
        {tarjeta('Usuarios activos', resumen.usuarios.activos)}
        {tarjeta('Vehículos', resumen.vehiculos.total)}
        {tarjeta('Vehículos activos', resumen.vehiculos.activos)}
      </View>

      <Text style={styles.sectionTitle}>Estado de los viajes</Text>
      <View style={styles.grid}>
        {tarjeta('Total de viajes', resumen.viajes.total_viajes)}
        {tarjeta('Solicitados', resumen.viajes.solicitados)}
        {tarjeta('Aceptados', resumen.viajes.aceptados)}
        {tarjeta('En camino', resumen.viajes.en_camino)}
        {tarjeta('En curso', resumen.viajes.en_curso)}
        {tarjeta('Completados', resumen.viajes.completados)}
        {tarjeta('Cancelados', resumen.viajes.cancelados)}
      </View>
<Text style={styles.sectionTitle}>Gráfico de viajes por estado</Text>

<View style={styles.userCard}>
  {[
    { nombre: 'Solicitados', valor: resumen.viajes.solicitados },
    { nombre: 'Aceptados', valor: resumen.viajes.aceptados },
    { nombre: 'En camino', valor: resumen.viajes.en_camino },
    { nombre: 'En curso', valor: resumen.viajes.en_curso },
    { nombre: 'Completados', valor: resumen.viajes.completados },
    { nombre: 'Cancelados', valor: resumen.viajes.cancelados },
  ].map((item) => {
    const porcentaje = resumen.viajes.total_viajes > 0
      ? (item.valor / resumen.viajes.total_viajes) * 100
      : 0;

    return (
      <View key={item.nombre} style={{ marginBottom: 14 }}>
        <Text style={styles.userInfo}>
          {item.nombre}: {item.valor} ({porcentaje.toFixed(1)}%)
        </Text>

        <View style={{
          height: 12,
          backgroundColor: '#E2E8F0',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <View style={{
            height: 12,
            width: `${porcentaje}%`,
            backgroundColor: '#1677E8',
            borderRadius: 8,
          }} />
        </View>
      </View>
    );
  })}
</View>
      <Text style={styles.sectionTitle}>Resumen financiero</Text>
      <View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
}}>
  {[
    { label: 'Diario', value: 'dia' },
    { label: 'Semanal', value: 'semana' },
    { label: 'Mensual', value: 'mes' },
  ].map((opcion) => (
    <Pressable
      key={opcion.value}
      onPress={async () => {
        setPeriodoFinanciero(opcion.value);
        await cargarReporteFinanciero(token, opcion.value);
      }}
      style={{
        backgroundColor:
          periodoFinanciero === opcion.value ? '#1677E8' : '#E2E8F0',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
      }}
    >
      <Text style={{
        color: periodoFinanciero === opcion.value ? '#FFFFFF' : '#1E293B',
        fontWeight: '600',
      }}>
        {opcion.label}
      </Text>
    </Pressable>
  ))}
</View>
      <View style={styles.grid}>
  {tarjeta(
    'Viajes completados',
    reporteFinanciero?.total_viajes ?? 0
  )}

  {tarjeta(
    'Ingresos brutos',
    pesos(reporteFinanciero?.ingresos_brutos ?? 0)
  )}

  {tarjeta(
    'Comisión Tura Móvil (15%)',
    pesos(reporteFinanciero?.comision_15 ?? 0)
  )}

  {tarjeta(
    'Ganancias conductores (85%)',
    pesos(reporteFinanciero?.ganancias_conductores ?? 0)
  )}
</View>

{cargandoReporte && (
  <ActivityIndicator style={{ margin: 12 }} />
)}
<Pressable
  onPress={compartirReporteWhatsApp}
  style={{
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  }}
>
  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
    COMPARTIR REPORTE POR WHATSAPP
  </Text>
</Pressable>
<Pressable
  onPress={generarReportePDF}
  style={{
    backgroundColor: '#123B70',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  }}
>
  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
    GENERAR REPORTE FINANCIERO PDF
  </Text>
</Pressable>
<Text style={styles.sectionTitle}>
  Ingresos por tipo de vehículo
</Text>

{reporteFinanciero?.por_vehiculo.map((vehiculo) => (
  <View key={vehiculo.tipo_vehiculo} style={styles.userCard}>
    <Text style={styles.userName}>
      {vehiculo.tipo_vehiculo}
    </Text>

    <Text style={styles.userInfo}>
      Viajes completados: {vehiculo.total_viajes}
    </Text>

    <Text style={styles.userInfo}>
      Ingresos: {pesos(vehiculo.ingresos_brutos)}
    </Text>
  </View>
))}

{reporteFinanciero && reporteFinanciero.por_vehiculo.length === 0 && (
  <Text style={styles.empty}>
    No hay ingresos registrados para este período.
  </Text>
)}
      <View style={styles.userHeader}>
        <Text style={styles.sectionTitle}>Gestión de usuarios</Text>
        <Text style={styles.userCount}>{usuarios.length} registros</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre, teléfono o correo"
        value={busqueda}
        onChangeText={setBusqueda}
        onSubmitEditing={buscarUsuarios}
      />

      <View style={styles.filters}>
        {[
          { label: 'Todos', value: 'todos' },
          { label: 'Pasajeros', value: 'pasajero' },
          { label: 'Conductores', value: 'conductor' },
        ].map((f) => (
          <Pressable
            key={f.value}
            style={[
              styles.filterButton,
              filtroRol === f.value && styles.filterSelected,
            ]}
            onPress={() => {
              setFiltroRol(f.value);
              buscarUsuariosConFiltro(f.value);
            }}
          >
            <Text style={filtroRol === f.value ? styles.filterTextSelected : styles.filterText}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.refreshButton} onPress={buscarUsuarios}>
        <Text style={styles.buttonText}>BUSCAR USUARIOS</Text>
      </Pressable>

      {cargando && <ActivityIndicator style={{ margin: 15 }} />}

      {usuarios.map((usuario) => (
        <View style={styles.userCard} key={usuario.id}>
          <Text style={styles.userName}>
            {usuario.nombre} {usuario.apellido || ''}
          </Text>
          <Text style={styles.userInfo}>Teléfono: {usuario.telefono}</Text>
          <Text style={styles.userInfo}>Correo: {usuario.correo || 'No registrado'}</Text>
          <Text style={styles.userInfo}>Rol: {usuario.rol}</Text>
          <Text style={styles.userInfo}>Estado: {usuario.estado}</Text>

          {usuario.rol !== 'administrador' && (
            <Pressable
              style={[
                styles.statusButton,
                usuario.estado === 'activo' ? styles.suspendButton : styles.activateButton,
              ]}
              onPress={() => cambiarEstado(usuario)}
            >
              <Text style={styles.buttonText}>
                {usuario.estado === 'activo' ? 'SUSPENDER CUENTA' : 'ACTIVAR CUENTA'}
              </Text>
            </Pressable>
          )}
        </View>
      ))}

      {!cargando && usuarios.length === 0 && (
        <Text style={styles.empty}>No se encontraron usuarios.</Text>
      )}
<View style={styles.userHeader}>
  <Text style={styles.sectionTitle}>Gestión de vehículos</Text>
  <Text style={styles.userCount}>{vehiculos.length} registrados</Text>
</View>

{vehiculos.map((vehiculo) => (
  <View style={styles.userCard} key={vehiculo.id}>
    <Text style={styles.userName}>
      {vehiculo.marca} {vehiculo.modelo}
    </Text>

    <Text style={styles.userInfo}>Placa: {vehiculo.placa}</Text>
    <Text style={styles.userInfo}>Tipo: {vehiculo.tipo_vehiculo}</Text>
    <Text style={styles.userInfo}>Color: {vehiculo.color || 'No registrado'}</Text>
    <Text style={styles.userInfo}>
      Conductor: {vehiculo.conductor_nombre || 'No registrado'}
    </Text>
    <Text style={styles.userInfo}>
      Teléfono: {vehiculo.conductor_telefono || 'No registrado'}
    </Text>
    <Text style={styles.userInfo}>Estado: {vehiculo.estado}</Text>

    <Pressable
      style={[
        styles.statusButton,
        vehiculo.estado === 'activo'
          ? styles.suspendButton
          : styles.activateButton,
      ]}
      onPress={() => cambiarEstadoVehiculo(vehiculo)}
    >
      <Text style={styles.buttonText}>
        {vehiculo.estado === 'activo'
          ? 'DESACTIVAR VEHÍCULO'
          : 'ACTIVAR VEHÍCULO'}
      </Text>
    </Pressable>
  </View>
))}

{!cargando && vehiculos.length === 0 && (
  <Text style={styles.empty}>No hay vehículos registrados.</Text>
)}
{/* GESTIÓN DE VIAJES */}
 <View>
  <Text style={styles.sectionTitle}>Gestión de viajes</Text>
  <Text style={styles.userCount}>{viajes.length} registrados</Text>
</View>
 {/* BUSCADOR DE VIAJES */}
<TextInput
  style={{
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: '#1E293B',
  }}
  placeholder="Buscar por pasajero, teléfono o conductor..."
  placeholderTextColor="#64748B"
  value={busquedaViaje}
  onChangeText={setBusquedaViaje}
/>

{/* FILTROS DE VIAJES */}
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
}}>
  {[
    { valor: 'todos', texto: 'Todos' },
    { valor: 'solicitado', texto: 'Solicitados' },
    { valor: 'aceptado', texto: 'Aceptados' },
    { valor: 'en_camino', texto: 'En camino' },
    { valor: 'en_curso', texto: 'En curso' },
    { valor: 'completado', texto: 'Completados' },
    { valor: 'cancelado', texto: 'Cancelados' },
  ].map((filtro) => (
    <Pressable
      key={filtro.valor}
      onPress={() => setFiltroViaje(filtro.valor)}
      style={{
        backgroundColor:
          filtroViaje === filtro.valor ? '#1677E8' : '#E2E8F0',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
      }}
    >
      <Text style={{
        color: filtroViaje === filtro.valor ? '#FFFFFF' : '#1E293B',
        fontWeight: '600',
      }}>
        {filtro.texto}
      </Text>
    </Pressable>
  ))}
</View>
  {viajes
  .filter((viaje) => {
    const coincideEstado =
      filtroViaje === 'todos' || viaje.estado === filtroViaje;

    const termino = busquedaViaje.trim().toLowerCase();

    const datosViaje = [
      viaje.pasajero_nombre,
      viaje.pasajero_apellido,
      viaje.pasajero_telefono,
      viaje.conductor_nombre,
      viaje.conductor_apellido,
      viaje.conductor_telefono,
    ].join(' ').toLowerCase();

    const coincideBusqueda = datosViaje.includes(termino);

    return coincideEstado && coincideBusqueda;
  })
  .map((viaje) => (
  <View style={styles.userCard} key={viaje.id}>
    <Text style={styles.userName}>
      Viaje: {viaje.tipo_vehiculo}
    </Text>

    <Text style={styles.userInfo}>
      Pasajero: {viaje.pasajero_nombre} {viaje.pasajero_apellido}
    </Text>

    <Text style={styles.userInfo}>
      Teléfono: {viaje.pasajero_telefono}
    </Text>

    <Text style={styles.userInfo}>
      Conductor: {viaje.conductor_nombre
        ? `${viaje.conductor_nombre} ${viaje.conductor_apellido || ''}`
        : 'Sin asignar'}
    </Text>

    <Text style={styles.userInfo}>Estado: {viaje.estado}</Text>

    <Text style={styles.userInfo}>
      Distancia: {viaje.distancia_km} km
    </Text>

    <Text style={styles.userInfo}>
      Tarifa: ${Number(viaje.tarifa).toLocaleString('es-CO')}
    </Text>

    <Text style={styles.userInfo}>
      Fecha: {new Date(viaje.fecha_creacion).toLocaleString('es-CO')}
    </Text>
  </View>
))}

{!cargando && viajes.length === 0 && (
  <Text style={styles.empty}>No hay viajes registrados.</Text>
)}
      <Pressable style={styles.refreshButton} onPress={actualizarPanel}>
        <Text style={styles.buttonText}>ACTUALIZAR INFORMACIÓN</Text>
      </Pressable>

      <Text style={styles.footer}>Tura Móvil · Administración</Text>
    </ScrollView>
  );

  async function buscarUsuariosConFiltro(rol: string) {
    setCargando(true);
    try {
      await cargarUsuarios(token, busqueda, rol);
    } catch (e: any) {
      error(e.message || 'No se pudo filtrar usuarios.');
    } finally {
      setCargando(false);
    }
  }
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#101827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 18,
  },
  logo: { fontSize: 27, fontWeight: 'bold', color: '#1473E6' },
  subtitle: { fontSize: 17, color: '#64748b', marginBottom: 28, marginTop: 8 },
  label: { fontWeight: '600', color: '#263449', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: '#d5dce5',
    borderRadius: 9,
    padding: 13,
    marginBottom: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#1473E6',
    padding: 15,
    borderRadius: 9,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: 'bold' },
  footer: { textAlign: 'center', color: '#94a3b8', marginTop: 25, marginBottom: 15 },
  dashboard: { flex: 1, backgroundColor: '#f1f5f9', padding: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 14,
    marginBottom: 25,
  },
  welcome: { color: '#64748b', marginTop: 5 },
  logoutButton: { backgroundColor: '#dc3545', padding: 12, borderRadius: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#172337', marginBottom: 14, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 18, width: '47%', minHeight: 95, justifyContent: 'center' },
  cardTitle: { color: '#64748b', fontSize: 13 },
  cardValue: { color: '#1473E6', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  refreshButton: { backgroundColor: '#1473E6', padding: 16, alignItems: 'center', borderRadius: 10, marginVertical: 15 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userCount: { color: '#64748b' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  filterButton: { padding: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  filterSelected: { backgroundColor: '#1473E6' },
  filterText: { color: '#334155' },
  filterTextSelected: { color: '#fff', fontWeight: 'bold' },
  userCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  userName: { color: '#172337', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  userInfo: { color: '#475569', marginBottom: 4 },
  statusButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  suspendButton: { backgroundColor: '#dc3545' },
  activateButton: { backgroundColor: '#16834a' },
  empty: { color: '#64748b', textAlign: 'center', padding: 20 },
});
