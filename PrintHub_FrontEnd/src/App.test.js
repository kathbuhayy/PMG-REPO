import { render, screen } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }) => children,
    Routes: ({ children }) => children,
    Route: () => null,
    Navigate: () => null,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/' }),
  }),
  { virtual: true },
);

jest.mock('./contexts/CartContext', () => {
  const React = require('react');
  const CartContext = React.createContext({
    cartItems: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    refreshCart: jest.fn(),
  });
  return {
    CartProvider: ({ children }) => children,
    CartContext,
  };
});

jest.mock('./components/PrintHubChatbot', () => () => null);

jest.mock('./Admin/Admin-login', () => () => null);
jest.mock('./Admin/Admin-registration', () => () => null);
jest.mock('./Admin/Admin-dashboard', () => () => null);
jest.mock('./Admin/Admin-manageacc', () => () => null);

jest.mock('./Customer/User-login', () => () => null);
jest.mock('./Customer/User-regis', () => () => null);
jest.mock('./Customer/User-home', () => () => null);
jest.mock('./Customer/User-otp', () => () => null);
jest.mock('./Customer/User-dashboard', () => () => null);
jest.mock('./Customer/User-forgot-otp', () => () => null);
jest.mock('./Customer/User-reset-password', () => () => null);
jest.mock('./Customer/Product-overview', () => () => null);
jest.mock('./Customer/User-customize-profile', () => () => null);
jest.mock('./Customer/User-account-settings', () => () => null);
jest.mock('./Customer/User-cart', () => () => null);
jest.mock('./Customer/User-orders', () => () => null);
jest.mock('./Customer/User-payment-return', () => () => null);
jest.mock('./Customer/User-payments', () => () => null);
jest.mock('./Customer/User-inquiries', () => () => null);
jest.mock('./Customer/User-password-security', () => () => null);
jest.mock('./Customer/Product-detail', () => () => null);

jest.mock('./config/api', () => ({
  buildApiUrl: () => '/api/products?limit=8',
}));

import App from './App';

test('renders PMG splash content on initial load', () => {
  sessionStorage.removeItem('pmg_splash_seen');
  render(<App />);
  expect(screen.getByText(/PMG PRINTING/i)).toBeInTheDocument();
});

test('skips PMG splash content when session storage flag exists', () => {
  sessionStorage.setItem('pmg_splash_seen', 'true');
  render(<App />);
  expect(screen.queryByText(/PMG PRINTING/i)).toBeNull();
});

