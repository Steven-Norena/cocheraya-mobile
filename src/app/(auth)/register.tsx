import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../hooks/useForm';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { User, Mail, Lock, Phone } from 'lucide-react-native';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm(
    {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'DRIVER' as 'DRIVER' | 'HOST',
    },
    async (formValues) => {
      setErrorMsg(null);
      try {
        const user = await register({
          name: formValues.name,
          email: formValues.email,
          password: formValues.password,
          phone: formValues.phone || undefined,
          role: formValues.role,
        });
        if (user.role === 'HOST') {
          router.replace('/(host)/dashboard');
        } else {
          router.replace('/(driver)/map');
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Error al registrarse. Verifica tus datos.');
      }
    }
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>Regístrate en ParkShare para empezar</Text>
      </View>

      <View style={styles.form}>
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Input
          label="Nombre Completo"
          placeholder="Nombre Apellido"
          value={values.name}
          onChangeText={(text) => handleChange('name', text)}
          error={errors.name}
          icon={<User size={20} color="#64748b" />}
        />

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

        <Input
          label="Teléfono (Opcional)"
          placeholder="987654321"
          keyboardType="phone-pad"
          value={values.phone}
          onChangeText={(text) => handleChange('phone', text)}
          error={errors.phone}
          icon={<Phone size={20} color="#64748b" />}
        />

        {/* Role Selector */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Quiero usar la app como:</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                values.role === 'DRIVER' ? styles.roleBtnActive : null,
              ]}
              onPress={() => handleChange('role', 'DRIVER')}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  values.role === 'DRIVER' ? styles.roleBtnTextActive : null,
                ]}
              >
                Conductor (Driver)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                values.role === 'HOST' ? styles.roleBtnActive : null,
              ]}
              onPress={() => handleChange('role', 'HOST')}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  values.role === 'HOST' ? styles.roleBtnTextActive : null,
                ]}
              >
                Anfitrión (Host)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title="Crear Cuenta"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitBtn}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkText}>Inicia Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b0c10',
    padding: 24,
    paddingVertical: 50,
    minHeight: '100%',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  roleContainer: {
    gap: 8,
    marginTop: 8,
  },
  roleLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
  },
  roleBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  roleBtnTextActive: {
    color: '#a855f7',
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
    marginBottom: 10,
  },
  footerText: {
    color: '#94a3b8',
  },
  linkText: {
    color: '#a855f7',
    fontWeight: '700',
  },
});
