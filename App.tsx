import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import { ApiConfigProvider } from './context/ApiConfigContext';
import { SubscriptionService } from './services/SubscriptionService';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize subscription service
    SubscriptionService.initialize();

    // Cleanup on unmount
    return () => {
      SubscriptionService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ApiConfigProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ApiConfigProvider>
    </SafeAreaProvider>
  );
};

export default App;
