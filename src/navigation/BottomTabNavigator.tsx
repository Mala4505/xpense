import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, GestureResponderEvent } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useAddSheetStore } from '../stores/addSheetStore';
import { AddSheet } from '../components/AddSheet';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function FABButton({ onPress }: { onPress?: (e: GestureResponderEvent) => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <View style={styles.fabContainer} pointerEvents="box-none">
      <MotiView
        animate={{ scale: pressed ? 0.88 : 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 320 }}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => useAddSheetStore.getState().openSheet()}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={1}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={28} color={colors.brandNavy} />
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

function DummyScreen() {
  return null;
}

export default function BottomTabNavigator() {
  const isOpen = useAddSheetStore((s) => s.isOpen);
  const [sheetMounted, setSheetMounted] = useState(false);

  useEffect(() => {
    if (isOpen && !sheetMounted) setSheetMounted(true);
  }, [isOpen, sheetMounted]);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.brandNavy,
          tabBarInactiveTintColor: colors.textDisabled,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Add"
          component={DummyScreen}
          options={{
            tabBarShowLabel: false,
            tabBarButton: () => <FABButton />,
          }}
        />
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            tabBarLabel: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      {sheetMounted && <AddSheet />}
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceBorder,
    height: 70,
    paddingBottom: 20,
    paddingTop: 2,
  },
  tabBarLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandYellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceBg,
    shadowColor: colors.brandNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
