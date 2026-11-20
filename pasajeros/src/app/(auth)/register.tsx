
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
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

import { registrarPasajero } from '@/services/auth.service';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  async function registrar() {
    if (!nombre.trim() || !telefono.trim() || !password) {
      Alert.alert('Datos incompletos', 'Completa nombre, teléfono y contraseña.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Contraseña inválida', 'Debe tener mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setCargando(true);

      await registrarPasajero({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        password,
      });

      Alert.alert(
        '¡Registro exitoso!',
        'Tu cuenta de Tura Móvil ha sido creada.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'No fue posible registrarte',
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
        <Text style={styles.logo}>T</Text>
        <Text style={styles.titulo}>Únete a TURA MÓVIL</Text>
        <Text style={styles.subtitulo}>
          Crea tu cuenta y comienza a viajar.
        </Text>

        <View style={styles.formulario}>
          <Text style={styles.etiqueta}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.etiqueta}>Apellido</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu apellido"
            value={apellido}
            onChangeText={setApellido}
          />

          <Text style={styles.etiqueta}>Teléfono *</Text>
          <TextInput
            style={styles.input}
            placeholder="3001234567"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          <Text style={styles.etiqueta}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />

          <Text style={styles.etiqueta}>Contraseña *</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.etiqueta}>Confirmar contraseña *</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite tu contraseña"
            secureTextEntry
            value={confirmarPassword}
            onChangeText={setConfirmarPassword}
          />

          <TouchableOpacity
            style={styles.boton}
            onPress={registrar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botonTexto}>CREAR CUENTA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.volver}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.volverTexto}>
              ¿Ya tienes cuenta? <Text style={styles.enlace}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pie}>Buenaventura, Colombia</Text>
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
    padding: 22,
  },
  logo: {
    alignSelf: 'center',
    backgroundColor: '#0877D1',
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: 'bold',
    width: 70,
    height: 70,
    borderRadius: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    marginBottom: 15,
  },
  titulo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#0877D1',
    textAlign: 'center',
  },
  subtitulo: {
    textAlign: 'center',
    color: '#687386',
    marginTop: 8,
    marginBottom: 25,
  },
  formulario: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
  },
  etiqueta: {
    color: '#26364D',
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    height: 49,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: '#172B4D',
    backgroundColor: '#FFFFFF',
  },
  boton: {
    height: 52,
    backgroundColor: '#0877D1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  volver: {
    alignItems: 'center',
    marginTop: 22,
  },
  volverTexto: {
    color: '#687386',
  },
  enlace: {
    color: '#0877D1',
    fontWeight: 'bold',
  },
  pie: {
    textAlign: 'center',
    color: '#8994A5',
    marginTop: 22,
  },
});
