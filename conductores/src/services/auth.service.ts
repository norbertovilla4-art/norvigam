
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
export async function iniciarSesionConductor(
  telefono: string,
  password: string
) {
   const respuesta = await api.post('/auth/login', {
  telefono: telefono.trim(),
  password: password.trim(),
});
  const datos = respuesta.data;

  if (!datos.success || datos.usuario?.rol !== 'conductor') {
    throw new Error('Esta cuenta no pertenece a un conductor.');
  }

  await SecureStore.setItemAsync(
    'tura_driver_token',
    datos.token
  );

  await SecureStore.setItemAsync(
    'tura_driver_user',
    JSON.stringify(datos.usuario)
  );

  return datos.usuario;
}

export async function cerrarSesionConductor() {
  await SecureStore.deleteItemAsync('tura_driver_token');
  await SecureStore.deleteItemAsync('tura_driver_user');
}

export async function obtenerSesionConductor() {
  const token = await SecureStore.getItemAsync('tura_driver_token');
  const usuario = await SecureStore.getItemAsync('tura_driver_user');

  if (!token || !usuario) {
    return null;
  }

  return JSON.parse(usuario);
}
