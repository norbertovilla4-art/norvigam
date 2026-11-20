import { api } from './api';

export interface Vehiculo {
  id: string;
  tipo_vehiculo: 'Moto' | 'Carro' | 'Taxi';
  marca: string;
  modelo: string;
  placa: string;
  color?: string | null;
  estado: string;
  fecha_registro?: string;
}

export interface NuevoVehiculo {
  tipo_vehiculo: 'Moto' | 'Carro' | 'Taxi';
  marca: string;
  modelo: string;
  placa: string;
  color?: string | null;
}

 export async function obtenerMisVehiculos(): Promise<Vehiculo[]> {
  const respuesta = await api.get('/vehiculos/mis-vehiculos', {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    params: {
      _t: Date.now(),
    },
  });

  if (!respuesta.data.success) {
    throw new Error('No se pudieron consultar los vehículos.');
  }

  return respuesta.data.vehiculos;
}

export async function registrarVehiculo(
  vehiculo: NuevoVehiculo
): Promise<Vehiculo> {
  const respuesta = await api.post('/vehiculos', vehiculo);

  if (!respuesta.data.success) {
    throw new Error('No se pudo registrar el vehículo.');
  }

  return respuesta.data.vehiculo;
}
