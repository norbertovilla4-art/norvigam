
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0877D1',
        tabBarInactiveTintColor: '#8994A5',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />

      <Tabs.Screen
        name="solicitar"
        options={{
          title: 'Solicitar viaje',
        }}
      />
    </Tabs>
  );
}
