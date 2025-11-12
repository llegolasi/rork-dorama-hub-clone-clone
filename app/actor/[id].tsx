import React, { useEffect } from "react";
import { 
  ActivityIndicator, 
  Dimensions, 
  FlatList, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  View 
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Calendar, Cake, Award, Film } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { PROFILE_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { getActorCredits, getActorDetails } from "@/services/api";
import DramaCard from "@/components/DramaCard";
import OptimizedImage from "@/components/OptimizedImage";

const { width } = Dimensions.get("window");

export default function ActorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const actorId = parseInt(id || "0", 10);
  
  const { data: actor, isLoading: isLoadingActor } = useQuery({
    queryKey: ["actor-details", actorId],
    queryFn: () => getActorDetails(actorId),
    enabled: !!actorId,
  });
  
  const { data: credits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ["actor-credits", actorId],
    queryFn: () => getActorCredits(actorId),
    enabled: !!actorId,
  });
  
  // Update header title when actor data is loaded
  useEffect(() => {
    if (actor) {
      router.setParams({ title: actor.name });
    }
  }, [actor, router]);
  
  const isLoading = isLoadingActor || isLoadingCredits;
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  
  if (!actor) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load actor details</Text>
      </View>
    );
  }
  
  // Format birthday
  const formatBirthday = (date: string | null) => {
    if (!date) return null;
    
    const birthday = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    };
    
    return birthday.toLocaleDateString('pt-BR', options);
  };
  
  const formattedBirthday = formatBirthday(actor.birthday);
  
  // Calculate age
  const calculateAge = (birthday: string | null) => {
    if (!birthday) return null;
    
    const birthDate = new Date(birthday);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const age = calculateAge(actor.birthday);
  
  // Sort credits by popularity (fallback to vote_average if popularity is not available)
  const sortedCredits = credits?.cast.sort((a, b) => {
    const aPopularity = a.popularity ?? a.vote_average ?? 0;
    const bPopularity = b.popularity ?? b.vote_average ?? 0;
    return bPopularity - aPopularity;
  }) || [];

  return (
    <>
      <Stack.Screen 
        options={{
          title: actor.name,
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: COLORS.text,
        }} 
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        testID="actor-detail-screen"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <OptimizedImage
            source={{ 
              uri: actor.profile_path 
                ? `${TMDB_IMAGE_BASE_URL}/w780${actor.profile_path}` 
                : "https://via.placeholder.com/780x1170/1C1C1E/8E8E93?text=No+Image" 
            }}
            style={styles.heroImage}
            contentFit="cover"
            priority="high"
            cachePolicy="memory-disk"
          />
          
          <LinearGradient
            colors={[
              "transparent",
              "rgba(0, 0, 0, 0.3)",
              "rgba(0, 0, 0, 0.7)",
              COLORS.background
            ]}
            locations={[0, 0.4, 0.7, 1]}
            style={styles.gradient}
          />
          
          <View style={styles.heroContent}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageWrapper}>
                <OptimizedImage
                  source={{ 
                    uri: actor.profile_path 
                      ? `${TMDB_IMAGE_BASE_URL}/${PROFILE_SIZE}${actor.profile_path}` 
                      : "https://via.placeholder.com/185x278/1C1C1E/8E8E93?text=No+Image" 
                  }}
                  style={styles.profileImage}
                  contentFit="cover"
                  priority="high"
                  cachePolicy="memory-disk"
                />
              </View>
              
              <View style={styles.nameSection}>
                <Text style={styles.name}>{actor.name}</Text>
                
                <View style={styles.statsRow}>
                  {actor.known_for_department && (
                    <View style={styles.statBadge}>
                      <Award size={14} color={COLORS.accent} />
                      <Text style={styles.statBadgeText}>
                        {actor.known_for_department === 'Acting' ? 'Atuação' : actor.known_for_department}
                      </Text>
                    </View>
                  )}
                  {sortedCredits.length > 0 && (
                    <View style={styles.statBadge}>
                      <Film size={14} color={COLORS.accent} />
                      <Text style={styles.statBadgeText}>{sortedCredits.length} trabalhos</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          {formattedBirthday && (
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Cake size={20} color={COLORS.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nascimento</Text>
                <Text style={styles.infoText}>
                  {formattedBirthday} {age ? `(${age} anos)` : ""}
                </Text>
              </View>
            </View>
          )}
          
          {actor.place_of_birth && (
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <MapPin size={20} color={COLORS.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Local de Nascimento</Text>
                <Text style={styles.infoText}>{actor.place_of_birth}</Text>
              </View>
            </View>
          )}
        </View>
        
        {actor.biography ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biografia</Text>
            <Text style={styles.biography}>{actor.biography}</Text>
          </View>
        ) : null}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filmografia</Text>
          <Text style={styles.sectionSubtitle}>{sortedCredits.length} Participações em K-Dramas</Text>
          
          {sortedCredits.length > 0 ? (
            <View style={styles.creditsGrid}>
              {sortedCredits.map((item) => (
                <TouchableOpacity
                  key={`${item.id}-${item.character}`}
                  style={styles.creditCard}
                  onPress={() => router.push(`/drama/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.creditPosterContainer}>
                    <OptimizedImage
                      source={{
                        uri: item.poster_path
                          ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                          : 'https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Image',
                      }}
                      style={styles.creditPoster}
                      contentFit="cover"
                      priority="low"
                      cachePolicy="disk"
                    />
                  </View>
                  
                  <View style={styles.creditInfo}>
                    <Text style={styles.creditTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.character && (
                      <View style={styles.characterBadge}>
                        <Text style={styles.characterText} numberOfLines={1}>
                          as {item.character}
                        </Text>
                      </View>
                    )}
                    {item.first_air_date && (
                      <Text style={styles.creditYear}>
                        {new Date(item.first_air_date).getFullYear()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Film size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                Nenhuma participação em K-dramas encontrada para este ator.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
  },
  headerContainer: {
    position: 'relative',
    height: width * 1.2,
  },
  heroImage: {
    width: width,
    height: width * 1.2,
    backgroundColor: COLORS.card,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: width * 0.8,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  profileImageWrapper: {
    width: 120,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.card,
  },
  nameSection: {
    flex: 1,
    paddingBottom: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card + 'E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 20,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    fontWeight: '500',
  },
  biography: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text,
    opacity: 0.9,
  },
  creditsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  creditCard: {
    width: (width - 52) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  creditPosterContainer: {
    width: '100%',
    aspectRatio: 2/3,
    overflow: 'hidden',
  },
  creditPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  creditInfo: {
    padding: 12,
  },
  creditTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  characterBadge: {
    backgroundColor: COLORS.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  characterText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  creditYear: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});