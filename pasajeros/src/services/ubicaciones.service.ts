 
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://norvigam.onrender.com/api';

export interface UbicacionConductor {
  latitud: number;
  longitud: number;
  precision_metros?: number;
  actualizado_en?: string;
}

export async function obtenerUbicacionConductor(viajeId: string) {
  const token = await SecureStore.getItemAsync(
    'tura_passenger_token'
  );

  if (!token) {
    throw new Error('Debes iniciar sesión.');
  }

  const respuesta = await fetch(
    `${API_URL}/ubicaciones/viaje/${encodeURIComponent(viajeId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.success) {
    throw new Error(
      datos.message || 'No se pudo consultar la ubicación del conductor.'
    );
  }

  return datos as {
    success: boolean;
    ubicacion: UbicacionConductor | null;
  };
}
