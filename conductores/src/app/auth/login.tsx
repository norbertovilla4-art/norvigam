
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
} from 'react-native';

import { router } from 'expo-router';
import { iniciarSesionConductor } from '../../services/auth.service';

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

      await iniciarSesionConductor(telefono.trim(), password);

       router.replace('/(conductor)');
    } catch (error: any) {
      const mensaje =
        error.response?.data?.message ||
        error.message ||
        'No fue posible iniciar sesión.';

      Alert.alert('Error de acceso', mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>TURA MÓVIL</Text>
        <Text style={styles.subtitulo}>Acceso de conductores</Text>

        <Text style={styles.label}>Número de teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa tu teléfono"
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa tu contraseña"
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

        <Text style={styles.pie}>
          Tura Móvil · Buenaventura, Colombia
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 16,
  },
  logo: {
    color: '#0877D1',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    color: '#687386',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
    fontSize: 16,
  },
  label: {
    color: '#172B4D',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D5DCE5',
    borderRadius: 9,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    color: '#172B4D',
  },
  boton: {
    backgroundColor: '#0877D1',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pie: {
    color: '#687386',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 12,
  },
});
