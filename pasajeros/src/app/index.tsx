

import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

import { obtenerUsuarioActual } from '@/services/auth.service';

export default function Index() {
  const [destino, setDestino] = useState<
    '/(auth)/login' | '/(tabs)' | null
  >(null);

  useEffect(() => {
    async function comprobarSesion() {
      try {
        const usuario = await obtenerUsuarioActual();

        if (usuario && usuario.rol === 'pasajero') {
          setDestino('/(tabs)');
        } else {
          setDestino('/(auth)/login');
        }
      } catch {
        setDestino('/(auth)/login');
      }
    }

    comprobarSesion();
  }, []);

  if (destino) {
    return <Redirect href={destino} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0877D1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
