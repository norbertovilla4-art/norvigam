import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  obtenerMisVehiculos,
  registrarVehiculo,
  Vehiculo,
} from '../../services/vehiculos.service';

const TIPOS = ['Moto', 'Carro', 'Taxi'] as const;

export default function VehiculoScreen() {
  const [tipo, setTipo] = useState<'Moto' | 'Carro' | 'Taxi'>('Moto');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [color, setColor] = useState('');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarVehiculos = useCallback(async () => {
    try {
      const datos = await obtenerMisVehiculos();
      setVehiculos(datos);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudieron cargar los vehículos.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVehiculos();
  }, [cargarVehiculos]);

  async function guardarVehiculo() {
    if (!marca.trim() || !modelo.trim() || !placa.trim()) {
      Alert.alert('Datos incompletos', 'Escribe la marca, modelo y placa.');
      return;
    }

    try {
      setGuardando(true);

      await registrarVehiculo({
        tipo_vehiculo: tipo,
        marca: marca.trim(),
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase(),
        color: color.trim() || null,
      });

      Alert.alert('Registro exitoso', 'El vehículo fue registrado correctamente.');
      setMarca('');
      setModelo('');
      setPlaca('');
      setColor('');
      await cargarVehiculos();
    } catch (error: any) {
      Alert.alert(
        'No se pudo registrar',
        error.response?.data?.message || 'Verifica los datos e inténtalo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Mi vehículo</Text>
      <Text style={styles.subtitulo}>
        Registra el vehículo con el que prestarás el servicio en Tura Móvil.
      </Text>

      <View style={styles.tarjeta}>
        <Text style={styles.seccion}>Tipo de vehículo</Text>
        <View style={styles.fila}>
          {TIPOS.map((opcion) => (
            <TouchableOpacity
              key={opcion}
              style={[styles.tipo, tipo === opcion && styles.tipoActivo]}
              onPress={() => setTipo(opcion)}
            >
              <Text style={[styles.tipoTexto, tipo === opcion && styles.textoActivo]}>
                {opcion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.etiqueta}>Marca *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Bajaj"
          value={marca}
          onChangeText={setMarca}
          autoCapitalize="words"
        />

        <Text style={styles.etiqueta}>Modelo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Discover 100"
          value={modelo}
          onChangeText={setModelo}
          autoCapitalize="words"
        />

        <Text style={styles.etiqueta}>Placa *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. KCA79E"
          value={placa}
          onChangeText={setPlaca}
          autoCapitalize="characters"
          maxLength={10}
        />

        <Text style={styles.etiqueta}>Color</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Negro"
          value={color}
          onChangeText={setColor}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.boton, guardando && styles.botonDesactivado]}
          onPress={guardarVehiculo}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>REGISTRAR VEHÍCULO</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.lista}>
        <Text style={styles.seccion}>Mis vehículos registrados</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#1769AA" />
        ) : vehiculos.length === 0 ? (
          <Text style={styles.vacio}>Todavía no tienes vehículos registrados.</Text>
        ) : (
          vehiculos.map((vehiculo) => (
            <View key={vehiculo.id} style={styles.vehiculo}>
              <Text style={styles.nombreVehiculo}>
                {vehiculo.marca} {vehiculo.modelo}
              </Text>
              <Text style={styles.detalle}>Tipo: {vehiculo.tipo_vehiculo}</Text>
              <Text style={styles.detalle}>Placa: {vehiculo.placa}</Text>
              {vehiculo.color ? (
                <Text style={styles.detalle}>Color: {vehiculo.color}</Text>
              ) : null}
              <Text style={styles.estado}>
                Estado: {vehiculo.estado === 'activo' ? 'Activo' : vehiculo.estado}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F2F5F9' },
  contenido: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 27, fontWeight: 'bold', color: '#172B4D' },
  subtitulo: { fontSize: 14, color: '#667085', marginTop: 6, marginBottom: 20 },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 22,
  },
  seccion: { fontSize: 18, fontWeight: 'bold', color: '#172B4D', marginBottom: 15 },
  fila: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  tipo: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 9,
    alignItems: 'center',
  },
  tipoActivo: { backgroundColor: '#1769AA', borderColor: '#1769AA' },
  tipoTexto: { color: '#344054', fontWeight: '600' },
  textoActivo: { color: '#FFFFFF' },
  etiqueta: { fontSize: 14, fontWeight: '600', color: '#344054', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
    color: '#172B4D',
    backgroundColor: '#FFFFFF',
  },
  boton: {
    backgroundColor: '#1769AA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  botonDesactivado: { opacity: 0.6 },
  botonTexto: { color: '#FFFFFF', fontWeight: 'bold' },
  lista: { marginBottom: 20 },
  vacio: { color: '#667085', padding: 12 },
  vehiculo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  nombreVehiculo: { fontSize: 17, fontWeight: 'bold', color: '#172B4D' },
  detalle: { fontSize: 14, color: '#667085', marginTop: 5 },
  estado: { fontSize: 14, color: '#16803C', fontWeight: 'bold', marginTop: 8 },
});
