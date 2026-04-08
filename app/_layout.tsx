import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const { load, loaded } = useStore();

  useEffect(() => { load(); }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: Colors.card,
              borderTopColor: Colors.border,
              borderTopWidth: 1,
              paddingBottom: 4,
              height: 60,
            },
            tabBarActiveTintColor: Colors.accent,
            tabBarInactiveTintColor: Colors.textDim,
            tabBarLabelStyle: {
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 2,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="budget"
            options={{
              title: 'Budget',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="list-outline" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Transactions',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="swap-horizontal-outline" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="analytics"
            options={{
              title: 'Analytics',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="bar-chart-outline" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size - 2} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
