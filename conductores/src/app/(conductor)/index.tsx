 
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { actualizarUbicacion } from '../../services/ubicaciones.service';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  cambiarDisponibilidad,
  obtenerDisponibilidad,
} from '../../services/disponibilidad.service';

import { cerrarSesionConductor } from '../../services/auth.service';

export default function HomeScreen() {
  const router = useRouter();

  const [disponible, setDisponible] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    async function cargarEstado() {
      try {
        const estado = await obtenerDisponibilidad();
        setDisponible(estado.disponible);
      } catch (error) {
        Alert.alert(
          'Conexión',
          'No se pudo consultar tu disponibilidad. Intenta nuevamente.'
        );
      } finally {
        setCargando(false);
      }
    }

    cargarEstado();
  }, []);

  async function cambiarEstado() {
    if (procesando || cargando) return;

    setProcesando(true);

    try {
      const nuevoEstado = await cambiarDisponibilidad(!disponible);
      setDisponible(nuevoEstado.disponible);

      Alert.alert(
        'Tura Móvil',
        nuevoEstado.disponible
          ? 'Ahora estás disponible para recibir viajes.'
          : 'Has dejado de recibir solicitudes de viajes.'
      );
    } catch (error: any) {
      const mensaje =
        error.response?.data?.message ||
        error.message ||
        'No se pudo actualizar tu disponibilidad.';

      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
    }
  }

  function confirmarCerrarSesion() {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de tu cuenta de conductor?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              if (disponible) {
                await cambiarDisponibilidad(false);
              }

              await cerrarSesionConductor();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert(
                'Error',
                'No se pudo cerrar la sesión. Intenta nuevamente.'
              );
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>TURA MÓVIL</Text>
        <Text style={styles.subtitulo}>Panel del conductor</Text>
      </View>

      <View style={styles.estadoCard}>
        <Text style={styles.estadoTitulo}>Estado de conexión</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#0877D1" />
        ) : (
          <Text
            style={[
              styles.estado,
              disponible ? styles.conectado : styles.desconectado,
            ]}
          >
            {disponible ? '● CONECTADO' : '● DESCONECTADO'}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.botonEstado,
            disponible ? styles.botonDesconectar : styles.botonConectar,
            (cargando || procesando) && styles.botonDeshabilitado,
          ]}
          onPress={cambiarEstado}
          disabled={cargando || procesando}
        >
          {procesando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>
              {disponible
                ? 'DEJAR DE RECIBIR VIAJES'
                : 'CONECTARME'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.botonVehiculo}
        onPress={() => router.push('/(conductor)/vehiculo')}
      >
        <Text style={styles.iconoVehiculo}>🚗</Text>
        <View style={styles.infoVehiculo}>
          <Text style={styles.tituloVehiculo}>MI VEHÍCULO</Text>
          <Text style={styles.descripcionVehiculo}>
            Registrar y consultar mis vehículos
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Mis viajes</Text>
        <Text style={styles.numero}>0</Text>
        <Text style={styles.descripcion}>Viajes pendientes</Text>
      </View>

      <TouchableOpacity
        style={styles.botonSolicitudes}
        onPress={() => router.push('/(conductor)/solicitudes')}
      >
        <Text style={styles.iconoSolicitudes}>🚕</Text>
        <View style={styles.infoVehiculo}>
          <Text style={styles.tituloVehiculo}>SOLICITUDES DE VIAJE</Text>
          <Text style={styles.descripcionVehiculo}>
            Consultar y aceptar viajes disponibles
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </TouchableOpacity>
       
      <TouchableOpacity
        style={styles.botonSolicitudes}
        onPress={() => router.push('/(conductor)/viaje-activo')}
      >
        <Text style={styles.iconoSolicitudes}>🛵</Text>
        <View style={styles.infoVehiculo}>
          <Text style={styles.tituloVehiculo}>VIAJE ACTIVO</Text>
          <Text style={styles.descripcionVehiculo}>
            Consultar y gestionar el viaje aceptado
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botonSolicitudes}
        onPress={() => router.push('/(conductor)/historial')}
      >
        <Text style={styles.iconoSolicitudes}>💰</Text>
        <View style={styles.infoVehiculo}>
          <Text style={styles.tituloVehiculo}>
            HISTORIAL Y GANANCIAS
          </Text>
          <Text style={styles.descripcionVehiculo}>
            Consultar viajes completados e ingresos
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </TouchableOpacity>
  
       

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Solicitudes de viaje</Text>
        <Text style={styles.descripcion}>
          Aquí aparecerán las solicitudes de pasajeros.
        </Text>

        {!disponible && (
          <Text style={styles.aviso}>
            Conéctate para comenzar a recibir solicitudes.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Información</Text>
        <Text style={styles.descripcion}>
          Tura Móvil · Buenaventura, Colombia
        </Text>
      </View>

      <TouchableOpacity
        style={styles.botonCerrarSesion}
        onPress={confirmarCerrarSesion}
      >
        <Text style={styles.textoCerrarSesion}>
          CERRAR SESIÓN
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  header: {
    backgroundColor: '#0877D1',
    padding: 25,
    alignItems: 'center',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 5,
  },
  estadoCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  estadoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  estado: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  conectado: {
    color: '#16A05D',
  },
  desconectado: {
    color: '#D64545',
  },
  botonEstado: {
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  botonConectar: {
    backgroundColor: '#16A05D',
  },
  botonDesconectar: {
    backgroundColor: '#D64545',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botonVehiculo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoVehiculo: {
    fontSize: 30,
    marginRight: 15,
  },
  infoVehiculo: {
    flex: 1,
  },
  tituloVehiculo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  descripcionVehiculo: {
    fontSize: 13,
    color: '#687386',
    marginTop: 5,
  },
  flecha: {
    fontSize: 28,
    color: '#0877D1',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
  },
  cardTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 10,
  },
  numero: {
    fontSize: 32,
    color: '#0877D1',
    fontWeight: 'bold',
  },
  descripcion: {
    fontSize: 14,
    color: '#687386',
  },
  aviso: {
    color: '#D18B00',
    marginTop: 12,
    fontWeight: 'bold',
  },
  botonSolicitudes: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0877D1',
  },
  iconoSolicitudes: {
    fontSize: 30,
    marginRight: 15,
  },
  botonCerrarSesion: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D64545',
    alignItems: 'center',
  },
  textoCerrarSesion: {
    color: '#D64545',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
