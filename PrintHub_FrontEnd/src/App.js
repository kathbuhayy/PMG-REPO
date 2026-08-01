import "./App.css";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import MobileFooterNav from "./components/MobileFooterNav";
import Header from "./components/Header";
import PrintHubChatbot from "./components/PrintHubChatbot";
import SplashScreen from "./components/SplashScreen";
import { ProtectedCustomerRoute } from "./guards/CustomerGuards";
import {
  isRealtimeValidatedField,
  getRealtimeValidationMessage,
  renderRealtimeValidation,
} from "./utils/appUtils";
import {
  ProtectedAdminRoute,
  AdminLoginRegisterGuard,
} from "./guards/AdminGuards";

// Customer page lazy imports
const UserLoginPage = lazy(() =>
  import("./Customer/User-login")
);
const UserRegistrationPage = lazy(() =>
  import("./Customer/User-regis")
);
const UserHomePage = lazy(() =>
  import("./Customer/User-home")
);
const UserOtpPage = lazy(() =>
  import("./Customer/User-otp")
);
const CustomerDashboard = lazy(() =>
  import("./Customer/User-dashboard")
);
const UserForgotOtpPage = lazy(() =>
  import("./Customer/User-forgot-otp")
);
const UserResetPasswordPage = lazy(() =>
  import("./Customer/User-reset-password")
);
const ProductOverview = lazy(() =>
  import("./Customer/Product-overview")
);
const UserCustomizeProfile = lazy(() =>
  import("./Customer/User-customize-profile")
);
const UserAccountSettings = lazy(() =>
  import("./Customer/User-account-settings")
);
const UserCartPage = lazy(() =>
  import("./Customer/User-cart")
);
const UserOrders = lazy(() =>
  import("./Customer/User-orders")
);
const UserPaymentReturn = lazy(() =>
  import("./Customer/User-payment-return")
);
const UserPayments = lazy(() =>
  import("./Customer/User-payments")
);
const UserInquiries = lazy(() =>
  import("./Customer/User-inquiries")
);
const UserPasswordSecurityPage = lazy(() =>
  import("./Customer/User-password-security")
);
const ProductDetail = lazy(() =>
  import("./Customer/Product-detail")
);
const HomePage = lazy(() =>
  import("./Customer/HomePage")
);

const CUSTOMER_ONLY_BUILD = process.env.REACT_APP_CUSTOMER_ONLY === "true";
const AdminLoginPage = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-login"));
const AdminRegistrationPage = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-registration"));
const AdminDashboard = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-dashboard"));
const AdminManageAccounts = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-manageacc"));

const RECENTLY_VIEWED_KEY = "printhub_recently_viewed_products";
const fallbackProductImage = "https://via.placeholder.com/300x200?text=No+Image";
const homeHeroWords = ["Vision", "Packaging", "Merch", "Marketing"];

