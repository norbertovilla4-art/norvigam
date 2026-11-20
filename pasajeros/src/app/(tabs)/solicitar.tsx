 
import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
 import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  MapPressEvent,
  Region,
} from 'react-native-maps';

import { obtenerUbicacionActual } from '@/services/location.service';
import { solicitarViaje } from '@/services/auth.service';
import { useEffect } from 'react';
import { obtenerUbicacionConductor } from '@/services/ubicaciones.service';
import type { UbicacionConductor } from '@/services/ubicaciones.service';

type Punto = {
  latitud: number;
  longitud: number;
  direccion: string;
};

const REGION_INICIAL: Region = {
  latitude: 3.8801,
  longitude: -77.0312,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function SolicitarScreen() {
  const mapaRef = useRef<MapView>(null);

  const [ubicacion, setUbicacion] = useState<Punto | null>(null);
  const [destino, setDestino] = useState<Punto | null>(null);
  const [coordenadasRuta, setCoordenadasRuta] = useState<
  { latitude: number; longitude: number }[]
>([]);

const [distanciaKm, setDistanciaKm] = useState<number | null>(null);
const [duracionMinutos, setDuracionMinutos] = useState<number | null>(null);
const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [vehiculo, setVehiculo] = useState<'Moto' | 'Carro' | 'Taxi'>('Moto');
  const [cargando, setCargando] = useState(false);
const [solicitandoViaje, setSolicitandoViaje] = useState(false);
const [viajeId, setViajeId] = useState<string | null>(null);
const [ubicacionConductor, setUbicacionConductor] =
  useState<UbicacionConductor | null>(null);
  useEffect(() => {
  if (!viajeId) {
    return;
  }

  let activo = true;

  const consultarUbicacion = async () => {
    try {
      const respuesta = await obtenerUbicacionConductor(viajeId);

      if (activo) {
        setUbicacionConductor(respuesta.ubicacion);
      }
    } catch (error) {
      console.log('Error consultando GPS del conductor:', error);
    }
  };

  consultarUbicacion();

  const intervalo = setInterval(consultarUbicacion, 5000);

  return () => {
    activo = false;
    clearInterval(intervalo);
  };
}, [viajeId]);
  const tarifas = {
    Moto: { base: 2500, kilometro: 1200, minuto: 180, minimo: 4500 },
    Carro: { base: 4000, kilometro: 1800, minuto: 250, minimo: 7000 },
    Taxi: { base: 4000, kilometro: 1800, minuto: 250, minimo: 7000 },
  };

  const tarifaSeleccionada = tarifas[vehiculo];

  const precioEstimado =
    distanciaKm !== null && duracionMinutos !== null
      ? Math.max(
          tarifaSeleccionada.minimo,
          Math.round(
            tarifaSeleccionada.base +
            distanciaKm * tarifaSeleccionada.kilometro +
            duracionMinutos * tarifaSeleccionada.minuto
          )
        )
      : null;

  async function localizarPasajero() {
    try {
      setCargando(true);

      const resultado = await obtenerUbicacionActual();

      setUbicacion(resultado);

      mapaRef.current?.animateToRegion({
        latitude: resultado.latitud,
        longitude: resultado.longitud,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    } catch (error) {
      Alert.alert(
        'Ubicación no disponible',
        error instanceof Error ? error.message : 'No se pudo obtener el GPS.'
      );
    } finally {
      setCargando(false);
    }
  }

async function calcularRuta() {
  if (!ubicacion || !destino) {
    Alert.alert(
      'Faltan ubicaciones',
      'Primero obtén tu ubicación GPS y selecciona un destino en el mapa.'
    );
    return;
  }

  try {
    setCalculandoRuta(true);

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${ubicacion.longitud},${ubicacion.latitud};` +
      `${destino.longitud},${destino.latitud}` +
      '?overview=full&geometries=geojson';

    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    if (!respuesta.ok || datos.code !== 'Ok' || !datos.routes?.length) {
      throw new Error('No se encontró una ruta entre los dos puntos.');
    }

    const ruta = datos.routes[0];

    const puntos = ruta.geometry.coordinates.map(
      (coordenada: [number, number]) => ({
        latitude: coordenada[1],
        longitude: coordenada[0],
      })
    );

    setCoordenadasRuta(puntos);
    setDistanciaKm(ruta.distance / 1000);
    setDuracionMinutos(ruta.duration / 60);
  } catch (error) {
    Alert.alert(
      'Error al calcular la ruta',
      error instanceof Error ? error.message : 'No se pudo calcular la ruta.'
    );
  } finally {
    setCalculandoRuta(false);
  }
}

  function seleccionarDestino(evento: MapPressEvent) {
    const { latitude, longitude } = evento.nativeEvent.coordinate;

    setDestino({
      latitud: latitude,
      longitud: longitude,
      direccion: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    });
  }
async function confirmarViaje() {
     if (
    !ubicacion ||
    !destino ||
    distanciaKm === null ||
    duracionMinutos === null ||
    precioEstimado === null
  ) {
    Alert.alert(
      'Datos incompletos',
      'Primero ubica tu posición, selecciona el destino y calcula la ruta.'
    );
    return;
  }

  setSolicitandoViaje(true);

  try {
     const respuesta = await solicitarViaje({
      origen_latitud: ubicacion.latitud,
      origen_longitud: ubicacion.longitud,
      destino_latitud: destino.latitud,
      destino_longitud: destino.longitud,
      tipo_vehiculo: vehiculo as 'Moto' | 'Carro' | 'Taxi',
      distancia_km: Number(distanciaKm.toFixed(2)),
      duracion_minutos: Math.ceil(duracionMinutos),
      tarifa: precioEstimado,
    });
if (respuesta?.viaje?.id) {
  setViajeId(String(respuesta.viaje.id));
}
    Alert.alert(
      '¡Viaje solicitado!',
      'Tu solicitud fue registrada correctamente.'
    );
  } catch (error) {
    Alert.alert(
      'Error al solicitar el viaje',
      error instanceof Error ? error.message : 'No se pudo registrar el viaje.'
    );
  } finally {
    setSolicitandoViaje(false);
  }
}
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Solicitar un viaje</Text>

      <Text style={styles.instruccion}>
        Toca el mapa para seleccionar tu destino
      </Text>

      <View style={styles.mapaContainer}>
        <MapView
          ref={mapaRef}
          style={styles.mapa}
          provider={PROVIDER_GOOGLE}
          initialRegion={REGION_INICIAL}
          onPress={seleccionarDestino}
        >
          {ubicacion && (
            <Marker
              coordinate={{
                latitude: ubicacion.latitud,
                longitude: ubicacion.longitud,
              }}
              pinColor="blue"
              title="Punto de recogida"
              description={ubicacion.direccion}
            />
          )}

          {destino && (
            <Marker
              coordinate={{
                latitude: destino.latitud,
                longitude: destino.longitud,
              }}
              pinColor="red"
              title="Destino seleccionado"
              description={destino.direccion}
            />
          )}
          {ubicacionConductor && (
  <Marker
    coordinate={{
      latitude: ubicacionConductor.latitud,
      longitude: ubicacionConductor.longitud,
    }}
    pinColor="green"
    title="Tu conductor"
    description="Ubicación GPS actualizada"
  />
)}
                  {coordenadasRuta.length > 0 && (
            <Polyline
              coordinates={coordenadasRuta}
              strokeColor="#0877D1"
              strokeWidth={5}
            />
          )}</MapView>
      </View>

      <View style={styles.panel}>

<Text style={styles.subtitulo}>Selecciona tu vehículo</Text>

<View style={styles.vehiculos}>
  {(['Moto', 'Carro', 'Taxi'] as const).map((tipo) => (
    <TouchableOpacity
      key={tipo}
      style={[
        styles.vehiculoBoton,
        vehiculo === tipo && styles.vehiculoSeleccionado,
      ]}
      onPress={() => setVehiculo(tipo)}
    >
      <Text
        style={[
          styles.vehiculoTexto,
          vehiculo === tipo && styles.vehiculoTextoSeleccionado,
        ]}
      >
        {tipo === 'Moto' ? '🏍️' : tipo === 'Carro' ? '🚗' : '🚕'}
        {'\n'}
        {tipo}
      </Text>
    </TouchableOpacity>
  ))}
</View>

        <Text style={styles.subtitulo}>Punto de recogida</Text>

        <Text style={styles.direccion}>
          {ubicacion?.direccion || 'Obtén primero tu ubicación GPS'}
        </Text>

        <Text style={styles.subtitulo}>Destino</Text>

        <Text style={styles.direccion}>
          {destino?.direccion || 'Toca el mapa para elegir el destino'}
        </Text>

        <TouchableOpacity
          style={styles.boton}
          onPress={localizarPasajero}
          disabled={cargando}
        >
           {cargando ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <Text style={styles.botonTexto}>
      OBTENER MI UBICACIÓN
    </Text>
  )}
</TouchableOpacity>   
        <TouchableOpacity
          style={styles.botonRuta}
          onPress={calcularRuta}
          disabled={calculandoRuta}
        >
          {calculandoRuta ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>
              CALCULAR RUTA
            </Text>
          )}
        </TouchableOpacity>

        {distanciaKm !== null && duracionMinutos !== null && (
          <View style={styles.resultadoRuta}>
            <Text style={styles.resultadoTexto}>
              Distancia: {distanciaKm.toFixed(2)} km
            </Text>
            <Text style={styles.resultadoTexto}>
              Tiempo estimado: {Math.ceil(duracionMinutos)} minutos
            </Text>
          </View>
        )}

        {precioEstimado !== null && (
          <View style={styles.precioContainer}>
            <Text style={styles.precioTitulo}>
              TARIFA ESTIMADA - {vehiculo.toUpperCase()}
            </Text>
            <Text style={styles.precioValor}>
              ${precioEstimado.toLocaleString('es-CO')} COP
            </Text>
            <Text style={styles.precioNota}>
              Valor aproximado del servicio
            </Text>
          </View>
        )}

           
{precioEstimado !== null && (
  <TouchableOpacity
    style={styles.boton}
    onPress={confirmarViaje}
    disabled={solicitandoViaje}
  >
    {solicitandoViaje ? (
      <ActivityIndicator color="#FFFFFF" />
    ) : (
      <Text style={styles.botonTexto}>
        CONFIRMAR VIAJE
      </Text>
    )}
  </TouchableOpacity>
)}
        <Text style={styles.nota}>
          Tura Móvil · Buenaventura, Colombia
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
      precioContainer: {
    backgroundColor: '#E5F7EC',
    borderWidth: 1,
    borderColor: '#16A05D',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  precioTitulo: {
    color: '#176B3A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  precioValor: {
    color: '#087A3E',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  precioNota: {
    color: '#687386',
    fontSize: 12,
  },
      botonRuta: {
    backgroundColor: '#16A05D',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  resultadoRuta: {
    backgroundColor: '#EAF3FC',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  resultadoTexto: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: 'bold',
    marginVertical: 3,
  },
      vehiculos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 10,
  },
  vehiculoBoton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DCE5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  vehiculoSeleccionado: {
    backgroundColor: '#0877D1',
    borderColor: '#0877D1',
  },
  vehiculoTexto: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 25,
  },
  vehiculoTextoSeleccionado: {
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  titulo: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#0877D1',
    padding: 12,
    textAlign: 'center',
  },
  instruccion: {
    textAlign: 'center',
    color: '#687386',
    marginBottom: 8,
  },
  mapaContainer: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 12,
    borderRadius: 16,
  },
  mapa: {
    flex: 1,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  direccion: {
    fontSize: 13,
    color: '#687386',
    marginVertical: 8,
  },
  boton: {
    backgroundColor: '#0877D1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  nota: {
    color: '#8994A5',
    textAlign: 'center',
    marginTop: 12,
  },
});
