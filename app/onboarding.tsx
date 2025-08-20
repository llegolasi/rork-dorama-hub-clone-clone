import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { ONBOARDING_STEPS, OnboardingStep } from '@/constants/onboarding';
import LoginStep from '@/components/onboarding/LoginStep';
import CredentialsStep from '@/components/onboarding/CredentialsStep';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ProfileStep from '@/components/onboarding/ProfileStep';
import PreferencesStep from '@/components/onboarding/PreferencesStep';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(ONBOARDING_STEPS.LOGIN);
  const insets = useSafeAreaInsets();

  const handleStepComplete = (step: OnboardingStep) => {
    switch (step) {
      case ONBOARDING_STEPS.LOGIN:
        // Login handled in LoginStep
        break;
      case ONBOARDING_STEPS.CREDENTIALS:
        setCurrentStep(ONBOARDING_STEPS.PERSONAL_INFO);
        break;
      case ONBOARDING_STEPS.PERSONAL_INFO:
        setCurrentStep(ONBOARDING_STEPS.PROFILE);
        break;
      case ONBOARDING_STEPS.PROFILE:
        setCurrentStep(ONBOARDING_STEPS.PREFERENCES);
        break;
      case ONBOARDING_STEPS.PREFERENCES:
        // Onboarding complete - handled in PreferencesStep
        break;
    }
  };

  const handleSwitchToLogin = () => {
    setCurrentStep(ONBOARDING_STEPS.LOGIN);
  };

  const handleSwitchToSignup = () => {
    setCurrentStep(ONBOARDING_STEPS.CREDENTIALS);
  };

  const renderStep = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.LOGIN:
        return <LoginStep onSwitchToSignup={handleSwitchToSignup} />;
      case ONBOARDING_STEPS.CREDENTIALS:
        return (
          <CredentialsStep 
            onComplete={() => handleStepComplete(ONBOARDING_STEPS.CREDENTIALS)}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case ONBOARDING_STEPS.PERSONAL_INFO:
        return <PersonalInfoStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PERSONAL_INFO)} />;
      case ONBOARDING_STEPS.PROFILE:
        return <ProfileStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PROFILE)} />;
      case ONBOARDING_STEPS.PREFERENCES:
        return <PreferencesStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PREFERENCES)} />;
      default:
        return <LoginStep onSwitchToSignup={handleSwitchToSignup} />;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.backgroundContainer, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : []}>
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {renderStep()}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  keyboardView: {
    flex: 1
  }
});