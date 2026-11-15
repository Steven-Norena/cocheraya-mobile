import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../hooks/useForm';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Lock } from 'lucide-react-native';
import { cocheraFonts, useCocheraTheme } from '../../constants/cocheraya';

export default function LoginScreen() {
  const { login } = useAuth();
  const colors = useCocheraTheme();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm(
    { email: '', password: '' },
    async (formValues) => {
      setErrorMsg(null);
      try {
        const user = await login({
          email: formValues.email,
          password: formValues.password,
        });
        if (user.role === 'HOST') {
          router.replace('/(host)/dashboard');
        } else {
          router.replace('/(driver)/map');
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Credenciales inválidas o error de red.');
      }
    }
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.ink, fontFamily: cocheraFonts.bold }]}>CocheraYa</Text>
        <Text style={[styles.subtitle, { color: colors.secondary, fontFamily: cocheraFonts.regular }]}>Inicia sesión para continuar</Text>
      </View>

      <View style={styles.form}>
        {errorMsg && <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>}

        <Input
          label="Correo Electrónico"
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={values.email}
          onChangeText={(text) => handleChange('email', text)}
          error={errors.email}
          icon={<Mail size={20} color={colors.secondary} />}
          inputStyle={{ backgroundColor: colors.surface, borderColor: errors.email ? colors.danger : colors.outline }}
          labelStyle={{ color: colors.ink }}
          style={{ flex: 1, height: '100%', color: colors.ink, fontSize: 16, fontFamily: cocheraFonts.regular }}
          placeholderTextColor={colors.secondary}
        />

        <Input
          label="Contraseña"
          placeholder="••••••••"
          secureTextEntry
          value={values.password}
          onChangeText={(text) => handleChange('password', text)}
          error={errors.password}
          icon={<Lock size={20} color={colors.secondary} />}
          inputStyle={{ backgroundColor: colors.surface, borderColor: errors.password ? colors.danger : colors.outline }}
          labelStyle={{ color: colors.ink }}
          style={{ flex: 1, height: '100%', color: colors.ink, fontSize: 16, fontFamily: cocheraFonts.regular }}
          placeholderTextColor={colors.secondary}
        />

        <Button
          title="Iniciar Sesión"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={[styles.submitBtn, { backgroundColor: colors.accent }]}
          textStyle={{ color: colors.onAccent, fontFamily: cocheraFonts.bold }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.secondary }]}>¿No tienes una cuenta? </Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={[styles.linkText, { color: colors.accent, fontFamily: cocheraFonts.bold }]}>Regístrate aquí</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
  },
  form: {
    gap: 16,
    maxWidth: 420,
    width: '100%',
  },
  submitBtn: {
    marginTop: 10,
    minHeight: 48,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 30,
  },
  footerText: {
    color: '#94a3b8',
  },
  linkText: {
    color: '#a855f7',
    fontWeight: '700',
  },
});
