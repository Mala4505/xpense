import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, GestureResponderEvent } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { springs } from '../theme/springs';
import { useAddSheetStore } from '../stores/addSheetStore';
import { AddSheet } from '../components/AddSheet';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function FABButton({ onPress }: { onPress?: (e: GestureResponderEvent) => void }) {
  const [pressed, setPressed] = useState(false);
  const isOpen = useAddSheetStore((s) => s.isOpen);

  function handlePress() {
    if (isOpen) {
      useAddSheetStore.getState().closeSheet();
    } else {
      useAddSheetStore.getState().openSheet();
    }
  }

  return (
    <View style={styles.fabContainer} pointerEvents="box-none">
      <MotiView
        animate={{ scale: pressed ? 0.88 : 1 }}
        transition={springs.snappy}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handlePress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          activeOpacity={1}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MotiView
            animate={{ rotate: isOpen ? '45deg' : '0deg' }}
            transition={springs.snappy}
          >
            <Ionicons name="add" size={29} color={colors.brandNavy} />
          </MotiView>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

function DummyScreen() {
  return null;
}

export default function BottomTabNavigator() {
  const isSheetOpen = useAddSheetStore((s) => s.isOpen);

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
      {isSheetOpen && <AddSheet />}
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 0.5,
    borderTopColor: colors.surfaceBorder,
    height: 70,
    paddingBottom: Platform.select({ ios: 20, android: 8 }),
    paddingTop: 2,
  },
  tabBarLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 57,
    height: 57,
    borderRadius: 30,
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
