import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { getDramaImages } from '@/services/api';
import { ImageItem } from '@/types/drama';

const { width } = Dimensions.get('window');

export default function DramaGalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dramaId = parseInt(id || '0', 10);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ['drama-images', dramaId],
    queryFn: () => getDramaImages(dramaId),
    enabled: !!dramaId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const allImages = [
    ...(images?.backdrops || []),
    ...(images?.posters || [])
  ];

  const renderImageItem = ({ item, index }: { item: ImageItem; index: number }) => (
    <TouchableOpacity 
      style={styles.imageItem}
      onPress={() => setSelectedImage(item)}
    >
      <Image
        source={{
          uri: `https://image.tmdb.org/t/p/w500${item.file_path}`
        }}
        style={styles.galleryImage}
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Galeria',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      
      {allImages.length > 0 ? (
        <FlatList
          data={allImages}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `${item.file_path}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma imagem disponível</Text>
        </View>
      )}

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={() => setSelectedImage(null)}
          />
          
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
            
            {selectedImage && (
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/original${selectedImage.file_path}`
                }}
                style={styles.fullImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 8,
  },
  imageItem: {
    flex: 1,
    margin: 4,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: width - 32,
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});