function RealtimeInputValidation() {
  useEffect(() => {
    const validateFromEvent = (event, forceTouched = false) => {
      renderRealtimeValidation(event.target, forceTouched);
      if (event.target?.type === "password") {
        const form = event.target.form || event.target.closest("form");
        form
          ?.querySelectorAll('input[type="password"]')
          .forEach((field) => renderRealtimeValidation(field));
      }
    };

    const handleInput = (event) => validateFromEvent(event);
    const handleChange = (event) => validateFromEvent(event, true);
    const handleBlur = (event) => validateFromEvent(event, true);
    const handleSubmit = (event) => {
      const fields = Array.from(
        event.target.querySelectorAll("input, textarea, select")
      ).filter(isRealtimeValidatedField);
      fields.forEach((field) => renderRealtimeValidation(field, true));
      if (fields.some((field) => getRealtimeValidationMessage(field))) {
        event.preventDefault();
        fields.find((field) => getRealtimeValidationMessage(field))?.focus();
      }
    };

    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("blur", handleBlur, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleChange, true);
      document.removeEventListener("blur", handleBlur, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}

function AnimatedWords({ text, highlight = "" }) {
  return (
    <>
      {text.split(" ").map((word, index) => {
        const cleanWord = word.replace(/[!.,]/g, "");
        const isHighlight = cleanWord.toLowerCase() === highlight.toLowerCase();
        return (
          <span
            className={`kinetic-word ${isHighlight ? "kinetic-highlight" : ""}`}
            key={`${word}-${index}`}
            style={{ "--word-delay": `${index * 0.075}s` }}
          >
            {word}
          </span>
        );
      })}
    </>
  );
}

// Routes where the mobile footer nav should appear
const CUSTOMER_ROUTES = [
  "/user-home",
  "/user-cart",
  "/user-orders",
  "/user-payments",
  "/user-inquiries",
  "/user-dashboard",
  "/user-customize-profile",
  "/user-account-settings",
  "/user-password-security",
  "/product-overview",
  "/payment/return",
];

// Routes where top header should be rendered consistently
const SHOW_HEADER_ROUTES = ["/", ...CUSTOMER_ROUTES];

const isCustomerApk = () =>
  CUSTOMER_ONLY_BUILD || Capacitor.isNativePlatform();

function CustomerOnlyRedirect() {
  return <Navigate to="/user-home" replace />;
}

function CustomerApkBodyClass() {
  useEffect(() => {
    if (!isCustomerApk()) return undefined;

    document.documentElement.classList.add("printhub-native-app");
    document.body.classList.add("printhub-native-app");

    return () => {
      document.documentElement.classList.remove("printhub-native-app");
      document.body.classList.remove("printhub-native-app");
    };
  }, []);

  return null;
}

function WebOnly({ children }) {
  if (isCustomerApk()) {
    return <CustomerOnlyRedirect />;
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}

function RootRouteGuard() {
  if (isCustomerApk()) {
    return <CustomerOnlyRedirect />;
  }
  
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.role === "customer") {
        return <Navigate to="/user-home" replace />;
      }
    } catch (e) {
      // invalid JSON, ignore
    }
  }
  
  return <HomePage />;
}

function AppRoutes() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = searchParams.get("embed") === "true";
  const customerApk = isCustomerApk();
  const currentPath = location.pathname.toLowerCase();
  const showHeader =
    !isEmbed &&
    (SHOW_HEADER_ROUTES.some((r) => r.toLowerCase() === currentPath) ||
      currentPath.startsWith("/product/"));
  const showFooterNav =
    !isEmbed &&
    CUSTOMER_ROUTES.some((r) => r.toLowerCase() === currentPath);

  return (
    <div className="app-main-layout">
      {showHeader && <Header />}
      <div className="app-content-scrollable">
        <Suspense
          fallback={
            <div className="route-loading" style={{ padding: "20px" }}>
              Loading...
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={<RootRouteGuard />}
            />

            <Route
              path="/admin-login"
              element={
                <WebOnly>
                  <AdminLoginRegisterGuard>
                    <AdminLoginPage />
                  </AdminLoginRegisterGuard>
                </WebOnly>
              }
            />
            <Route
              path="/admin-register"
              element={
                <WebOnly>
                  <AdminLoginRegisterGuard>
                    <AdminRegistrationPage />
                  </AdminLoginRegisterGuard>
                </WebOnly>
              }
            />
            <Route
              path="/admin/:tab"
              element={
                <WebOnly>
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                </WebOnly>
              }
            />
            <Route
              path="/admin-dashboard"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin-manageaccount"
              element={<Navigate to="/admin/manageaccount" replace />}
            />
            <Route path="/user-login" element={<UserLoginPage />} />
            <Route path="/user-register" element={<UserRegistrationPage />} />
            <Route path="/user-forgot-otp" element={<UserForgotOtpPage />} />
            <Route
              path="/user-reset-password"
              element={<UserResetPasswordPage />}
            />
            <Route path="/user-otp" element={<UserOtpPage />} />
            <Route path="/user-home" element={<UserHomePage />} />
            <Route
              path="/user-password-security"
              element={
                <ProtectedCustomerRoute>
                  <UserPasswordSecurityPage />
                </ProtectedCustomerRoute>
              }
            />
            <Route path="/user-cart" element={<UserCartPage />} />
            <Route
              path="/user-orders"
              element={
                <ProtectedCustomerRoute>
                  <UserOrders />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/user-payments"
              element={
                <ProtectedCustomerRoute>
                  <UserPayments />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/payment/return"
              element={
                <ProtectedCustomerRoute>
                  <UserPaymentReturn />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/user-inquiries"
              element={
                <ProtectedCustomerRoute>
                  <UserInquiries />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/user-dashboard"
              element={
                <ProtectedCustomerRoute>
                  <CustomerDashboard />
                </ProtectedCustomerRoute>
              }
            />
            <Route path="/product-overview" element={<ProductOverview />} />
            <Route
              path="/user-customize-profile"
              element={
                <ProtectedCustomerRoute>
                  <UserCustomizeProfile />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/user-account-settings"
              element={
                <ProtectedCustomerRoute>
                  <UserAccountSettings />
                </ProtectedCustomerRoute>
              }
            />
            <Route path="/product/:id" element={<ProductDetail />} />
            {customerApk && (
              <Route path="*" element={<CustomerOnlyRedirect />} />
            )}
          </Routes>
        </Suspense>
      </div>
      {showFooterNav && <MobileFooterNav />}
      <ChatbotRouteGate />
    </div>
  );
}

function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listener;
    const setupListener = async () => {
      listener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
        if (!url) return;

        try {
          const parsedUrl = new URL(url);
          const path =
            parsedUrl.pathname ||
            (parsedUrl.host ? `/${parsedUrl.host}` : "/");
          const target = `${path}${parsedUrl.search || ""}`;

          if (target.startsWith("/payment/return")) {
            navigate(target, { replace: true });
          }
        } catch (error) {
          console.warn("Unable to handle app URL:", url, error);
        }
      });
    };

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [navigate]);

  return null;
}

function ChatbotRouteGate() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = searchParams.get("embed") === "true";
  const hiddenRoutes = [
    "/user-login",
    "/user-register",
    "/user-otp",
    "/user-forgot-otp",
  ];

  if (isEmbed || hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  return <PrintHubChatbot />;
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem("pmg_splash_seen") !== "true";
    } catch {
      return true;
    }
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem("pmg_splash_seen", "true");
    } catch {
      // Splash state is cosmetic only.
    }
  };

  return (
    <CartProvider>
      <BrowserRouter>
        <RealtimeInputValidation />
        <CustomerApkBodyClass />
        <NativeDeepLinkHandler />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <AppRoutes />
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
