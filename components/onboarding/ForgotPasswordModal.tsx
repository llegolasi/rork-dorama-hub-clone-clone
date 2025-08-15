import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { X, Mail, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ visible, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  
  const { resetPassword } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      Alert.alert('E-mail inválido', 'Por favor, digite um e-mail válido.');
      return;
    }

    setIsLoading(true);
    
    const result = await resetPassword(email);
    
    if (result.success) {
      setEmailSent(true);
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível enviar o e-mail de recuperação.');
    }
    
    setIsLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    onClose();
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recuperar Senha</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {!emailSent ? (
            <>
              <View style={styles.iconContainer}>
                <Mail size={48} color={COLORS.accent} />
              </View>
              
              <Text style={styles.title}>Esqueceu sua senha?</Text>
              <Text style={styles.subtitle}>
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Digite seu e-mail"
                    placeholderTextColor={COLORS.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {email && !validateEmail(email) && (
                  <Text style={styles.errorText}>Digite um e-mail válido</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.resetButton, (!validateEmail(email) || isLoading) && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={!validateEmail(email) || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Text style={[styles.resetButtonText, (!validateEmail(email) || isLoading) && styles.resetButtonTextDisabled]}>
                    Enviar Link de Recuperação
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Mail size={48} color={COLORS.success} />
              </View>
              
              <Text style={styles.title}>E-mail Enviado!</Text>
              <Text style={styles.subtitle}>
                Enviamos um link de recuperação para {email}. Verifique sua caixa de entrada e spam.
              </Text>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleClose}
              >
                <Text style={styles.resetButtonText}>Voltar ao Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={handleTryAgain}
              >
                <ArrowLeft size={16} color={COLORS.accent} style={styles.tryAgainIcon} />
                <Text style={styles.tryAgainText}>Tentar com outro e-mail</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
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
  resetButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resetButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  resetButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tryAgainIcon: {
    marginRight: 8,
  },
  tryAgainText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});