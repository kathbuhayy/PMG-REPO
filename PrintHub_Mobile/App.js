import React, { useState, useEffect } from "react";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import {
  Ionicons,
} from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ActivityIndicator,
  View,
} from "react-native";

// ============================================================
// SCREENS
// ============================================================

import CatalogScreen from "./screens/CatalogScreen";
import ProductOverview from "./screens/ProductOverview";
import ProductDetailScreen from "./screens/ProductDetailScreen";

import CustomizerWebViewScreen
  from "./screens/CustomizerWebViewScreen";

import CartScreen from "./screens/CartScreen";
import LoginScreen from "./screens/LoginScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LandingScreen from "./screens/LandingScreen";
import OrdersScreen from "./screens/OrdersScreen";
import OrderDetailScreen from "./screens/OrderDetailScreen";
import InquiriesScreen from "./screens/InquiriesScreen";
import PaymentScreen from "./screens/PaymentScreen";
import PaymentLogsScreen from "./screens/PaymentLogsScreen";
import ChatbotScreen from "./screens/ChatbotScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import PasswordSecurityScreen from "./screens/PasswordSecurityScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import OtpScreen from "./screens/OtpScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";

import { COLORS } from "./theme";

// ============================================================
// NAVIGATORS
// ============================================================

const Stack =
  createNativeStackNavigator();

const Tab =
  createBottomTabNavigator();

// ============================================================
// TAB NAVIGATOR
//
// IMPORTANT:
// The real React Navigation tab bar is completely hidden.
// CatalogScreen and ProductOverview have their own custom
// bottom navigation when needed.
// ============================================================

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="CatalogTab"
      screenOptions={{
        headerShown: false,

        // ====================================================
        // HIDE DEFAULT REACT NAVIGATION BAR
        // ====================================================

        tabBarStyle: {
          display: "none",
        },

        tabBarShowLabel: false,

        tabBarActiveTintColor:
          COLORS.primary,

        tabBarInactiveTintColor:
          COLORS.textMuted,
      }}
    >

      {/* ======================================================
          HOME
      ====================================================== */}

      <Tab.Screen
        name="CatalogTab"
        component={CatalogScreen}
        options={{
          title: "Catalog",
        }}
      />

      {/* ======================================================
          ORDERS
      ====================================================== */}

      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          title: "Orders",
        }}
      />

      {/* ======================================================
          INQUIRIES
      ====================================================== */}

      <Tab.Screen
        name="InquiriesTab"
        component={InquiriesScreen}
        options={{
          title: "Inquiries",
        }}
      />

      {/* ======================================================
          AI CHAT
      ====================================================== */}

      <Tab.Screen
        name="ChatbotTab"
        component={ChatbotScreen}
        options={{
          title: "AI Chat",
        }}
      />

      {/* ======================================================
          CART
      ====================================================== */}

      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          title: "Cart",
        }}
      />

      {/* ======================================================
          PROFILE
      ====================================================== */}

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />

      {/* ======================================================
          PAYMENTS
      ====================================================== */}

      <Tab.Screen
        name="PaymentsTab"
        component={PaymentLogsScreen}
        options={{
          title: "Payments",
        }}
      />

    </Tab.Navigator>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {

  const [
    initialRoute,
    setInitialRoute,
  ] = useState(null);

  // ==========================================================
  // AUTH CHECK
  // ==========================================================

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {

    try {

      const savedUser =
        await AsyncStorage.getItem(
          "user"
        );

      if (savedUser) {

        setInitialRoute(
          "Main"
        );

      } else {

        setInitialRoute(
          "Landing"
        );

      }

    } catch (error) {

      console.error(
        "[checkAuth]",
        error?.message || error
      );

      setInitialRoute(
        "Landing"
      );
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!initialRoute) {

    return (
      <View
        style={{
          flex: 1,

          justifyContent:
            "center",

          alignItems:
            "center",

          backgroundColor:
            COLORS.backgroundDeep,
        }}
      >

        <View
          style={{
            width: 72,
            height: 72,

            borderRadius: 22,

            backgroundColor:
              COLORS.primary,

            justifyContent:
              "center",

            alignItems:
              "center",

            marginBottom: 20,
          }}
        >

          <Ionicons
            name="print"
            size={34}
            color={
              COLORS.textDark
            }
          />

        </View>

        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />

      </View>
    );
  }

  // ==========================================================
  // ROOT NAVIGATION
  // ==========================================================

  return (
    <NavigationContainer>

      <Stack.Navigator
        initialRouteName={
          initialRoute
        }
        screenOptions={{
          headerStyle: {
            backgroundColor:
              COLORS.backgroundDeep,
          },

          headerTintColor:
            COLORS.textPrimary,

          headerTitleStyle: {
            fontWeight: "800",
            color:
              COLORS.textPrimary,
          },

          headerTitleAlign:
            "center",

          headerShadowVisible:
            false,

          headerBackTitleVisible:
            false,
        }}
      >

        {/* ====================================================
            LANDING
        ==================================================== */}

        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            MAIN
        ==================================================== */}

        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            PRODUCT OVERVIEW
        ==================================================== */}

        <Stack.Screen
          name="ProductOverview"
          component={ProductOverview}
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            PRODUCT DETAILS

            IMPORTANT:
            ProductDetailScreen already has its own custom
            Product Details header.

            Therefore React Navigation's header is disabled here.
            This prevents the Product Details header from appearing
            twice.
        ==================================================== */}

        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            ORDER DETAILS
        ==================================================== */}

        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{
            title:
              "Order Details",
          }}
        />

        {/* ====================================================
            CUSTOMIZER
        ==================================================== */}

        <Stack.Screen
          name="CustomizerWebView"
          component={
            CustomizerWebViewScreen
          }
          options={{
            title:
              "3D Customizer",
          }}
        />

        {/* ====================================================
            PAYMENT
        ==================================================== */}

        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            title:
              "Mobile Checkout",
          }}
        />

        {/* ====================================================
            PAYMENT LOGS
        ==================================================== */}

        <Stack.Screen
          name="PaymentLogs"
          component={
            PaymentLogsScreen
          }
          options={{
            title:
              "Payments",
          }}
        />

        {/* ====================================================
            LOGIN
        ==================================================== */}

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title:
              "Sign In",
          }}
        />

        {/* ====================================================
            EDIT PROFILE
        ==================================================== */}

        <Stack.Screen
          name="EditProfile"
          component={
            EditProfileScreen
          }
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            PASSWORD SECURITY
        ==================================================== */}

        <Stack.Screen
          name="PasswordSecurity"
          component={
            PasswordSecurityScreen
          }
          options={{
            headerShown: false,
          }}
        />

        {/* ====================================================
            REGISTER
        ==================================================== */}

        <Stack.Screen
          name="Register"
          component={
            RegisterScreen
          }
          options={{
            title:
              "Create Account",
          }}
        />

        {/* ====================================================
            FORGOT PASSWORD
        ==================================================== */}

        <Stack.Screen
          name="ForgotPassword"
          component={
            ForgotPasswordScreen
          }
          options={{
            title:
              "Forgot Password",
          }}
        />

        {/* ====================================================
            OTP
        ==================================================== */}

        <Stack.Screen
          name="Otp"
          component={OtpScreen}
          options={{
            title:
              "Verify OTP",
          }}
        />

        {/* ====================================================
            RESET PASSWORD
        ==================================================== */}

        <Stack.Screen
          name="ResetPassword"
          component={
            ResetPasswordScreen
          }
          options={{
            title:
              "Reset Password",
          }}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}