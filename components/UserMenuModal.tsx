import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MoreVertical, UserX, Flag, X } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface UserMenuModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  isBlocked?: boolean;
}

export function UserMenuModal({ visible, onClose, userId, username, isBlocked = false }: UserMenuModalProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const blockMutation = trpc.users.blockUser.useMutation();
  const unblockMutation = trpc.users.unblockUser.useMutation();

  const handleBlockUser = async () => {
    try {
      setLoading(true);
      
      if (isBlocked) {
        await unblockMutation.mutateAsync({ userId });
        Alert.alert('Sucesso', `Você desbloqueou @${username}`);
      } else {
        Alert.alert(
          'Bloquear usuário',
          `Tem certeza que deseja bloquear @${username}? Você não verá mais o conteúdo desta pessoa.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Bloquear',
              style: 'destructive',
              onPress: async () => {
                await blockMutation.mutateAsync({ userId });
                Alert.alert('Sucesso', `Você bloqueou @${username}`);
              },
            },
          ]
        );
      }
      
      onClose();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      Alert.alert('Erro', 'Não foi possível realizar esta ação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportUser = () => {
    Alert.alert(
      'Denunciar usuário',
      `Deseja denunciar @${username}? Nossa equipe irá revisar o perfil.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denunciar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Denúncia enviada', 'Obrigado por nos ajudar a manter a comunidade segura.');
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Opções</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={handleBlockUser}
              disabled={loading}
            >
              <UserX size={20} color={isBlocked ? "#10B981" : "#EF4444"} />
              <Text style={[styles.optionText, { color: isBlocked ? "#10B981" : "#EF4444" }]}>
                {isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
              </Text>
              {loading && <ActivityIndicator size="small" color="#666" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={handleReportUser}
              disabled={loading}
            >
              <Flag size={20} color="#F59E0B" />
              <Text style={[styles.optionText, { color: "#F59E0B" }]}>
                Denunciar usuário
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface UserMenuButtonProps {
  userId: string;
  username: string;
  isBlocked?: boolean;
}

export function UserMenuButton({ userId, username, isBlocked = false }: UserMenuButtonProps) {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setModalVisible(true)}
        testID="user-menu-button"
      >
        <MoreVertical size={24} color="#666" />
      </TouchableOpacity>

      <UserMenuModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={userId}
        username={username}
        isBlocked={isBlocked}
      />
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  options: {
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});