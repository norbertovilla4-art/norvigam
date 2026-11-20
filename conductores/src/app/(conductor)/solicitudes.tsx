
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    aceptarViaje,
    obtenerSolicitudesPendientes,
    SolicitudViaje,
} from '../../services/viajes.service';

export default function SolicitudesScreen() {
  const [solicitudes, setSolicitudes] = useState<SolicitudViaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [viajeAceptando, setViajeAceptando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargarSolicitudes = useCallback(async (silencioso = false) => {
    try {
      if (silencioso) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const datos = await obtenerSolicitudesPendientes();
      setSolicitudes(datos);
      setError('');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
        'No fue posible consultar las solicitudes.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();

    const intervalo = setInterval(() => {
      cargarSolicitudes(true);
    }, 7000);

    return () => clearInterval(intervalo);
  }, [cargarSolicitudes]);

  const confirmarAceptacion = (viaje: SolicitudViaje) => {
    Alert.alert(
      'Aceptar viaje',
      '¿Deseas aceptar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: () => ejecutarAceptacion(viaje.id),
        },
      ]
    );
  };

  const ejecutarAceptacion = async (viajeId: string) => {
    try {
      setViajeAceptando(viajeId);

      await aceptarViaje(viajeId);

      setSolicitudes((actuales) =>
        actuales.filter((viaje) => viaje.id !== viajeId)
      );

      Alert.alert('¡Viaje aceptado!', 'El viaje fue asignado a tu cuenta.');
    } catch (e: any) {
      const mensaje =
        e?.response?.data?.message ||
        'No fue posible aceptar el viaje. Puede que otro conductor ya lo haya aceptado.';

      Alert.alert('No se pudo aceptar', mensaje);
      cargarSolicitudes(true);
    } finally {
      setViajeAceptando(null);
    }
  };

  const formatoDinero = (valor: number | string) =>
    Number(valor).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });

  const renderSolicitud = ({ item }: { item: SolicitudViaje }) => (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text style={styles.tipo}>{item.tipo_vehiculo}</Text>
        <Text style={styles.tarifa}>{formatoDinero(item.tarifa)}</Text>
      </View>

      <Text style={styles.etiqueta}>ORIGEN</Text>
      <Text style={styles.coordenadas}>
        {Number(item.origen_latitud).toFixed(5)}, {Number(item.origen_longitud).toFixed(5)}
      </Text>

      <Text style={styles.etiqueta}>DESTINO</Text>
      <Text style={styles.coordenadas}>
        {Number(item.destino_latitud).toFixed(5)}, {Number(item.destino_longitud).toFixed(5)}
      </Text>

      <View style={styles.detalles}>
        <Text style={styles.detalle}>
          Distancia: {item.distancia_km ?? 'No disponible'} km
        </Text>
        <Text style={styles.detalle}>
          Duración: {item.duracion_minutos ?? 'No disponible'} min
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.boton,
          viajeAceptando === item.id && styles.botonDesactivado,
        ]}
        disabled={viajeAceptando !== null}
        onPress={() => confirmarAceptacion(item)}
      >
        {viajeAceptando === item.id ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.textoBoton}>ACEPTAR VIAJE</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1677D2" />
        <Text style={styles.mensaje}>Buscando solicitudes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Solicitudes de viaje</Text>
      <Text style={styles.subtitulo}>
        Las nuevas solicitudes se actualizan cada 7 segundos.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={solicitudes}
        keyExtractor={(item) => item.id}
        renderItem={renderSolicitud}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarSolicitudes(true)}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.iconoVacio}>🚕</Text>
            <Text style={styles.textoVacio}>
              No hay solicitudes disponibles.
            </Text>
            <Text style={styles.ayuda}>
              Mantente conectado para recibir nuevos viajes.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F3F5F8',
    padding: 16,
    paddingTop: 50,
  },
  titulo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  subtitulo: {
    color: '#667085',
    marginTop: 6,
    marginBottom: 16,
  },
  lista: {
    paddingBottom: 25,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 17,
    marginBottom: 14,
    elevation: 3,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  tipo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  tarifa: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#16834A',
  },
  etiqueta: {
    color: '#667085',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
  },
  coordenadas: {
    fontSize: 15,
    color: '#172B4D',
    marginTop: 3,
  },
  detalles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    marginBottom: 16,
  },
  detalle: {
    color: '#475467',
    fontSize: 12,
  },
  boton: {
    backgroundColor: '#1677D2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonDesactivado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
  },
  mensaje: {
    marginTop: 12,
    color: '#475467',
  },
  vacio: {
    alignItems: 'center',
    marginTop: 90,
  },
  iconoVacio: {
    fontSize: 48,
  },
  textoVacio: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#172B4D',
    marginTop: 12,
  },
  ayuda: {
    color: '#667085',
    marginTop: 7,
    textAlign: 'center',
  },
  error: {
    color: '#B42318',
    marginBottom: 12,
  },
});
