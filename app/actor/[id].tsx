import React, { useEffect } from "react";
import { 
  ActivityIndicator, 
  Dimensions, 
  FlatList, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "@/constants/colors";
import { PROFILE_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { getActorCredits, getActorDetails } from "@/services/api";
import DramaCard from "@/components/DramaCard";

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
    
    return birthday.toLocaleDateString(undefined, options);
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
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="actor-detail-screen"
    >
      <View style={styles.headerContainer}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ 
              uri: actor.profile_path 
                ? `${TMDB_IMAGE_BASE_URL}/${PROFILE_SIZE}${actor.profile_path}` 
                : "https://via.placeholder.com/185x278/1C1C1E/8E8E93?text=No+Image" 
            }}
            style={styles.profileImage}
            contentFit="cover"
          />
          
          <LinearGradient
            colors={["transparent", COLORS.background]}
            style={styles.gradient}
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{actor.name}</Text>
          
          <View style={styles.metaContainer}>
            {formattedBirthday && (
              <Text style={styles.metaText}>
                Born: {formattedBirthday} {age ? `(${age} years)` : ""}
              </Text>
            )}
            
            {actor.place_of_birth && (
              <Text style={styles.metaText}>
                From: {actor.place_of_birth}
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {actor.biography ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biography</Text>
          <Text style={styles.biography}>{actor.biography}</Text>
        </View>
      ) : null}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>K-Drama Appearances</Text>
        
        {sortedCredits.length > 0 ? (
          <FlatList
            data={sortedCredits}
            keyExtractor={(item) => `${item.id}-${item.character}`}
            renderItem={({ item }) => (
              <View style={styles.creditItem}>
                <DramaCard 
                  drama={{
                    id: item.id,
                    name: item.name,
                    original_name: item.original_name,
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    overview: "",
                    first_air_date: item.first_air_date,
                    vote_average: item.vote_average,
                    vote_count: 0,
                    popularity: 0,
                    genre_ids: [],
                    origin_country: ["KR"]
                  }} 
                  size="medium"
                />
                
                {item.character && (
                  <Text style={styles.characterName}>
                    as {item.character}
                  </Text>
                )}
              </View>
            )}
            horizontal={false}
            numColumns={2}
            contentContainerStyle={styles.creditsContainer}
            showsVerticalScrollIndicator={false}
            testID="actor-credits"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No K-drama appearances found for this actor.
            </Text>
          </View>
        )}
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
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
  },
  headerContainer: {
    marginBottom: 24,
  },
  profileImageContainer: {
    width: width,
    height: width * 0.8,
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.card,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  infoContainer: {
    padding: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  metaContainer: {
    marginBottom: 8,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  biography: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 24,
  },
  creditsContainer: {
    paddingBottom: 16,
  },
  creditItem: {
    width: "50%",
    padding: 4,
  },
  characterName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});