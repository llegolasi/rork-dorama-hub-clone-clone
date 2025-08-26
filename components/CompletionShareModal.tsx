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
import { X, Share2 } from 'lucide-react-native';
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
    if (!completionData) {
      console.log('Missing completion data');
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Wait for images to load and view to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if ref exists and is mounted
      if (!certificateRef.current) {
        console.log('Certificate ref does not exist');
        Alert.alert('Erro', 'Não foi possível capturar a imagem. Tente novamente.');
        setIsGeneratingImage(false);
        return;
      }

      console.log('Capturing certificate view for sharing...');
      
      // Capture the image
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

      console.log('Image captured successfully for sharing:', uri);
      
      // Share the image
      await Share.share({
        url: uri,
        title: 'Dorama Concluído!',
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a imagem. Tente novamente.');
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
        {/* Modern Gradient Background */}
        <LinearGradient
          colors={[
            '#FF5FA2', // App accent color
            '#8B5CF6', // Purple
            '#3B82F6', // Blue
            '#06B6D4', // Cyan
            '#10B981', // Emerald
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modernGradient}
        />
        
        {/* Backdrop Overlay (subtle) */}
        {backdropUrl && (
          <View style={styles.backdropContainer}>
            <Image 
              source={{ uri: backdropUrl }} 
              style={styles.backdropImage}
              resizeMode="cover"
            />
            <View style={styles.backdropOverlay} />
          </View>
        )}

        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.floatingCircle, styles.circle1]} />
          <View style={[styles.floatingCircle, styles.circle2]} />
          <View style={[styles.floatingCircle, styles.circle3]} />
          <View style={[styles.floatingSquare, styles.square1]} />
          <View style={[styles.floatingSquare, styles.square2]} />
        </View>

        {/* Content */}
        <View style={styles.certificateContent}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.celebrationContainer}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={styles.celebrationText}>PARABÉNS!</Text>
            </View>
          </View>
          
          {/* Centered Poster */}
          {posterUrl && (
            <View style={styles.centeredPosterContainer}>
              <View style={styles.posterFrame}>
                <Image 
                  source={{ uri: posterUrl }} 
                  style={styles.centeredPoster}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.posterGlow} />
            </View>
          )}

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.achievementBadge}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeIcon}>👑</Text>
                <Text style={styles.badgeText}>DORAMA CONCLUÍDO</Text>
              </LinearGradient>
            </View>

            <Text style={styles.modernUserName}>{userName}</Text>
            <Text style={styles.modernCompletedText}>finalizou com sucesso</Text>
            <Text style={styles.modernDramaTitle}>{drama.name}</Text>
            
            {/* Modern Stats Card */}
            <View style={styles.modernStatsContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.modernStatsGradient}
              >
                <View style={styles.statsHeader}>
                  <Text style={styles.statsIcon}>⏱️</Text>
                  <Text style={styles.modernStatsTitle}>Tempo de Maratona</Text>
                </View>
                <Text style={styles.modernStatsValue}>{formatTime(hours, minutes)}</Text>
                <View style={styles.statsDecoration}>
                  <View style={styles.statsDot} />
                  <View style={styles.statsDot} />
                  <View style={styles.statsDot} />
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Modern Branding */}
          <View style={styles.modernBrandingContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.modernBrandingGradient}
            >
              <View style={styles.brandingContent}>
                <View style={styles.appIconContainer}>
                  <Text style={styles.appIcon}>📱</Text>
                </View>
                <View style={styles.brandingText}>
                  <Text style={styles.modernAppName}>Dorama Hub</Text>
                  <Text style={styles.modernAppTagline}>Sua jornada K-Drama</Text>
                </View>
              </View>
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
                  style={[styles.actionButton, styles.shareButton, styles.shareButtonFullWidth]}
                  onPress={handleShare}
                  disabled={isGeneratingImage}
                  activeOpacity={0.8}
                >
                  {isGeneratingImage ? (
                    <ActivityIndicator size={20} color={COLORS.text} />
                  ) : (
                    <Share2 size={20} color={COLORS.text} />
                  )}
                  <Text style={styles.actionButtonText}>
                    {isGeneratingImage ? 'Preparando...' : 'Compartilhar'}
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
    overflow: 'hidden',
  },
  modernGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 80,
    height: 80,
    top: 60,
    left: 30,
  },
  circle2: {
    width: 120,
    height: 120,
    top: 200,
    right: 20,
  },
  circle3: {
    width: 60,
    height: 60,
    bottom: 150,
    left: 50,
  },
  floatingSquare: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '45deg' }],
  },
  square1: {
    width: 40,
    height: 40,
    top: 120,
    right: 80,
  },
  square2: {
    width: 30,
    height: 30,
    bottom: 200,
    right: 40,
  },
  certificateContent: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  centeredPosterContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  posterFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  centeredPoster: {
    width: 140,
    height: 210,
  },
  posterGlow: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: -1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  achievementBadge: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  badgeGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1,
  },
  modernUserName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  modernCompletedText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  modernDramaTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    lineHeight: 38,
    letterSpacing: 1,
  },
  modernStatsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernStatsGradient: {
    padding: 24,
    alignItems: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statsIcon: {
    fontSize: 20,
  },
  modernStatsTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  modernStatsValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statsDecoration: {
    flexDirection: 'row',
    gap: 6,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  modernBrandingContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modernBrandingGradient: {
    padding: 16,
  },
  brandingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    fontSize: 18,
  },
  brandingText: {
    alignItems: 'center',
  },
  modernAppName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  modernAppTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
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
  shareButtonFullWidth: {
    width: '100%',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});