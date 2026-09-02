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

/* =========================================================
   CUSTOMER PAGE LAZY IMPORTS
   ========================================================= */

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

/* =========================================================
   NEW ABOUT PAGE
   ========================================================= */

const AboutPage = lazy(() =>
  import("./Customer/About")
);

/* =========================================================
   NEW CONTACT PAGE
   ========================================================= */

const ContactPage = lazy(() =>
  import("./Customer/Contact")
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

/* =========================================================
   ADMIN
   ========================================================= */

const CUSTOMER_ONLY_BUILD =
  process.env.REACT_APP_CUSTOMER_ONLY === "true";

const AdminLoginPage = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-login"));

const AdminRegistrationPage = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-registration"));

const AdminDashboard = CUSTOMER_ONLY_BUILD
  ? CustomerOnlyRedirect
  : lazy(() => import("./Admin/Admin-dashboard"));

/* =========================================================
   REALTIME INPUT VALIDATION
   ========================================================= */

   function RealtimeInputValidation() {
    useEffect(() => {
      const isContactForm = (target) => {
        return target?.closest?.(".contact-form-card");
      };
  
      const validateFromEvent = (
        event,
        forceTouched = false
      ) => {
        // IMPORTANT:
        // Contact page has its own validation.
        // Do not let the global validator touch it.
        if (isContactForm(event.target)) {
          return;
        }
  
        renderRealtimeValidation(
          event.target,
          forceTouched
        );
  
        if (event.target?.type === "password") {
          const form =
            event.target.form ||
            event.target.closest("form");
  
          form
            ?.querySelectorAll(
              'input[type="password"]'
            )
            .forEach((field) =>
              renderRealtimeValidation(field)
            );
        }
      };
  
      const handleInput = (event) =>
        validateFromEvent(event);
  
      const handleChange = (event) =>
        validateFromEvent(event, true);
  
      const handleBlur = (event) =>
        validateFromEvent(event, true);
  
      const handleSubmit = (event) => {
        // IMPORTANT:
        // Let Contact.js handle its own form validation.
        if (isContactForm(event.target)) {
          return;
        }
  
        const fields = Array.from(
          event.target.querySelectorAll(
            "input, textarea, select"
          )
        ).filter(isRealtimeValidatedField);
  
        fields.forEach((field) =>
          renderRealtimeValidation(field, true)
        );
  
        if (
          fields.some((field) =>
            getRealtimeValidationMessage(field)
          )
        ) {
          event.preventDefault();
  
          fields
            .find((field) =>
              getRealtimeValidationMessage(field)
            )
            ?.focus();
        }
      };
  
      document.addEventListener(
        "input",
        handleInput,
        true
      );
  
      document.addEventListener(
        "change",
        handleChange,
        true
      );
  
      document.addEventListener(
        "blur",
        handleBlur,
        true
      );
  
      document.addEventListener(
        "submit",
        handleSubmit,
        true
      );
  
      return () => {
        document.removeEventListener(
          "input",
          handleInput,
          true
        );
  
        document.removeEventListener(
          "change",
          handleChange,
          true
        );
  
        document.removeEventListener(
          "blur",
          handleBlur,
          true
        );
  
        document.removeEventListener(
          "submit",
          handleSubmit,
          true
        );
      };
    }, []);
  
    return null;
  }

/* =========================================================
   ROUTES WHERE MOBILE FOOTER NAV SHOULD APPEAR
   ========================================================= */

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

/* =========================================================
   ROUTES WHERE TOP HEADER SHOULD BE RENDERED
   ========================================================= */

/*
   Added:
   /about
   /contact
*/

const SHOW_HEADER_ROUTES = [
  "/",
  "/about",
  "/contact",
  ...CUSTOMER_ROUTES,
];

/* =========================================================
   CUSTOMER APK
   ========================================================= */

const isCustomerApk = () =>
  CUSTOMER_ONLY_BUILD ||
  Capacitor.isNativePlatform();

/* =========================================================
   CUSTOMER ONLY REDIRECT
   ========================================================= */

function CustomerOnlyRedirect() {
  return (
    <Navigate
      to="/user-home"
      replace
    />
  );
}

/* =========================================================
   CUSTOMER APK BODY CLASS
   ========================================================= */

function CustomerApkBodyClass() {
  useEffect(() => {
    if (!isCustomerApk()) return undefined;

    document.documentElement.classList.add(
      "printhub-native-app"
    );

    document.body.classList.add(
      "printhub-native-app"
    );

    return () => {
      document.documentElement.classList.remove(
        "printhub-native-app"
      );

      document.body.classList.remove(
        "printhub-native-app"
      );
    };
  }, []);

  return null;
}

/* =========================================================
   WEB ONLY
   ========================================================= */

function WebOnly({ children }) {
  if (isCustomerApk()) {
    return <CustomerOnlyRedirect />;
  }

  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
}

/* =========================================================
   ROOT ROUTE GUARD
   ========================================================= */

function RootRouteGuard() {
  const location = useLocation();

  if (isCustomerApk()) {
    return <CustomerOnlyRedirect />;
  }

  /*
     Keep the old landing-page section behavior
     for any existing links that still use scrollTo.
  */

  if (location.state?.scrollTo) {
    return <HomePage />;
  }

  const userStr =
    localStorage.getItem("user");

  if (userStr) {
    try {
      const user = JSON.parse(userStr);

      if (
        user &&
        user.role === "customer"
      ) {
        return (
          <Navigate
            to="/user-home"
            replace
          />
        );
      }
    } catch (e) {
      // Invalid JSON, ignore.
    }
  }

  return <HomePage />;
}

/* =========================================================
   APP ROUTES
   ========================================================= */

function AppRoutes() {
  const location = useLocation();

  const searchParams =
    new URLSearchParams(
      location.search
    );

  const isEmbed =
    searchParams.get("embed") === "true";

  const customerApk =
    isCustomerApk();

  const currentPath =
    location.pathname.toLowerCase();

  /* =======================================================
     EMBED MODE
     ======================================================= */

  useEffect(() => {
    document.body.classList.toggle(
      "embed-mode",
      isEmbed
    );

    return () => {
      document.body.classList.remove(
        "embed-mode"
      );
    };
  }, [isEmbed]);

  /* =======================================================
     HEADER VISIBILITY
     ======================================================= */

  const showHeader =
    !isEmbed &&
    (
      SHOW_HEADER_ROUTES.some(
        (r) =>
          r.toLowerCase() ===
          currentPath
      ) ||
      currentPath.startsWith(
        "/product/"
      )
    );

  /* =======================================================
     MOBILE FOOTER VISIBILITY
     ======================================================= */

  const showFooterNav =
    !isEmbed &&
    CUSTOMER_ROUTES.some(
      (r) =>
        r.toLowerCase() ===
        currentPath
    );

  return (
    <div className="app-main-layout">

      {/* =================================================
          TOP HEADER
          ================================================= */}

      {showHeader && <Header />}

      {/* =================================================
          PAGE CONTENT
          ================================================= */}

      <div className="app-content-scrollable">

        <Suspense
          fallback={
            <div
              className="route-loading"
              style={{
                padding: "20px",
              }}
            >
              Loading...
            </div>
          }
        >

          <Routes>

            {/* =================================================
                HOME
                ================================================= */}

            <Route
              path="/"
              element={
                <RootRouteGuard />
              }
            />

            {/* =================================================
                ADMIN LOGIN
                ================================================= */}

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

            {/* =================================================
                ADMIN REGISTER
                ================================================= */}

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

            {/* =================================================
                ADMIN DASHBOARD
                ================================================= */}

            <Route
              path="/admin/profile/edit"
              element={
                <WebOnly>
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
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

            {/* =================================================
                ADMIN REDIRECTS
                ================================================= */}

            <Route
              path="/admin-dashboard"
              element={
                <Navigate
                  to="/admin/dashboard"
                  replace
                />
              }
            />

            <Route
              path="/admin-manageaccount"
              element={
                <Navigate
                  to="/admin/manageaccount"
                  replace
                />
              }
            />

            {/* =================================================
                CUSTOMER AUTH
                ================================================= */}

            <Route
              path="/user-login"
              element={
                <UserLoginPage />
              }
            />

            <Route
              path="/user-register"
              element={
                <UserRegistrationPage />
              }
            />

            <Route
              path="/user-forgot-otp"
              element={
                <UserForgotOtpPage />
              }
            />

            <Route
              path="/user-reset-password"
              element={
                <UserResetPasswordPage />
              }
            />

            <Route
              path="/user-otp"
              element={
                <UserOtpPage />
              }
            />

            {/* =================================================
                CUSTOMER HOME
                ================================================= */}

            <Route
              path="/user-home"
              element={
                <UserHomePage />
              }
            />

            {/* =================================================
                CUSTOMER PASSWORD
                ================================================= */}

            <Route
              path="/user-password-security"
              element={
                <ProtectedCustomerRoute>
                  <UserPasswordSecurityPage />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                CUSTOMER CART
                ================================================= */}

            <Route
              path="/user-cart"
              element={
                <UserCartPage />
              }
            />

            {/* =================================================
                CUSTOMER ORDERS
                ================================================= */}

            <Route
              path="/user-orders"
              element={
                <ProtectedCustomerRoute>
                  <UserOrders />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                CUSTOMER PAYMENTS
                ================================================= */}

            <Route
              path="/user-payments"
              element={
                <ProtectedCustomerRoute>
                  <UserPayments />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                PAYMENT RETURN
                ================================================= */}

            <Route
              path="/payment/return"
              element={
                <ProtectedCustomerRoute>
                  <UserPaymentReturn />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                CUSTOMER INQUIRIES
                ================================================= */}

            <Route
              path="/user-inquiries"
              element={
                <ProtectedCustomerRoute>
                  <UserInquiries />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                CUSTOMER DASHBOARD
                ================================================= */}

            <Route
              path="/user-dashboard"
              element={
                <ProtectedCustomerRoute>
                  <CustomerDashboard />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                PRODUCTS
                ================================================= */}

            <Route
              path="/product-overview"
              element={
                <ProductOverview />
              }
            />

            {/* =================================================
                ABOUT PAGE
                ================================================= */}

            <Route
              path="/about"
              element={
                <AboutPage />
              }
            />

            {/* =================================================
                CONTACT PAGE
                ================================================= */}

            <Route
              path="/contact"
              element={
                <ContactPage />
              }
            />

            {/* =================================================
                CUSTOMIZE PROFILE
                ================================================= */}

            <Route
              path="/user-customize-profile"
              element={
                <ProtectedCustomerRoute>
                  <UserCustomizeProfile />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                ACCOUNT SETTINGS
                ================================================= */}

            <Route
              path="/user-account-settings"
              element={
                <ProtectedCustomerRoute>
                  <UserAccountSettings />
                </ProtectedCustomerRoute>
              }
            />

            {/* =================================================
                PRODUCT DETAIL
                ================================================= */}

            <Route
              path="/product/:id"
              element={
                <ProductDetail
                  key="product-detail-view"
                />
              }
            />

            {/* =================================================
                PRODUCT CUSTOMIZER
                ================================================= */}

            <Route
              path="/product/:id/customize"
              element={
                <ProductDetail
                  key="product-customizer-view"
                />
              }
            />

            {/* =================================================
                CUSTOMER APK FALLBACK
                ================================================= */}

            {customerApk && (
              <Route
                path="*"
                element={
                  <CustomerOnlyRedirect />
                }
              />
            )}

          </Routes>

        </Suspense>
      </div>

      {/* =====================================================
          MOBILE FOOTER
          ===================================================== */}

      {showFooterNav && (
        <MobileFooterNav />
      )}

      {/* =====================================================
          CHATBOT
          ===================================================== */}

      <ChatbotRouteGate />

    </div>
  );
}

/* =========================================================
   NATIVE DEEP LINK HANDLER
   ========================================================= */

function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform()
    ) {
      return undefined;
    }

    let listener;

    const setupListener =
      async () => {
        listener =
          await CapacitorApp.addListener(
            "appUrlOpen",
            ({ url }) => {
              if (!url) return;

              try {
                const parsedUrl =
                  new URL(url);

                const path =
                  parsedUrl.pathname ||
                  (
                    parsedUrl.host
                      ? `/${parsedUrl.host}`
                      : "/"
                  );

                const target =
                  `${path}${
                    parsedUrl.search || ""
                  }`;

                if (
                  target.startsWith(
                    "/payment/return"
                  )
                ) {
                  navigate(
                    target,
                    {
                      replace: true,
                    }
                  );
                }
              } catch (error) {
                console.warn(
                  "Unable to handle app URL:",
                  url,
                  error
                );
              }
            }
          );
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

/* =========================================================
   CHATBOT ROUTE GATE
   ========================================================= */

function ChatbotRouteGate() {
  const location =
    useLocation();

  const searchParams =
    new URLSearchParams(
      location.search
    );

  const isEmbed =
    searchParams.get("embed") === "true";

  const hiddenRoutes = [
    "/user-login",
    "/user-register",
    "/user-otp",
    "/user-forgot-otp",
  ];

  const isAdminRoute =
    location.pathname.startsWith(
      "/admin"
    );

  if (
    isEmbed ||
    isAdminRoute ||
    hiddenRoutes.includes(
      location.pathname
    )
  ) {
    return null;
  }

  return <PrintHubChatbot />;
}

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  const [showSplash, setShowSplash] =
    useState(() => {
      try {
        return (
          sessionStorage.getItem(
            "pmg_splash_seen"
          ) !== "true"
        );
      } catch {
        return true;
      }
    });

  const handleSplashComplete =
    () => {
      setShowSplash(false);

      try {
        sessionStorage.setItem(
          "pmg_splash_seen",
          "true"
        );
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

        {showSplash && (
          <SplashScreen
            onComplete={
              handleSplashComplete
            }
          />
        )}

        <AppRoutes />

      </BrowserRouter>

    </CartProvider>
  );
}

export default App;