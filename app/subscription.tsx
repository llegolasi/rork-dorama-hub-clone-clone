import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check, Crown, Star, X, CreditCard, Smartphone } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { SubscriptionPlan, PaymentMethod } from '@/types/subscription';



const paymentMethods: PaymentMethod[] = [
  { id: 'credit_card', type: 'credit_card', name: 'Cartão de Crédito', icon: 'credit-card' },
  { id: 'pix', type: 'pix', name: 'PIX', icon: 'smartphone' },
];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('credit_card');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const plansQuery = trpc.subscription.getPlans.useQuery();
  const userSubscriptionQuery = trpc.subscription.getUserSubscription.useQuery();
  const createSubscriptionMutation = trpc.subscription.createSubscription.useMutation();

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Erro', 'Selecione um plano para continuar');
      return;
    }

    setIsProcessing(true);
    try {
      await createSubscriptionMutation.mutateAsync({
        planId: selectedPlan,
        paymentMethod: selectedPayment,
        transactionId: `mock_${Date.now()}`,
      });

      Alert.alert(
        'Sucesso!',
        'Sua assinatura foi ativada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível processar sua assinatura. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getMonthlyPrice = (price: number, months: number) => {
    return price / months;
  };

  if (plansQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (userSubscriptionQuery.data) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          <Crown size={48} color="white" />
          <Text style={styles.headerTitle}>Dorama+</Text>
          <Text style={styles.headerSubtitle}>Você já é um assinante premium!</Text>
        </LinearGradient>

        <View style={styles.activeSubscriptionContainer}>
          <View style={styles.activeSubscriptionCard}>
            <Text style={styles.activeSubscriptionTitle}>Assinatura Ativa</Text>
            <Text style={styles.activeSubscriptionPlan}>
              {userSubscriptionQuery.data.plan.name}
            </Text>
            <Text style={styles.activeSubscriptionExpiry}>
              Expira em: {new Date(userSubscriptionQuery.data.expires_at).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="white" />
        </TouchableOpacity>
        <Crown size={48} color="white" />
        <Text style={styles.headerTitle}>Dorama+</Text>
        <Text style={styles.headerSubtitle}>Acesso ilimitado aos melhores doramas</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Escolha seu plano</Text>

        {plansQuery.data?.map((plan: SubscriptionPlan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.selectedPlanCard,
              plan.is_popular && styles.popularPlanCard,
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            {plan.is_popular && (
              <View style={styles.popularBadge}>
                <Star size={16} color="white" />
                <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                {plan.duration_months > 1 && (
                  <Text style={styles.monthlyPrice}>
                    {formatPrice(getMonthlyPrice(plan.price, plan.duration_months))}/mês
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.planDescription}>{plan.description}</Text>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <Check size={16} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {selectedPlan === plan.id && (
              <View style={styles.selectedIndicator}>
                <Check size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ))}

        {selectedPlan && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Método de pagamento</Text>
            
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPayment === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                {method.type === 'credit_card' ? (
                  <CreditCard size={24} color={selectedPayment === method.id ? '#8B5CF6' : '#6B7280'} />
                ) : (
                  <Smartphone size={24} color={selectedPayment === method.id ? '#8B5CF6' : '#6B7280'} />
                )}
                <Text style={[
                  styles.paymentMethodText,
                  selectedPayment === method.id && styles.selectedPaymentMethodText,
                ]}>
                  {method.name}
                </Text>
                {selectedPayment === method.id && (
                  <Check size={20} color="#8B5CF6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              (!selectedPlan || isProcessing) && styles.disabledButton,
            ]}
            onPress={handleSubscribe}
            disabled={!selectedPlan || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                Assinar Agora
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Ao assinar, você concorda com nossos Termos de Uso e Política de Privacidade.
            A assinatura será renovada automaticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 32,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F8FAFF',
  },
  popularPlanCard: {
    borderColor: '#F59E0B',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  monthlyPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  planDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    padding: 8,
  },
  paymentSection: {
    marginTop: 32,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedPaymentMethod: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F8FAFF',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    flex: 1,
  },
  selectedPaymentMethodText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: 32,
    marginBottom: 40,
  },
  subscribeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  activeSubscriptionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  activeSubscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeSubscriptionTitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 8,
  },
  activeSubscriptionPlan: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 16,
  },
  activeSubscriptionExpiry: {
    fontSize: 16,
    color: '#374151',
  },
});