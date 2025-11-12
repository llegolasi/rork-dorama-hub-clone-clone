import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { ONBOARDING_STEPS, OnboardingStep } from '@/constants/onboarding';
import LoginStep from '@/components/onboarding/LoginStep';
import CredentialsStep from '@/components/onboarding/CredentialsStep';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ProfileStep from '@/components/onboarding/ProfileStep';
import ProfileInfoStep from '@/components/onboarding/ProfileInfoStep';
import PreferencesStep from '@/components/onboarding/PreferencesStep';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(ONBOARDING_STEPS.LOGIN);

  const handleStepComplete = (step: OnboardingStep) => {
    switch (step) {
      case ONBOARDING_STEPS.LOGIN:
        // Login handled in LoginStep
        break;
      case ONBOARDING_STEPS.CREDENTIALS:
        setCurrentStep(ONBOARDING_STEPS.PERSONAL_INFO);
        break;
      case ONBOARDING_STEPS.PERSONAL_INFO:
        setCurrentStep(ONBOARDING_STEPS.PROFILE_PHOTO);
        break;
      case ONBOARDING_STEPS.PROFILE_PHOTO:
        setCurrentStep(ONBOARDING_STEPS.PROFILE_INFO);
        break;
      case ONBOARDING_STEPS.PROFILE_INFO:
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
      case ONBOARDING_STEPS.PROFILE_PHOTO:
        return <ProfileStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PROFILE_PHOTO)} />;
      case ONBOARDING_STEPS.PROFILE_INFO:
        return <ProfileInfoStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PROFILE_INFO)} />;
      case ONBOARDING_STEPS.PREFERENCES:
        return <PreferencesStep onComplete={() => handleStepComplete(ONBOARDING_STEPS.PREFERENCES)} />;
      default:
        return <LoginStep onSwitchToSignup={handleSwitchToSignup} />;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {renderStep()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
});