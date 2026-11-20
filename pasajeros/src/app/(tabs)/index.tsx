 
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { cerrarSesion } from '@/services/auth.service';

export default function HomeScreen() {
  const [cargando, setCargando] = useState(false);

  async function salir() {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de tu cuenta de Tura Móvil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              await cerrarSesion();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'No fue posible cerrar la sesión.');
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TURA MÓVIL</Text>
      <Text style={styles.bienvenida}>¡Bienvenido a Tura Móvil!</Text>
      <Text style={styles.descripcion}>
        Tu transporte en Buenaventura, a un toque de distancia.
      </Text>

      <View style={styles.card}>
        <Text style={styles.titulo}>¿A dónde vamos hoy?</Text>
        <TouchableOpacity style={styles.boton}>
          <Text style={styles.botonTexto}>SOLICITAR UN VIAJE</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.botonSalir}
        onPress={salir}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.textoSalir}>CERRAR SESIÓN</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.pie}>Buenaventura, Colombia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#0877D1',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 35,
  },
  bienvenida: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#172B4D',
    textAlign: 'center',
  },
  descripcion: {
    color: '#687386',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 35,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
    elevation: 3,
  },
  titulo: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 22,
  },
  boton: {
    backgroundColor: '#0877D1',
    padding: 17,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botonSalir: {
    backgroundColor: '#D93636',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
  },
  textoSalir: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pie: {
    color: '#8994A5',
    textAlign: 'center',
    marginTop: 35,
  },
});
