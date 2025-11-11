import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { X, Plus, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface OfficialCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  dramaId: number;
  dramaTitle: string;
  dramaPosterPath: string | null;
  dramaYear: number | null;
}

export default function OfficialCollectionModal({
  visible,
  onClose,
  dramaId,
  dramaTitle,
  dramaPosterPath,
  dramaYear,
}: OfficialCollectionModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionVisible, setNewCollectionVisible] = useState(true);
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      console.log('[OfficialCollectionModal] Fetching all collections');
      const { data, error } = await supabase
        .from('custom_collections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[OfficialCollectionModal] Error fetching collections:', error);
        throw error;
      }

      return data || [];
    },
    enabled: visible,
  });

  const { data: dramaCollections } = useQuery({
    queryKey: ['drama-collections', dramaId],
    queryFn: async () => {
      console.log('[OfficialCollectionModal] Fetching drama collections');
      const { data, error } = await supabase
        .from('custom_collection_dramas')
        .select('collection_id')
        .eq('drama_id', dramaId);

      if (error) {
        console.error('[OfficialCollectionModal] Error fetching drama collections:', error);
        throw error;
      }

      return data?.map(d => d.collection_id) || [];
    },
    enabled: visible,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) {
      Alert.alert('Atenção', 'Digite um título para a coleção');
      return;
    }

    try {
      setIsCreating(true);
      console.log('[OfficialCollectionModal] Creating new collection');
      
      const nextOrder = (collections?.length || 0) + 1;
      
      const { error } = await supabase
        .from('custom_collections')
        .insert({
          title: newCollectionTitle.trim(),
          description: newCollectionDescription.trim() || null,
          is_visible: newCollectionVisible,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) {
        console.error('[OfficialCollectionModal] Error creating collection:', error);
        throw new Error(error.message || 'Falha ao criar coleção');
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      setShowCreateForm(false);
      setNewCollectionTitle('');
      setNewCollectionDescription('');
      setNewCollectionVisible(true);
      Alert.alert('Sucesso', 'Coleção criada com sucesso!');
    } catch (err) {
      console.error('[OfficialCollectionModal] Error in handleCreateCollection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao criar coleção';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCollection = async (collectionId: string) => {
    try {
      setIsToggling(true);
      const isInCollection = dramaCollections?.includes(collectionId) || false;
      
      if (isInCollection) {
        console.log('[OfficialCollectionModal] Removing drama from collection');
        const { error } = await supabase
          .from('custom_collection_dramas')
          .delete()
          .eq('collection_id', collectionId)
          .eq('drama_id', dramaId);

        if (error) {
          console.error('[OfficialCollectionModal] Error removing drama:', error);
          throw new Error(error.message || 'Falha ao remover drama da coleção');
        }
      } else {
        console.log('[OfficialCollectionModal] Adding drama to collection');
        
        const { data: existingDramas } = await supabase
          .from('custom_collection_dramas')
          .select('display_order')
          .eq('collection_id', collectionId)
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = (existingDramas?.[0]?.display_order || 0) + 1;

        const { error } = await supabase
          .from('custom_collection_dramas')
          .insert({
            collection_id: collectionId,
            drama_id: dramaId,
            drama_title: dramaTitle,
            drama_poster_url: dramaPosterPath,
            drama_year: dramaYear,
            display_order: nextOrder,
          });

        if (error) {
          console.error('[OfficialCollectionModal] Error adding drama:', error);
          throw new Error(error.message || 'Falha ao adicionar drama à coleção');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['drama-collections', dramaId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
    } catch (err) {
      console.error('[OfficialCollectionModal] Error in handleToggleCollection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao atualizar coleção';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerenciar Coleções</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.dramaTitle} numberOfLines={1}>
            {dramaTitle}
          </Text>

          <ScrollView style={styles.scrollContent}>
            {showCreateForm ? (
              <View style={styles.createForm}>
                <Text style={styles.formLabel}>Nova Coleção</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Título da coleção"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newCollectionTitle}
                  onChangeText={setNewCollectionTitle}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newCollectionDescription}
                  onChangeText={setNewCollectionDescription}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Visível</Text>
                  <Switch
                    value={newCollectionVisible}
                    onValueChange={setNewCollectionVisible}
                    trackColor={{ false: COLORS.surface, true: COLORS.accent }}
                    thumbColor={COLORS.text}
                  />
                </View>

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewCollectionTitle('');
                      setNewCollectionDescription('');
                      setNewCollectionVisible(true);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.createButton]}
                    onPress={handleCreateCollection}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color={COLORS.background} />
                    ) : (
                      <Text style={styles.createButtonText}>Criar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => setShowCreateForm(true)}
                >
                  <Plus size={20} color={COLORS.accent} />
                  <Text style={styles.createNewText}>Criar Nova Coleção</Text>
                </TouchableOpacity>

                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                  </View>
                ) : collections && collections.length > 0 ? (
                  <View style={styles.collectionsList}>
                    <Text style={styles.sectionTitle}>Coleções Existentes</Text>
                    {collections.map((collection: any) => {
                      const isInCollection = dramaCollections?.includes(collection.id) || false;

                      return (
                        <TouchableOpacity
                          key={collection.id}
                          style={[
                            styles.collectionItem,
                            isInCollection && styles.collectionItemActive,
                          ]}
                          onPress={() => handleToggleCollection(collection.id)}
                          disabled={isToggling}
                        >
                          <View style={styles.collectionInfo}>
                            <Text style={styles.collectionTitle}>
                              {collection.title}
                            </Text>
                            {collection.description && (
                              <Text style={styles.collectionDescription} numberOfLines={2}>
                                {collection.description}
                              </Text>
                            )}
                            <View style={styles.collectionMeta}>
                              <Text style={styles.collectionMetaText}>
                                {collection.is_visible ? 'Visível' : 'Oculta'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.checkboxContainer}>
                            {isToggling ? (
                              <ActivityIndicator size="small" color={COLORS.accent} />
                            ) : isInCollection ? (
                              <View style={styles.checkboxChecked}>
                                <Check size={16} color={COLORS.background} />
                              </View>
                            ) : (
                              <View style={styles.checkboxUnchecked} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhuma coleção criada ainda
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  dramaTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollContent: {
    flex: 1,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createNewText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  createForm: {
    padding: 20,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  createButton: {
    backgroundColor: COLORS.accent,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  collectionsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  collectionItemActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  collectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  collectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
