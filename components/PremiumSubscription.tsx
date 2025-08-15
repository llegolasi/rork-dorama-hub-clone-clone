import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Crown, Check, Star, Palette, MessageCircle, BarChart3, Filter } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface PremiumSubscriptionProps {
  isSubscribed: boolean;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

export default function PremiumSubscription({ isSubscribed, onSubscribe }: PremiumSubscriptionProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const features = [
    {
      icon: <Star size={20} color={COLORS.accent} />,
      title: 'Conquistas Exclusivas',
      description: 'Acesso a conquistas raras e lendárias com designs premium',
    },
    {
      icon: <Palette size={20} color={COLORS.accent} />,
      title: 'Personalização de Perfil',
      description: 'Temas personalizados e bordas exclusivas para seu perfil',
    },
    {
      icon: <MessageCircle size={20} color={COLORS.accent} />,
      title: 'Reações Avançadas',
      description: 'Expresse-se com emojis exclusivos além do curtir padrão',
    },
    {
      icon: <Filter size={20} color={COLORS.accent} />,
      title: 'Filtros Avançados',
      description: 'Filtre rankings por gênero e país na aba Comunidade',
    },
    {
      icon: <BarChart3 size={20} color={COLORS.accent} />,
      title: 'Estatísticas Detalhadas',
      description: 'Gráficos e análises profundas dos seus hábitos de visualização',
    },
  ];

  const handleSubscribe = () => {
    if (isSubscribed) {
      Alert.alert(
        'Já Assinante',
        'Você já possui uma assinatura ativa do Dorama Hub+!',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirmar Assinatura',
      `Deseja assinar o plano ${selectedPlan === 'monthly' ? 'mensal' : 'anual'} do Dorama Hub+?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => onSubscribe(selectedPlan),
          style: 'default'
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.crownContainer}>
          <Crown size={48} color="#FDCB6E" />
        </View>
        <Text style={styles.title}>Dorama Hub+</Text>
        <Text style={styles.subtitle}>
          Desbloqueie recursos exclusivos e eleve sua experiência
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Recursos Exclusivos</Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              {feature.icon}
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {!isSubscribed && (
        <View style={styles.pricingContainer}>
          <Text style={styles.pricingTitle}>Escolha seu Plano</Text>
          
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Mensal</Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.selectedBadge}>
                  <Check size={16} color={COLORS.background} />
                </View>
              )}
            </View>
            <Text style={styles.planPrice}>R$ 9,90/mês</Text>
            <Text style={styles.planDescription}>Renovação automática mensal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.selectedPlan,
              styles.recommendedPlan
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMENDADO</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Anual</Text>
              {selectedPlan === 'yearly' && (
                <View style={styles.selectedBadge}>
                  <Check size={16} color={COLORS.background} />
                </View>
              )}
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.planPrice}>R$ 89,90/ano</Text>
              <Text style={styles.savings}>Economize 25%</Text>
            </View>
            <Text style={styles.planDescription}>R$ 7,49/mês • Renovação anual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Crown size={20} color={COLORS.background} />
            <Text style={styles.subscribeButtonText}>
              Assinar Dorama Hub+
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Cancele a qualquer momento. Termos e condições aplicáveis.
          </Text>
        </View>
      )}

      {isSubscribed && (
        <View style={styles.subscribedContainer}>
          <View style={styles.subscribedBadge}>
            <Crown size={24} color="#FDCB6E" />
            <Text style={styles.subscribedText}>Assinante Ativo</Text>
          </View>
          <Text style={styles.subscribedDescription}>
            Você tem acesso a todos os recursos premium do Dorama Hub+
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  crownContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  pricingContainer: {
    padding: 20,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: COLORS.accent,
  },
  recommendedPlan: {
    borderColor: '#FDCB6E',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  savings: {
    backgroundColor: COLORS.success,
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.background,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  subscribedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDCB6E' + '20',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  subscribedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FDCB6E',
  },
  subscribedDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});