import React, { useState } from 'react';
import { UserRole } from '../../types';
import HomeLoadingScreen from './HomeLoadingScreen';
import WelcomeScreen from './WelcomeScreen';
import LoginPage from './LoginPage';
import InfoPage from './InfoPage';
import CreateAccountPage from './CreateAccountPage';

export type AuthScreenStep = 'loading' | 'welcome' | 'login' | 'info' | 'create_account';

interface AuthFlowProps {
  initialStep?: AuthScreenStep;
  onAuthenticated: (role: UserRole, userDetails?: any) => void;
  onEmergencySosDirect: () => void;
}

export default function AuthFlow({
  initialStep = 'loading',
  onAuthenticated,
  onEmergencySosDirect
}: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthScreenStep>(initialStep);

  switch (currentStep) {
    case 'loading':
      return <HomeLoadingScreen onComplete={() => setCurrentStep('welcome')} />;

    case 'welcome':
      return (
        <WelcomeScreen
          onLoginClick={() => setCurrentStep('login')}
          onInfoClick={() => setCurrentStep('info')}
          onEmergencySosClick={onEmergencySosDirect}
        />
      );

    case 'login':
      return (
        <LoginPage
          onBack={() => setCurrentStep('welcome')}
          onLogin={(role, details) => onAuthenticated(role, details)}
          onCreateAccountClick={() => setCurrentStep('create_account')}
          onEmergencySosClick={onEmergencySosDirect}
        />
      );

    case 'info':
      return (
        <InfoPage
          onBack={() => setCurrentStep('welcome')}
        />
      );

    case 'create_account':
      return (
        <CreateAccountPage
          onBack={() => setCurrentStep('login')}
          onLoginClick={() => setCurrentStep('login')}
          onAccountCreated={(role, details) => onAuthenticated(role, details)}
        />
      );

    default:
      return <WelcomeScreen 
        onLoginClick={() => setCurrentStep('login')} 
        onInfoClick={() => setCurrentStep('info')} 
        onEmergencySosClick={onEmergencySosDirect} 
      />;
  }
}
