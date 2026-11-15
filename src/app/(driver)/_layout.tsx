import React from 'react';
import { Tabs } from 'expo-router';
import { Map, Calendar, Wallet, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cocheraFonts, useCocheraTheme } from '../../constants/cocheraya';

export default function DriverLayout() {
  const { logout } = useAuth();
  const colors = useCocheraTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.outline,
        },
        headerTitleStyle: {
          color: colors.ink,
          fontFamily: cocheraFonts.bold,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outline,
          height: 64 + bottom,
          paddingBottom: bottom + 5,
          paddingTop: 5,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: { fontFamily: cocheraFonts.bold, fontSize: 12, lineHeight: 16 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        headerRight: () => (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={logout} style={styles.logoutBtn}>
            <LogOut size={20} color={colors.danger} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'CocheraYa',
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ color }) => <Map size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'CocheraYa',
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Mi Billetera',
          tabBarLabel: 'Billetera',
          tabBarIcon: ({ color }) => <Wallet size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    marginRight: 8,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
