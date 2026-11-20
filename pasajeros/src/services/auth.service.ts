
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.19:3000/api';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string | null;
  telefono: string;
  correo: string | null;
  rol: 'pasajero' | 'conductor' | 'administrador';
  estado: string;
}

interface RespuestaAuth {
  success: boolean;
  message: string;
  token?: string;
  usuario?: Usuario;
}

async function solicitar(
  ruta: string,
  opciones: RequestInit = {}
) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.success) {
    throw new Error(datos.message || 'Error de conexión');
  }

  return datos;
}

// Registrar pasajero
export async function registrarPasajero(datos: {
  nombre: string;
  apellido?: string;
  telefono: string;
  correo?: string;
  password: string;
}) {
  return solicitar('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...datos,
      rol: 'pasajero',
    }),
  });
}

// Iniciar sesión
export async function iniciarSesion(
  telefono: string,
  password: string
) {
  const respuesta: RespuestaAuth = await solicitar(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ telefono, password }),
    }
  );

  if (!respuesta.token || !respuesta.usuario) {
    throw new Error('Respuesta de autenticación incompleta');
  }

  await SecureStore.setItemAsync(
    'tura_passenger_token',
    respuesta.token
  );

  await SecureStore.setItemAsync(
    'tura_passenger_user',
    JSON.stringify(respuesta.usuario)
  );

  return respuesta.usuario;
}

// Consultar usuario conectado
export async function obtenerUsuarioActual() {
  const token = await SecureStore.getItemAsync(
    'tura_passenger_token'
  );

  if (!token) {
    return null;
  }

  try {
    const respuesta = await solicitar('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return respuesta.usuario as Usuario;
  } catch {
    await cerrarSesion();
    return null;
  }
}

// Cerrar sesión
export async function cerrarSesion() {
  await SecureStore.deleteItemAsync('tura_passenger_token');
  await SecureStore.deleteItemAsync('tura_passenger_user');
}
// Solicitar un viaje al backend
export async function solicitarViaje(datos: {
  origen_latitud: number;
  origen_longitud: number;
  destino_latitud: number;
  destino_longitud: number;
  tipo_vehiculo: 'Moto' | 'Carro' | 'Taxi';
  distancia_km: number;
  duracion_minutos: number;
  tarifa: number;
}) {
  const token = await SecureStore.getItemAsync(
    'tura_passenger_token'
  );

  if (!token) {
    throw new Error('Debes iniciar sesión para solicitar un viaje.');
  }

  return solicitar('/viajes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });
}