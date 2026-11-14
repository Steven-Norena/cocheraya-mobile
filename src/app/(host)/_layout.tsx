import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, ParkingSquare, Landmark, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity, StyleSheet } from 'react-native';

export default function HostLayout() {
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
        tabBarActiveTintColor: '#10b981', // Emerald accent for Host
        tabBarInactiveTintColor: '#64748b',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Panel del Anfitrión',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="spaces"
        options={{
          title: 'Mis Cocheras',
          tabBarLabel: 'Cocheras',
          tabBarIcon: ({ color, size }) => <ParkingSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Mis Ganancias',
          tabBarLabel: 'Ganancias',
          tabBarIcon: ({ color, size }) => <Landmark size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Publicar Cochera',
          href: null, // Hide this from the Tab bar
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Escanear QR',
          href: null, // Hide this from the Tab bar
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
