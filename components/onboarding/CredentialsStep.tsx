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
import { Eye, EyeOff, Mail, User, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';


interface CredentialsStepProps {
  onComplete: () => void;
  onSwitchToLogin: () => void;
}

export default function CredentialsStep({ onComplete, onSwitchToLogin }: CredentialsStepProps) {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  
  const { updateOnboardingData, checkUsernameAvailability, signUp, signInWithGoogle } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const passwordsMatch = (): boolean => {
    return password === confirmPassword && password.length > 0;
  };

  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    
    try {
      const available = await checkUsernameAvailability(username);
      setUsernameAvailable(available);
    } catch (error) {
      console.error('Username check error:', error);
      setUsernameAvailable(false);
    }
    
    setIsCheckingUsername(false);
  };

  const handleUsernameChange = (text: string) => {
    // Remove spaces and convert to lowercase like Instagram/TikTok
    const cleanText = text.replace(/\s/g, '').toLowerCase();
    setUsername(cleanText);
    setUsernameAvailable(null);
    
    // Debounce username check
    const timeoutId = setTimeout(() => {
      checkUsername(cleanText);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleEmailChange = (text: string) => {
    // Remove spaces from email
    const cleanText = text.replace(/\s/g, '');
    setEmail(cleanText);
  };

  const canProceed = (): boolean => {
    return (
      username.length >= 3 &&
      usernameAvailable === true &&
      validateEmail(email) &&
      validatePassword(password) &&
      passwordsMatch()
    );
  };

  const handleContinue = async () => {
    if (!canProceed()) {
      Alert.alert('Dados incompletos', 'Por favor, preencha todos os campos corretamente.');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signUp({
        username,
        email,
        password,
        authProvider: 'email'
      });
      
      if (result.success) {
        // Store credentials in onboarding data for later steps
        updateOnboardingData({
          username,
          email,
          password,
          authProvider: 'email'
        });
        onComplete();
      } else {
        Alert.alert('Erro ao criar conta', result.error || 'Tente novamente.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      // Google signup successful, continue to onboarding
      onComplete();
    } else {
      Alert.alert('Erro no cadastro', result.error || 'Falha ao criar conta com Google');
    }
    
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>
          Vamos começar criando sua conta no Dorama Hub
        </Text>
        




        {/* Username Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome de usuário"
              placeholderTextColor={COLORS.textSecondary}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isCheckingUsername && (
              <ActivityIndicator size="small" color={COLORS.accent} style={styles.inputIcon} />
            )}
            {usernameAvailable === true && (
              <View style={[styles.statusIndicator, styles.available]}>
                <Text style={styles.statusText}>✓</Text>
              </View>
            )}
            {usernameAvailable === false && (
              <View style={[styles.statusIndicator, styles.unavailable]}>
                <Text style={styles.statusText}>✗</Text>
              </View>
            )}
          </View>
          {usernameAvailable === false && (
            <Text style={styles.errorText}>Este nome de usuário não está disponível</Text>
          )}
        </View>

        {/* Email Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={handleEmailChange}
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
          {password && !validatePassword(password) && (
            <Text style={styles.errorText}>
              A senha deve ter pelo menos 6 caracteres
            </Text>
          )}
        </View>

        {/* Confirm Password Field */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Lock size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.inputIcon}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={COLORS.textSecondary} />
              ) : (
                <Eye size={20} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
          {confirmPassword && !passwordsMatch() && (
            <Text style={styles.errorText}>
              As senhas não coincidem
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={[styles.continueButtonText, !canProceed() && styles.continueButtonTextDisabled]}>
              Continuar
            </Text>
          )}
        </TouchableOpacity>

        {/* Google Signup Button - Temporarily disabled */}
        {false && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleSignup}
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

        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.loginLink}>Fazer login</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 16,
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
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  available: {
    backgroundColor: COLORS.success,
  },
  unavailable: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  continueButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  loginPromptText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
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