import { Stack } from 'expo-router';
import { useColorScheme } from '@/core/hooks/useColorScheme';
import Colors from '@/constants/colors';
import { ScreenViewContext } from '@/core/components/ScreenView';

export default function AuthLayout() {
  const scheme = useColorScheme() ?? 'light';
  const rootBg = Colors[scheme].background;

  return (
    <ScreenViewContext.Provider value={{ isAuth: true }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: rootBg },
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      </Stack>
    </ScreenViewContext.Provider>
  );
}
