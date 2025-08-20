import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { Calendar, User, ChevronDown } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { GENDER_OPTIONS, GenderOption } from '@/constants/onboarding';
import { useAuth } from '@/hooks/useAuth';

interface PersonalInfoStepProps {
  onComplete: () => void;
}

export default function PersonalInfoStep({ onComplete }: PersonalInfoStepProps) {
  const [selectedGender, setSelectedGender] = useState<GenderOption | undefined>(undefined);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { updateOnboardingData } = useAuth();

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      const age = calculateAge(selectedDate);
      
      if (age < 13) {
        Alert.alert(
          'Idade mínima',
          'Você deve ter pelo menos 13 anos para usar o Dorama Hub.'
        );
        return;
      }
      
      if (age > 120) {
        Alert.alert(
          'Data inválida',
          'Por favor, insira uma data de nascimento válida.'
        );
        return;
      }
      
      setBirthDate(selectedDate);
    }
  };

  const canProceed = (): boolean => {
    return selectedGender !== undefined && birthDate !== null;
  };

  const handleContinue = async () => {
    if (!canProceed() || !selectedGender) {
      Alert.alert('Dados incompletos', 'Por favor, selecione seu gênero e data de nascimento.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Update onboarding data with personal info
      updateOnboardingData({
        gender: selectedGender,
        birthDate: birthDate!.toISOString(),
        age: calculateAge(birthDate!)
      });
      
      onComplete();
    } catch (error) {
      console.error('Personal info step error:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    }
    
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Informações Pessoais</Text>
        <Text style={styles.subtitle}>
          Nos conte um pouco sobre você para personalizar sua experiência
        </Text>
        
        {/* Gender Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Gênero</Text>
          </View>
          
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => setSelectedGender(value)}
              items={GENDER_OPTIONS.map(option => ({
                label: `${option.emoji} ${option.label}`,
                value: option.id,
                key: option.id
              }))}
              style={{
                inputIOS: {
                  ...styles.pickerInput,
                  color: selectedGender ? COLORS.text : COLORS.textSecondary,
                },
                inputAndroid: {
                  ...styles.pickerInput,
                  color: selectedGender ? COLORS.text : COLORS.textSecondary,
                },
                placeholder: {
                  color: COLORS.textSecondary,
                  fontSize: 16,
                },
                iconContainer: {
                  top: 20,
                  right: 16,
                },
              }}
              placeholder={{
                label: 'Selecione seu gênero',
                value: null,
                color: COLORS.textSecondary,
              }}
              value={selectedGender || undefined}
              useNativeAndroidPickerStyle={false}
              Icon={() => {
                return <ChevronDown size={20} color={COLORS.textSecondary} />;
              }}
            />
          </View>
        </View>

        {/* Birth Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Data de Nascimento</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.dateButton,
              birthDate && styles.dateButtonSelected
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[
              styles.dateButtonText,
              birthDate && styles.dateButtonTextSelected
            ]}>
              {birthDate ? formatDate(birthDate) : 'Selecionar data'}
            </Text>
            <Calendar size={20} color={birthDate ? COLORS.accent : COLORS.textSecondary} />
          </TouchableOpacity>
          
          {birthDate && (
            <Text style={styles.ageText}>
              Idade: {calculateAge(birthDate)} anos
            </Text>
          )}
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceed() && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!canProceed() || isLoading}
        >
          <Text style={[
            styles.continueButtonText,
            !canProceed() && styles.continueButtonTextDisabled
          ]}>
            {isLoading ? 'Salvando...' : 'Continuar'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            🔒 Suas informações pessoais são privadas e seguras
          </Text>
        </View>
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
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  pickerInput: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 50,
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  dateButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '10',
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  dateButtonTextSelected: {
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  ageText: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  continueButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  privacyNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});