
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { obtenerSesionConductor } from '../services/auth.service';

export default function IndexScreen() {
  useEffect(() => {
    async function verificarAcceso() {
      try {
        const usuario = await obtenerSesionConductor();

        if (usuario && usuario.rol === 'conductor') {
          router.replace('/(conductor)');
        } else {
          router.replace('/auth/login');
        }
      } catch (error) {
        router.replace('/auth/login');
      }
    }

    verificarAcceso();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0877D1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
