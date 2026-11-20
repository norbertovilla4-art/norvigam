
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

import { iniciarSesion } from '@/services/auth.service';

export default function LoginScreen() {
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    if (!telefono.trim() || !password) {
      Alert.alert('Datos incompletos', 'Ingresa tu teléfono y contraseña.');
      return;
    }

    try {
      setCargando(true);

      const usuario = await iniciarSesion(
        telefono.trim(),
        password
      );

      if (usuario.rol !== 'pasajero') {
        Alert.alert('Acceso no permitido', 'Esta aplicación es para pasajeros.');
        return;
      }

       router.replace('/(tabs)');
      } catch (error) {
      Alert.alert(
        'No fue posible ingresar',
        error instanceof Error ? error.message : 'Error de conexión'
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={styles.logoTexto}>T</Text>
        </View>

        <Text style={styles.titulo}>TURA MÓVIL</Text>
        <Text style={styles.subtitulo}>
          Tu transporte, a un toque de distancia
        </Text>

        <View style={styles.formulario}>
          <Text style={styles.encabezado}>Bienvenido</Text>
          <Text style={styles.descripcion}>
            Ingresa a tu cuenta para solicitar tu viaje.
          </Text>

          <Text style={styles.etiqueta}>Número de teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 3001234567"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
            maxLength={20}
          />

          <Text style={styles.etiqueta}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu contraseña"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.boton}
            onPress={ingresar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botonTexto}>INICIAR SESIÓN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registro}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registroTexto}>
              ¿No tienes cuenta? <Text style={styles.enlace}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pie}>
          Tura Móvil · Buenaventura, Colombia
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 25,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#0877D1',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  logoTexto: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: 'bold',
  },
  titulo: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#0877D1',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#687386',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 35,
  },
  formulario: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 23,
    elevation: 4,
  },
  encabezado: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#172B4D',
  },
  descripcion: {
    fontSize: 14,
    color: '#687386',
    marginTop: 7,
    marginBottom: 25,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#26364D',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#172B4D',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  boton: {
    height: 53,
    backgroundColor: '#0877D1',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  registro: {
    alignItems: 'center',
    marginTop: 24,
  },
  registroTexto: {
    color: '#687386',
    fontSize: 14,
  },
  enlace: {
    color: '#0877D1',
    fontWeight: 'bold',
  },
  pie: {
    textAlign: 'center',
    color: '#8994A5',
    fontSize: 12,
    marginTop: 30,
  },
});
