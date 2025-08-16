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
    if (!completionData) {
      console.log('Missing completion data');
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

      // Wait for images to load and view to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if ref exists and is mounted
      if (!certificateRef.current) {
        console.log('Certificate ref does not exist');
        Alert.alert('Erro', 'Não foi possível capturar a imagem. Tente novamente.');
        setIsGeneratingImage(false);
        return;
      }

      console.log('Capturing certificate view...');
      
      // Use a more reliable capture method
      let uri: string;
      try {
        uri = await captureRef(certificateRef, {
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
        });
      } catch (captureError) {
        console.error('Capture error:', captureError);
        // Retry with different options
        await new Promise(resolve => setTimeout(resolve, 500));
        uri = await captureRef(certificateRef, {
          format: 'jpg',
          quality: 0.9,
          result: 'tmpfile',
        });
      }

      console.log('Image captured successfully:', uri);
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Asset created:', asset);
      
      // Try to create album, but don't fail if it already exists
      try {
        await MediaLibrary.createAlbumAsync('Dorama Hub', asset, false);
      } catch (albumError) {
        console.log('Album creation failed (might already exist):', albumError);
      }

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
      <View 
        ref={certificateRef} 
        style={styles.certificate}
        collapsable={false}
      >
        {/* Background Image */}
        {backdropUrl && (
          <Image 
            source={{ uri: backdropUrl }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            'rgba(138, 43, 226, 0.4)',
            'rgba(30, 144, 255, 0.6)', 
            'rgba(255, 20, 147, 0.8)',
            'rgba(0, 0, 0, 0.9)'
          ]}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.gradientOverlay}
        />

        {/* Content */}
        <View style={styles.certificateContent}>
          {/* Poster */}
          {posterUrl && (
            <View style={styles.posterContainer}>
              <Image 
                source={{ uri: posterUrl }} 
                style={styles.poster}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Main Text */}
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.completedText}>concluiu</Text>
            <Text style={styles.dramaTitle}>{drama.name}</Text>
            
            {/* Stats */}
            <View style={styles.statsContainer}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.9)', 'rgba(255, 140, 0, 0.9)']}
                style={styles.statsGradient}
              >
                <Text style={styles.statsTitle}>⏱️ Tempo Total de Maratona</Text>
                <Text style={styles.statsValue}>{formatTime(hours, minutes)}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Branding */}
          <View style={styles.brandingContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(240, 240, 240, 0.8)']}
              style={styles.brandingGradient}
            >
              <Text style={styles.appName}>📱 Dorama Hub</Text>
              <Text style={styles.appTagline}>Sua jornada K-Drama</Text>
            </LinearGradient>
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
    backgroundColor: '#000',
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
    width: 90,
    height: 135,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFD700',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  completedText: {
    fontSize: 20,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dramaTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  statsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 18,
    color: '#000',
    marginBottom: 8,
    fontWeight: '600',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  brandingContainer: {
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  brandingGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  appTagline: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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