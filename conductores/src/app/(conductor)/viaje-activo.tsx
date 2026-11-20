
import { useEffect, useState } from 'react';
import * as ExpoLocation from 'expo-location';
import { actualizarUbicacion } from '../../services/ubicaciones.service';
 import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, { Marker, Polyline } from 'react-native-maps';
import { api } from '../../services/api';
import { cambiarEstadoViaje, SolicitudViaje } from '../../services/viajes.service';

export default function ViajeActivoScreen() {
  const [viaje, setViaje] = useState<SolicitudViaje | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
function navegarAlPasajero() {
  if (!viaje) return;

  const origen = `${Number(viaje.origen_latitud)},${Number(viaje.origen_longitud)}`;

  const url = `https://www.google.com/maps/dir/?api=1&destination=${origen}&travelmode=driving`;

  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'No se pudo abrir Google Maps.');
  });
}

function navegarAlDestino() {
  if (!viaje) return;

  const destino = `${Number(viaje.destino_latitud)},${Number(viaje.destino_longitud)}`;

  const url = `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;

  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'No se pudo abrir Google Maps.');
  });
}
  async function cargarViajeActivo() {
    try {
      const respuesta = await api.get('/viajes/mi-viaje-activo');
      setViaje(respuesta.data.viaje || null);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'No se pudo consultar el viaje activo.'
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarViajeActivo();
  }, []);

  useEffect(() => {
    if (
      !viaje ||
      !['aceptado', 'en_camino', 'en_curso'].includes(viaje.estado || '')
    ) {
      return;
    }

    let suscripcion: ExpoLocation.LocationSubscription | null = null;
    let cancelado = false;

    async function iniciarSeguimientoGPS() {
      try {
        const permiso =
          await ExpoLocation.requestForegroundPermissionsAsync();
          console.log('GPS: permiso de ubicación:', permiso.status);

        if (permiso.status !== 'granted') {
          if (!cancelado) {
            Alert.alert(
              'Permiso GPS',
              'Debes permitir el acceso a la ubicaciÃ³n para compartir tu recorrido.'
            );
          }
          return;
        }

        const posicion = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        if (cancelado) return;
console.log('GPS: enviando primera ubicación');
        await actualizarUbicacion({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precision_metros: posicion.coords.accuracy ?? undefined,
        });

        if (cancelado) return;

        suscripcion = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async (nuevaPosicion: ExpoLocation.LocationObject) => {
            try {
              await actualizarUbicacion({
                latitud: nuevaPosicion.coords.latitude,
                longitud: nuevaPosicion.coords.longitude,
                precision_metros:
                  nuevaPosicion.coords.accuracy ?? undefined,
              });
            } catch (error) {
              console.warn('Error enviando ubicaciÃ³n GPS:', error);
            }
          }
        );
      } catch (error) {
        console.warn('Error iniciando seguimiento GPS:', error);
      }
    }

    iniciarSeguimientoGPS();

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [viaje?.id, viaje?.estado]);

  async function avanzarEstado() {
    if (!viaje || procesando) return;

    const siguienteEstado =
      viaje.estado === 'aceptado'
        ? 'en_camino'
        : viaje.estado === 'en_camino'
          ? 'en_curso'
          : viaje.estado === 'en_curso'
            ? 'completado'
            : null;

    if (!siguienteEstado) return;

    try {
      setProcesando(true);

      const respuesta = await cambiarEstadoViaje(
        viaje.id,
        siguienteEstado
      );

      setViaje(respuesta.viaje || null);

      if (siguienteEstado === 'completado') {
        Alert.alert(
          'Viaje completado',
          'El servicio terminÃ³ correctamente.',
          [{ text: 'Aceptar', onPress: () => setViaje(null) }]
        );
      } else {
        Alert.alert('Tura MÃ³vil', 'Estado del viaje actualizado.');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'No se pudo actualizar el viaje.'
      );
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0877D1" />
        <Text>Consultando viaje activo...</Text>
      </View>
    );
  }

  if (!viaje) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.titulo}>No tienes un viaje activo</Text>
        <Text style={styles.descripcion}>
          Cuando aceptes una solicitud, aparecerÃ¡ aquÃ­.
        </Text>
      </View>
    );
  }

  const estados: Record<string, string> = {
    aceptado: 'VIAJE ACEPTADO',
    en_camino: 'CONDUCTOR EN CAMINO',
    en_curso: 'PASAJERO A BORDO',
    completado: 'VIAJE COMPLETADO',
  };

  const botones: Record<string, string> = {
    aceptado: 'INICIAR CAMINO AL PASAJERO',
    en_camino: 'CONFIRMAR PASAJERO RECOGIDO',
    en_curso: 'FINALIZAR VIAJE',
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Viaje activo</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.estado}>{estados[viaje.estado || '']}</Text>

        <Text style={styles.etiqueta}>TIPO DE VEHÃCULO</Text>
        <Text style={styles.valor}>{viaje.tipo_vehiculo}</Text>

        <Text style={styles.etiqueta}>ORIGEN</Text>
        <Text style={styles.valor}>
          {Number(viaje.origen_latitud).toFixed(5)},{' '}
          {Number(viaje.origen_longitud).toFixed(5)}
        </Text>

        <Text style={styles.etiqueta}>DESTINO</Text>
        <Text style={styles.valor}>
          {Number(viaje.destino_latitud).toFixed(5)},{' '}
          {Number(viaje.destino_longitud).toFixed(5)}
        </Text>

        <Text style={styles.etiqueta}>TARIFA</Text>
        <Text style={styles.tarifa}>
          ${Number(viaje.tarifa).toLocaleString('es-CO')} COP
        </Text>
      </View>
      <View style={styles.mapaContenedor}>
        <Text style={styles.tituloMapa}>RECORRIDO DEL VIAJE</Text>

        <MapView
          style={styles.mapa}
          initialRegion={{
            latitude:
              (Number(viaje.origen_latitud) +
                Number(viaje.destino_latitud)) / 2,
            longitude:
              (Number(viaje.origen_longitud) +
                Number(viaje.destino_longitud)) / 2,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
        >
          <Marker
            coordinate={{
              latitude: Number(viaje.origen_latitud),
              longitude: Number(viaje.origen_longitud),
            }}
            title="Recogida del pasajero"
            pinColor="green"
          />

          <Marker
            coordinate={{
              latitude: Number(viaje.destino_latitud),
              longitude: Number(viaje.destino_longitud),
            }}
            title="Destino del viaje"
            pinColor="red"
          />

          <Polyline
            coordinates={[
              {
                latitude: Number(viaje.origen_latitud),
                longitude: Number(viaje.origen_longitud),
              },
              {
                latitude: Number(viaje.destino_latitud),
                longitude: Number(viaje.destino_longitud),
              },
            ]}
            strokeColor="#0877D1"
            strokeWidth={4}
          />
        </MapView>
      </View>
            {viaje.estado === 'aceptado' && (
        <TouchableOpacity
          style={styles.botonNavegacion}
          onPress={navegarAlPasajero}
        >
          <Text style={styles.textoBotonNavegacion}>
            ðŸ“ NAVEGAR HACIA EL PASAJERO
          </Text>
        </TouchableOpacity>
      )}

      {viaje.estado === 'en_curso' && (
        <TouchableOpacity
          style={styles.botonNavegacion}
          onPress={navegarAlDestino}
        >
          <Text style={styles.textoBotonNavegacion}>
            ðŸ NAVEGAR AL DESTINO
          </Text>
        </TouchableOpacity>
      )}
      {viaje.estado !== 'completado' && (
        <TouchableOpacity
          style={[
            styles.boton,
            procesando && styles.botonDesactivado,
          ]}
          disabled={procesando}
          onPress={avanzarEstado}
        >
          {procesando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBoton}>
              {botones[viaje.estado || ''] || 'CONTINUAR'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F2F5F9',
    padding: 18,
    paddingTop: 55,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F5F9',
    padding: 20,
  },
  titulo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 20,
  },
  descripcion: {
    color: '#687386',
    textAlign: 'center',
    marginTop: 10,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
  },
  estado: {
    color: '#0877D1',
    fontWeight: 'bold',
    fontSize: 19,
    marginBottom: 20,
  },
  etiqueta: {
    color: '#687386',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 14,
  },
  valor: {
    color: '#172B4D',
    fontSize: 16,
    marginTop: 5,
  },
  tarifa: {
    color: '#16834A',
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 5,
  },
  boton: {
    backgroundColor: '#0877D1',
    padding: 17,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 22,
  },
  botonDesactivado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
    mapaContenedor: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginTop: 18,
    elevation: 3,
  },
  tituloMapa: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  mapa: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  botonNavegacion: {
    backgroundColor: '#16834A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  textoBotonNavegacion: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

