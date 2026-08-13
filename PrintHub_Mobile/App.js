import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

import CatalogScreen from "./screens/CatalogScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import CustomizerWebViewScreen from "./screens/CustomizerWebViewScreen";
import CartScreen from "./screens/CartScreen";
import LoginScreen from "./screens/LoginScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LandingScreen from "./screens/LandingScreen";
import OrdersScreen from "./screens/OrdersScreen";
import OrderDetailScreen from "./screens/OrderDetailScreen";
import InquiriesScreen from "./screens/InquiriesScreen";
import PaymentScreen from "./screens/PaymentScreen";
import PaymentLogsScreen from "./screens/PaymentLogsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import PasswordSecurityScreen from "./screens/PasswordSecurityScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import OtpScreen from "./screens/OtpScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import { COLORS } from "./theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "CatalogTab") {
            iconName = "grid-outline";
          } else if (route.name === "OrdersTab") {
            iconName = "receipt-outline";
          } else if (route.name === "PaymentsTab") {
            iconName = "card-outline";
          } else if (route.name === "InquiriesTab") {
            iconName = "chatbubbles-outline";
          } else if (route.name === "CartTab") {
            iconName = "cart-outline";
          } else if (route.name === "ProfileTab") {
            iconName = "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.accentCyan,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopColor: COLORS.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerStyle: { backgroundColor: COLORS.primaryDark },
        headerTintColor: COLORS.textLight,
        headerTitleStyle: { fontWeight: "800", fontSize: 16 },
      })}
    >
      <Tab.Screen
        name="CatalogTab"
        component={CatalogScreen}
        options={{ title: "Catalog" }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{ title: "Orders" }}
      />
      <Tab.Screen
        name="InquiriesTab"
        component={InquiriesScreen}
        options={{ title: "Inquiries" }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{ title: "Cart" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentLogsScreen}
        options={{ title: "Payments" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        setInitialRoute("Main");
      } else {
        setInitialRoute("Landing");
      }
    } catch (err) {
      console.error("[checkAuth] {ReadStorage}: " + err.message);
      setInitialRoute("Landing");
    }
  };

  if (!initialRoute) {
    return (
      <View
        style={{
          flex: 1,
          justify: "center",
          alignItems: "center",
          backgroundColor: COLORS.primaryDark,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primaryDark },
          headerTintColor: COLORS.textLight,
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: "Order Details" }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: "Product Details" }}
        />
        <Stack.Screen
          name="CustomizerWebView"
          component={CustomizerWebViewScreen}
          options={{ title: "3D Customizer" }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: "Mobile Checkout" }}
        />
        <Stack.Screen
          name="PaymentLogs"
          component={PaymentLogsScreen}
          options={{ title: "Payments" }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Sign In" }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ title: "Edit Profile" }}
        />
        <Stack.Screen
          name="PasswordSecurity"
          component={PasswordSecurityScreen}
          options={{ title: "Passwords & Security" }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Create Account" }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: "Forgot Password" }}
        />
        <Stack.Screen
          name="Otp"
          component={OtpScreen}
          options={{ title: "Verify OTP" }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: "Reset Password" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
