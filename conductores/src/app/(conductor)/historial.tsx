 
import { useCallback, useState } from 'react';
 import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
 
import { useFocusEffect } from 'expo-router';

import {
  obtenerHistorialGanancias,
  ResumenGanancias,
  ResumenPeriodo,
  ViajeCompletado,
} from '../../services/viajes.service';
import MapView, { Marker, Polyline } from 'react-native-maps';

type PeriodoSeleccionado = 'hoy' | 'semana' | 'mes';

export default function HistorialScreen() {
  const [resumen, setResumen] = useState<ResumenGanancias | null>(null);
  const [periodos, setPeriodos] = useState<ResumenPeriodo | null>(null);
  const [viajes, setViajes] = useState<ViajeCompletado[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoSeleccionado>('hoy');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [viajeExpandido, setViajeExpandido] = useState<string | null>(null);

  const cargarHistorial = useCallback(async (refrescar = false) => {
    try {
      if (refrescar) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const datos = await obtenerHistorialGanancias();

      setResumen(datos.resumen);
      setPeriodos(datos.periodos);
      setViajes(datos.viajes || []);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'No se pudo consultar el historial de viajes.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [cargarHistorial])
  );

  function pesos(valor: number | string | undefined) {
    return Number(valor || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });
  }

  function fecha(valor: string) {
    return new Date(valor).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  const datosPeriodo = {
    hoy: {
      titulo: 'GANANCIAS DE HOY',
      viajes: periodos?.viajes_hoy,
      ingresos: periodos?.ingresos_hoy,
      comision: periodos?.comision_hoy,
      ganancias: periodos?.ganancias_hoy,
    },
    semana: {
      titulo: 'GANANCIAS DE ESTA SEMANA',
      viajes: periodos?.viajes_semana,
      ingresos: periodos?.ingresos_semana,
      comision: periodos?.comision_semana,
      ganancias: periodos?.ganancias_semana,
    },
    mes: {
      titulo: 'GANANCIAS DE ESTE MES',
      viajes: periodos?.viajes_mes,
      ingresos: periodos?.ingresos_mes,
      comision: periodos?.comision_mes,
      ganancias: periodos?.ganancias_mes,
    },
  }[periodo];

   function renderViaje({ item }: { item: ViajeCompletado }) {
  const tarifa = Number(item.tarifa || 0);
  const comision = Math.round(tarifa * 0.15);
  const ganancia = tarifa - comision;
  const expandido = viajeExpandido === item.id;
const origen = `${Number(item.origen_latitud)},${Number(item.origen_longitud)}`;

const destino = `${Number(item.destino_latitud)},${Number(item.destino_longitud)}`;

const abrirMapa = (url: string) => {
  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'No se pudo abrir Google Maps.');
  });
};
  return (
    <View style={styles.viajeCard}>
      <View style={styles.fila}>
        <Text style={styles.tipoVehiculo}>
          {item.tipo_vehiculo}
        </Text>
        <Text style={styles.estado}>COMPLETADO</Text>
      </View>

      <Text style={styles.fecha}>
        {fecha(item.fecha_actualizacion || item.fecha_creacion)}
      </Text>

      <View style={styles.detalle}>
        <Text style={styles.etiqueta}>Distancia</Text>
        <Text style={styles.valor}>
          {Number(item.distancia_km || 0).toFixed(2)} km
        </Text>
      </View>

      <View style={styles.detalle}>
        <Text style={styles.etiqueta}>Ingreso bruto</Text>
        <Text style={styles.valor}>{pesos(tarifa)}</Text>
      </View>

      <View style={styles.detalle}>
        <Text style={styles.etiqueta}>Comisión (15%)</Text>
        <Text style={styles.comision}>{pesos(comision)}</Text>
      </View>

      <View style={styles.separador} />

      <View style={styles.detalle}>
        <Text style={styles.etiquetaNeta}>Tu ganancia</Text>
        <Text style={styles.ganancia}>{pesos(ganancia)}</Text>
      </View>

      <TouchableOpacity
        style={styles.botonDetalle}
        onPress={() =>
          setViajeExpandido(expandido ? null : item.id)
        }
      >
        <Text style={styles.textoBotonDetalle}>
          {expandido ? 'OCULTAR DETALLE ▲' : 'VER DETALLE ▼'}
        </Text>
      </TouchableOpacity>

      {expandido && (
        <View style={styles.detalleExpandido}>
          <Text style={styles.tituloDetalle}>DETALLE DEL SERVICIO</Text>
<MapView
  style={styles.mapa}
  initialRegion={{
    latitude: Number(item.origen_latitud),
    longitude: Number(item.origen_longitud),
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  }}
  scrollEnabled
  zoomEnabled
>
  <Marker
    coordinate={{
      latitude: Number(item.origen_latitud),
      longitude: Number(item.origen_longitud),
    }}
    title="Origen"
    description={item.direccion_origen}
    pinColor="green"
  />

  <Marker
    coordinate={{
      latitude: Number(item.destino_latitud),
      longitude: Number(item.destino_longitud),
    }}
    title="Destino"
    description={item.direccion_destino}
    pinColor="red"
  />

  <Polyline
    coordinates={[
      {
        latitude: Number(item.origen_latitud),
        longitude: Number(item.origen_longitud),
      },
      {
        latitude: Number(item.destino_latitud),
        longitude: Number(item.destino_longitud),
      },
    ]}
    strokeColor="#0877D1"
    strokeWidth={4}
  />
</MapView>
<View style={styles.botonesMapa}>
  <TouchableOpacity
    style={styles.botonNavegacion}
    onPress={() =>
      abrirMapa(`https://www.google.com/maps/search/?api=1&query=${origen}`)
    }
  >
    <Text style={styles.textoNavegacion}>📍 IR AL ORIGEN</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.botonNavegacion}
    onPress={() =>
      abrirMapa(`https://www.google.com/maps/search/?api=1&query=${destino}`)
    }
  >
    <Text style={styles.textoNavegacion}>🏁 IR AL DESTINO</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.botonNavegacion, styles.botonRuta]}
    onPress={() =>
      abrirMapa(
        `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${destino}&travelmode=driving`
      )
    }
  >
     <Text style={[styles.textoNavegacion, styles.textoRuta]}>
  🗺️ VER RUTA COMPLETA
</Text>
  </TouchableOpacity>
</View>
          <Text style={styles.subtituloDireccion}>📍 ORIGEN</Text>
          <Text style={styles.direccion}>
            {item.direccion_origen || 'Dirección no disponible'}
          </Text>

          <Text style={styles.subtituloDireccion}>🏁 DESTINO</Text>
          <Text style={styles.direccion}>
            {item.direccion_destino || 'Dirección no disponible'}
          </Text>

          <View style={styles.detalle}>
            <Text style={styles.etiqueta}>Duración</Text>
            <Text style={styles.valor}>
              {item.duracion_minutos ?? 0} minutos
            </Text>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.etiqueta}>Tarifa cobrada</Text>
            <Text style={styles.valor}>{pesos(tarifa)}</Text>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.etiqueta}>Comisión Tura Móvil (15%)</Text>
            <Text style={styles.comision}>{pesos(comision)}</Text>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.etiquetaNeta}>Ganancia del conductor</Text>
            <Text style={styles.ganancia}>{pesos(ganancia)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0877D1" />
        <Text style={styles.cargando}>Consultando tus ganancias...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contenido}
      data={viajes}
      keyExtractor={(item) => item.id}
      renderItem={renderViaje}
      refreshControl={
        <RefreshControl
          refreshing={actualizando}
          onRefresh={() => cargarHistorial(true)}
        />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.logo}>TURA MÓVIL</Text>
            <Text style={styles.subtitulo}>Historial y ganancias</Text>
          </View>

          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitulo}>CONSULTAR PERÍODO</Text>

            <View style={styles.selectorFila}>
              {([
                { id: 'hoy', texto: 'HOY' },
                { id: 'semana', texto: 'SEMANA' },
                { id: 'mes', texto: 'MES' },
              ] as const).map((opcion) => (
                <TouchableOpacity
                  key={opcion.id}
                  style={[
                    styles.botonPeriodo,
                    periodo === opcion.id && styles.botonPeriodoActivo,
                  ]}
                  onPress={() => setPeriodo(opcion.id)}
                >
                  <Text
                    style={[
                      styles.textoPeriodo,
                      periodo === opcion.id && styles.textoPeriodoActivo,
                    ]}
                  >
                    {opcion.texto}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.resumenCard}>
            <Text style={styles.resumenTitulo}>
              {datosPeriodo.titulo}
            </Text>

            <Text style={styles.total}>
              {pesos(datosPeriodo.ganancias)}
            </Text>

            <Text style={styles.descripcion}>
              Ganancias netas del período seleccionado
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.indicador}>
              <Text style={styles.indicadorTitulo}>Viajes realizados</Text>
              <Text style={styles.indicadorValor}>
                {datosPeriodo.viajes ?? 0}
              </Text>
            </View>

            <View style={styles.indicador}>
              <Text style={styles.indicadorTitulo}>Ingresos brutos</Text>
              <Text style={styles.indicadorValorPequeno}>
                {pesos(datosPeriodo.ingresos)}
              </Text>
            </View>

            <View style={styles.indicador}>
              <Text style={styles.indicadorTitulo}>Comisión (15%)</Text>
              <Text style={styles.indicadorValorPequeno}>
                {pesos(datosPeriodo.comision)}
              </Text>
            </View>
          </View>

          <View style={styles.acumuladoCard}>
            <Text style={styles.acumuladoTitulo}>
              ACUMULADO HISTÓRICO
            </Text>
            <View style={styles.detalle}>
              <Text style={styles.etiqueta}>Total de viajes</Text>
              <Text style={styles.valor}>
                {resumen?.total_viajes || 0}
              </Text>
            </View>
            <View style={styles.detalle}>
              <Text style={styles.etiqueta}>Ingresos brutos</Text>
              <Text style={styles.valor}>
                {pesos(resumen?.ingresos_brutos)}
              </Text>
            </View>
            <View style={styles.detalle}>
              <Text style={styles.etiqueta}>Comisión acumulada</Text>
              <Text style={styles.comision}>
                {pesos(resumen?.comision)}
              </Text>
            </View>
            <View style={styles.detalle}>
              <Text style={styles.etiquetaNeta}>Ganancias netas</Text>
              <Text style={styles.ganancia}>
                {pesos(resumen?.ganancias_netas)}
              </Text>
            </View>
          </View>

          <Text style={styles.tituloHistorial}>
            Mis viajes completados
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.vacio}>
          <Text style={styles.iconoVacio}>🚕</Text>
          <Text style={styles.textoVacio}>
            Todavía no tienes viajes completados.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  contenido: {
    paddingBottom: 30,
  },
    botonesMapa: {
    gap: 10,
    marginBottom: 15,
  },

  botonNavegacion: {
    backgroundColor: '#E8F3FC',
    paddingVertical: 13,
    borderRadius: 9,
    alignItems: 'center',
  },

  botonRuta: {
    backgroundColor: '#0877D1',
  },

  textoNavegacion: {
    color: '#0877D1',
    fontSize: 13,
    fontWeight: 'bold',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F5F9',
  },
  cargando: {
    marginTop: 12,
    color: '#687386',
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
  selectorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 14,
  },
  selectorTitulo: {
    color: '#172B4D',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selectorFila: {
    flexDirection: 'row',
    gap: 8,
  },
  botonPeriodo: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#F2F5F9',
    alignItems: 'center',
  },
  botonPeriodoActivo: {
    backgroundColor: '#0877D1',
  },
  textoPeriodo: {
    color: '#687386',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textoPeriodoActivo: {
    color: '#FFFFFF',
  },
  resumenCard: {
    backgroundColor: '#0877D1',
    margin: 15,
    padding: 22,
    borderRadius: 15,
  },
  resumenTitulo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  total: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  descripcion: {
    color: '#E4F1FF',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 10,
  },
  indicador: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    margin: 5,
    flexGrow: 1,
    flexBasis: '40%',
  },
  indicadorTitulo: {
    color: '#687386',
    fontSize: 12,
  },
  indicadorValor: {
    color: '#172B4D',
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 8,
  },
  indicadorValorPequeno: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  acumuladoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 18,
    borderRadius: 14,
  },
  acumuladoTitulo: {
    color: '#172B4D',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tituloHistorial: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#172B4D',
    margin: 18,
  },
  viajeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 17,
    borderRadius: 14,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipoVehiculo: {
    color: '#172B4D',
    fontSize: 17,
    fontWeight: 'bold',
  },
  estado: {
    color: '#16A05D',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fecha: {
    color: '#687386',
    fontSize: 12,
    marginVertical: 10,
  },
  detalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  etiqueta: {
    color: '#687386',
    fontSize: 13,
  },
  valor: {
    color: '#172B4D',
    fontWeight: '600',
  },
  comision: {
    color: '#D64545',
    fontWeight: '600',
  },
  separador: {
    height: 1,
    backgroundColor: '#E4E8EF',
    marginVertical: 10,
  },
  etiquetaNeta: {
    color: '#172B4D',
    fontWeight: 'bold',
  },
  ganancia: {
    color: '#16A05D',
    fontSize: 18,
    fontWeight: 'bold',
  },
    botonDetalle: {
    backgroundColor: '#E8F3FC',
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 15,
  },

  textoBotonDetalle: {
    color: '#0877D1',
    fontSize: 12,
    fontWeight: 'bold',
  },

  detalleExpandido: {
    backgroundColor: '#F5F8FC',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },

  tituloDetalle: {
    color: '#172B4D',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  subtituloDireccion: {
    color: '#0877D1',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 5,
  },

  direccion: {
    color: '#344563',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  mapa: {
  width: '100%',
  height: 230,
  borderRadius: 12,
  marginBottom: 15,
},
  vacio: {
    alignItems: 'center',
    padding: 30,
  },
  iconoVacio: {
    fontSize: 40,
  },
  textoVacio: {
    color: '#687386',
    textAlign: 'center',
    marginTop: 12,
  },
  textoRuta: {
  color: '#FFFFFF',
},
});
