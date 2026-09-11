/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DriveWiseProvider, useDriveWise } from './context/DriveWiseContext';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { JourneyView } from './components/JourneyView';
import { ReportsView } from './components/ReportsView';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { ExpenseModal } from './components/ExpenseModal';
import { FuelModal } from './components/FuelModal';
import { CopilotHubView } from './components/copilot/CopilotHubView';
import { RideAnalysisModal } from './components/copilot/RideAnalysisModal';
import { FloatingCopilotOverlay } from './components/copilot/FloatingCopilotOverlay';
import { DrivingSafeMode } from './components/copilot/DrivingSafeMode';
import { RideSimulatorModal } from './components/copilot/RideSimulatorModal';
import { OverlayPermissionModal } from './components/copilot/OverlayPermissionModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { ProductLandingPage } from './components/landing/ProductLandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { safeStorage } from './utils/safeStorage';

function DriveWiseApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [viewMode, setViewMode] = useState<'app' | 'landing'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        // Explicit query parameters
        if (params.get('app') === 'true' || params.get('view') === 'app') {
          return 'app';
        }
        if (params.get('landing') === 'true' || params.get('page') === 'landing') {
          return 'landing';
        }

        // Hash routing shortcuts
        if (
          window.location.hash.includes('painel') ||
          window.location.hash.includes('dashboard') ||
          window.location.hash.includes('app')
        ) {
          return 'app';
        }

        // If standalone PWA mode (installed on home screen), open the app dashboard
        if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
          return 'app';
        }

        // If the user already used the app and has active work or stored preference
        const savedPref = safeStorage.getItem('drivewise_user_entered_app');
        if (savedPref === 'true') {
          return 'app';
        }
      }
    } catch (e) {
      console.warn('ViewMode initial state determination warning:', e);
    }
    // Default to the official public landing page for new visitors
    return 'landing';
  });

  // Listen for hash changes to allow seamless switching
  React.useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash;
        if (hash.includes('painel') || hash.includes('dashboard') || hash.includes('app')) {
          setViewMode('app');
        } else if (hash.includes('landing') || hash === '#inicio') {
          setViewMode('landing');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const {
    isSimulatorOpen,
    setIsSimulatorOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isOverlayPermissionModalOpen,
    grantOverlayPermission,
    dismissOverlayPermissionModal,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useDriveWise();

  const handleEnterApp = () => {
    try {
      safeStorage.setItem('drivewise_user_entered_app', 'true');
    } catch {
      // ignore
    }
    setViewMode('app');
  };

  if (viewMode === 'landing') {
    return (
      <ProductLandingPage
        onEnterApp={handleEnterApp}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onNavigateToJourney={() => setActiveTab('journey')}
        onNavigateToProfile={() => setActiveTab('profile')}
        onOpenLanding={() => setViewMode('landing')}
      />

      {/* Main Content Area with Tab Switching */}
      <main className="flex-1 w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <HomeDashboard
                onStartOrViewJourney={() => setActiveTab('journey')}
                onNavigateToReports={() => setActiveTab('reports')}
                onNavigateToHistory={() => setActiveTab('history')}
                onNavigateToCopilot={() => setActiveTab('copilot')}
              />
            </motion.div>
          )}

          {activeTab === 'copilot' && (
            <motion.div
              key="copilot"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <CopilotHubView />
            </motion.div>
          )}

          {activeTab === 'journey' && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <JourneyView />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ReportsView />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <HistoryView />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProfileView onOpenLanding={() => setViewMode('landing')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals & Overlays */}
      <ExpenseModal />
      <FuelModal />
      <RideAnalysisModal />
      <FloatingCopilotOverlay />
      <DrivingSafeMode />
      <RideSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
      <OverlayPermissionModal
        isOpen={isOverlayPermissionModalOpen && !isOnboardingOpen}
        onClose={dismissOverlayPermissionModal}
        onGrant={grantOverlayPermission}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <SubscriptionModal />

      {/* Bottom Sticky Navigation */}
      <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <DriveWiseProvider>
      <DriveWiseApp />
    </DriveWiseProvider>
  );
}
