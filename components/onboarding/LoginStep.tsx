import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { hasValidSupabaseConfig } from '@/lib/supabase';
import { router } from 'expo-router';
import ForgotPasswordModal from './ForgotPasswordModal';

interface LoginStepProps {
  onSwitchToSignup: () => void;
}

export default function LoginStep({ onSwitchToSignup }: LoginStepProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  
  const { signIn, signInWithGoogle } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const canProceed = (): boolean => {
    return validateEmail(email) && password.length >= 6;
  };

  const handleLogin = async () => {
    if (!canProceed()) {
      Alert.alert('Dados incompletos', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    setIsLoading(true);
    
    const result = await signIn(email, password);
    
    if (result.success) {
      // Navigate to main app
      router.replace('/(tabs)');
    } else {
      Alert.alert('Erro no login', result.error || 'Credenciais inválidas');
    }
    
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      if (result.user?.isOnboardingComplete) {
        router.replace('/(tabs)');
      } else {
        // Continue with onboarding for Google users
      }
    } else {
      Alert.alert('Erro no login', result.error || 'Falha ao fazer login com Google');
    }
    
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Bem-vindo de volta!</Text>
        <Text style={styles.subtitle}>
          Entre na sua conta do Dorama Hub
        </Text>
        
        {!hasValidSupabaseConfig && (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              🚧 Modo de desenvolvimento: Use demo@example.com / password123
            </Text>
          </View>
        )}

        {/* Email Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {email && !validateEmail(email) && (
            <Text style={styles.errorText}>Digite um e-mail válido</Text>
          )}
        </View>

        {/* Password Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Lock size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.inputIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color={COLORS.textSecondary} />
              ) : (
                <Eye size={20} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, !canProceed() && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={[styles.loginButtonText, !canProceed() && styles.loginButtonTextDisabled]}>
              Entrar
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => setShowForgotPassword(true)}
        >
          <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
        </TouchableOpacity>

        {/* Google Login Button - Temporarily disabled */}
        {false && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <View style={styles.googleIconContainer}>
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
              </View>
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.signupPrompt}>
          <Text style={styles.signupPromptText}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={onSwitchToSignup}>
            <Text style={styles.signupLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ForgotPasswordModal 
        visible={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  googleButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputIcon: {
    marginRight: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  loginButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  loginButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  loginButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupPromptText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  devNotice: {
    backgroundColor: COLORS.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  devNoticeText: {
    color: COLORS.warning,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
});