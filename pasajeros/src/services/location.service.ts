
import * as Location from 'expo-location';

export interface UbicacionPasajero {
  latitud: number;
  longitud: number;
  direccion: string;
}

export async function obtenerUbicacionActual(): Promise<UbicacionPasajero> {
  const permiso = await Location.requestForegroundPermissionsAsync();

  if (permiso.status !== 'granted') {
    throw new Error('Debes permitir el acceso a tu ubicación.');
  }

  const ubicacion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const latitud = ubicacion.coords.latitude;
  const longitud = ubicacion.coords.longitude;

  const direcciones = await Location.reverseGeocodeAsync({
    latitude: latitud,
    longitude: longitud,
  });

  const lugar = direcciones[0];

  const direccion = lugar
    ? [
        lugar.street,
        lugar.streetNumber,
        lugar.district,
        lugar.city,
      ].filter(Boolean).join(', ')
    : 'Ubicación actual';

  return {
    latitud,
    longitud,
    direccion,
  };
}
