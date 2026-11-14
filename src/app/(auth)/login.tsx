import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../hooks/useForm';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const { login } = useAuth();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🅿️ ParkShare</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
      </View>

      <View style={styles.form}>
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Input
          label="Correo Electrónico"
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={values.email}
          onChangeText={(text) => handleChange('email', text)}
          error={errors.email}
          icon={<Mail size={20} color="#64748b" />}
        />

        <Input
          label="Contraseña"
          placeholder="••••••••"
          secureTextEntry
          value={values.password}
          onChangeText={(text) => handleChange('password', text)}
          error={errors.password}
          icon={<Lock size={20} color="#64748b" />}
        />

        <Button
          title="Iniciar Sesión"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitBtn}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.linkText}>Regístrate aquí</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
    padding: 24,
    justifyContent: 'center',
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
  },
  submitBtn: {
    marginTop: 10,
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
