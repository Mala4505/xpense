import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import KhumusScreen from '../screens/KhumusScreen';
import LoansScreen from '../screens/LoansScreen';
import PendingScreen from '../screens/PendingScreen';
import AddScreen from '../screens/AddScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Add: undefined;
  Khumus: undefined;
  Loans: undefined;
  Pending: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="Add"
        component={AddScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Khumus"
        component={KhumusScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Loans"
        component={LoansScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Pending"
        component={PendingScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
