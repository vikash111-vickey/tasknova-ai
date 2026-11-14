import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Skeleton } from './components/ui/Skeleton';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy-loaded pages with page transitions
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'));
const WorkflowBuilderPage = lazy(() => import('./pages/WorkflowBuilderPage'));
const ScheduledTasksPage = lazy(() => import('./pages/ScheduledTasksPage'));
const ExecutionsPage = lazy(() => import('./pages/ExecutionsPage'));
const ExecutionWorkspacePage = lazy(() => import('./pages/ExecutionWorkspacePage'));
const BrainPage = lazy(() => import('./pages/BrainPage'));
const ConnectorsPage = lazy(() => import('./pages/ConnectorsPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageFallback: React.FC = () => (
  <div className="space-y-6 max-w-5xl mx-auto py-8">
    <Skeleton className="h-10 w-64 rounded-xl" />
    <Skeleton className="h-5 w-96 rounded-lg" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
    <Skeleton className="h-72 rounded-2xl" />
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LandingPage />
                  </Suspense>
                }
              />
              <Route
                path="login"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LoginPage />
                  </Suspense>
                }
              />
              <Route
                path="register"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <RegisterPage />
                  </Suspense>
                }
              />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="workflows"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <WorkflowsPage />
                  </Suspense>
                }
              />
              <Route
                path="workflow-builder"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <WorkflowBuilderPage />
                  </Suspense>
                }
              />
              <Route
                path="scheduled-tasks"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ScheduledTasksPage />
                  </Suspense>
                }
              />
              <Route
                path="executions"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ExecutionsPage />
                  </Suspense>
                }
              />
              <Route
                path="tasks/:id/execute"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ExecutionWorkspacePage />
                  </Suspense>
                }
              />
              <Route
                path="tasks/:id"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ExecutionWorkspacePage />
                  </Suspense>
                }
              />
              <Route
                path="executions/:id"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ExecutionWorkspacePage />
                  </Suspense>
                }
              />
              <Route
                path="tasks"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="brain"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <BrainPage />
                  </Suspense>
                }
              />
              <Route
                path="connectors"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ConnectorsPage />
                  </Suspense>
                }
              />
              <Route
                path="integrations"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ConnectorsPage />
                  </Suspense>
                }
              />
              <Route
                path="store"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <StorePage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ReportsPage />
                  </Suspense>
                }
              />
              <Route
                path="logs"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LogsPage />
                  </Suspense>
                }
              />
              <Route
                path="activity-logs"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LogsPage />
                  </Suspense>
                }
              />
              <Route
                path="notifications"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <NotificationsPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  </Suspense>
                }
              />
              <Route
                path="about"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <AboutPage />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </ErrorBoundary>
);
};

export default App;
