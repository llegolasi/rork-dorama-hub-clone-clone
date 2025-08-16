import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Download, Share2 } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

import { COLORS } from '@/constants/colors';
import { DramaDetails } from '@/types/drama';
import { getDramaDetails, calculateDramaTotalRuntime } from '@/services/api';

interface CompletionShareModalProps {
  visible: boolean;
  onClose: () => void;
  dramaId: number;
  userName: string;
}

interface CompletionData {
  drama: DramaDetails;
  totalRuntimeMinutes: number;
  hours: number;
  minutes: number;
}

export default function CompletionShareModal({
  visible,
  onClose,
  dramaId,
  userName,
}: CompletionShareModalProps) {
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const certificateRef = React.useRef<View>(null);

  const loadCompletionData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Loading completion data for drama:', dramaId);
      
      const [drama, totalRuntimeMinutes] = await Promise.all([
        getDramaDetails(dramaId),
        calculateDramaTotalRuntime(dramaId),
      ]);

      const hours = Math.floor(totalRuntimeMinutes / 60);
      const minutes = totalRuntimeMinutes % 60;

      setCompletionData({
        drama,
        totalRuntimeMinutes,
        hours,
        minutes,
      });

      console.log('Completion data loaded:', {
        dramaName: drama.name,
        totalRuntimeMinutes,
        hours,
        minutes,
      });
    } catch (error) {
      console.error('Error loading completion data:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar os dados do dorama. Tente novamente.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [dramaId, onClose]);

  useEffect(() => {
    if (visible && dramaId) {
      loadCompletionData();
    }
  }, [visible, dramaId, loadCompletionData]);



  const formatTime = (hours: number, minutes: number): string => {
    if (hours === 0) {
      return `${minutes} minutos`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} minutos`;
    }
  };

  const handleShare = async () => {
    if (!completionData) return;

    try {
      const shareText = `🎬 Acabei de concluir "${completionData.drama.name}"!\n\n⏱️ Tempo total de maratona: ${formatTime(completionData.hours, completionData.minutes)}\n\n#DoramaHub #KDrama`;
      
      await Share.share({
        message: shareText,
        title: 'Dorama Concluído!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar. Tente novamente.');
    }
  };

  const handleDownload = async () => {
    if (!completionData || !certificateRef.current) {
      console.log('Missing completion data or certificate ref');
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de permissão para salvar a imagem na sua galeria.'
        );
        setIsGeneratingImage(false);
        return;
      }

      // Wait a bit to ensure the view is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Double check the ref still exists
      if (!certificateRef.current) {
        console.log('Certificate ref no longer exists');
        Alert.alert('Erro', 'Não foi possível capturar a imagem. Tente novamente.');
        return;
      }

      console.log('Capturing certificate view...');
      // Capture the certificate view as image
      const uri = await captureRef(certificateRef.current, {
        format: 'png',
        quality: 1,
        width: 800,
        height: 1200,
      });

      console.log('Image captured, saving to gallery...');
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Dorama Hub', asset, false);

      Alert.alert(
        'Sucesso!',
        'Certificado de conclusão salvo na sua galeria!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Erro', 'Não foi possível salvar a imagem. Tente novamente.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const renderCertificate = () => {
    if (!completionData) return null;

    const { drama, hours, minutes } = completionData;
    const backdropUrl = drama.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${drama.backdrop_path}`
      : null;
    const posterUrl = drama.poster_path
      ? `https://image.tmdb.org/t/p/w500${drama.poster_path}`
      : null;

    return (
      <View ref={certificateRef} style={styles.certificate}>
        {/* Background Image */}
        {backdropUrl && (
          <Image source={{ uri: backdropUrl }} style={styles.backgroundImage} />
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          style={styles.gradientOverlay}
        />

        {/* Content */}
        <View style={styles.certificateContent}>
          {/* Poster */}
          {posterUrl && (
            <View style={styles.posterContainer}>
              <Image source={{ uri: posterUrl }} style={styles.poster} />
            </View>
          )}

          {/* Main Text */}
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.completedText}>concluiu</Text>
            <Text style={styles.dramaTitle}>{drama.name}</Text>
            
            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Tempo Total de Maratona</Text>
              <Text style={styles.statsValue}>{formatTime(hours, minutes)}</Text>
            </View>
          </View>

          {/* Branding */}
          <View style={styles.brandingContainer}>
            <Text style={styles.appName}>Dorama Hub</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Parabéns! 🎉</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Preparando seu certificado...</Text>
            </View>
          ) : (
            <>
              {/* Certificate Preview */}
              <View style={styles.certificatePreview}>
                {renderCertificate()}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Share2 size={20} color={COLORS.text} />
                  <Text style={styles.actionButtonText}>Compartilhar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.downloadButton]}
                  onPress={handleDownload}
                  disabled={isGeneratingImage}
                  activeOpacity={0.8}
                >
                  {isGeneratingImage ? (
                    <ActivityIndicator size={20} color={COLORS.text} />
                  ) : (
                    <Download size={20} color={COLORS.text} />
                  )}
                  <Text style={styles.actionButtonText}>
                    {isGeneratingImage ? 'Salvando...' : 'Baixar'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  certificatePreview: {
    flex: 1,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  certificate: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  certificateContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  posterContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  dramaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  brandingContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: COLORS.accent,
  },
  downloadButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});