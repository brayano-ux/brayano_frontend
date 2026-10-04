import { Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './features/auth/LoginPage';
import OverviewPage from './features/overview/OverviewPage';
import InboxPage from './features/inbox/InboxPage';
import AgentPage from './features/agent/AgentPage';
import SettingsPage from './features/settings/SettingsPage';
import WhatsAppPage from './features/whatsapp/WhatsAppPage';

export const routes = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'agent', element: <AgentPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'whatsapp', element: <WhatsAppPage /> },
    ],
  },
];
