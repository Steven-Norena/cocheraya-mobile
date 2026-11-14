import React from 'react';
import { Tabs } from 'expo-router';
import { Map, Calendar, Wallet, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity, StyleSheet } from 'react-native';

export default function DriverLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0b0c10',
          borderBottomWidth: 1,
          borderBottomColor: '#1f2937',
        },
        headerTitleStyle: {
          color: '#f8fafc',
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: '#0b0c10',
          borderTopWidth: 1,
          borderTopColor: '#1f2937',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#64748b',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Buscar Cochera',
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Mis Reservas',
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Mi Billetera',
          tabBarLabel: 'Billetera',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    marginRight: 16,
    padding: 8,
  },
});
