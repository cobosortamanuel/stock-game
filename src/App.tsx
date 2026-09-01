import React, { useState, Suspense, lazy } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/common/Header';
import { TabBar, TabType } from './components/common/TabBar';
import { PortfolioView } from './views/PortfolioView';
import { MarketsView } from './views/MarketsView';

// 4. Code Splitting & Dynamic Imports with React.lazy
const StockDetailView = lazy(() => import('./views/StockDetailView').then((m) => ({ default: m.StockDetailView })));
const HistoryView = lazy(() => import('./views/HistoryView').then((m) => ({ default: m.HistoryView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })));
const GamesLobbyView = lazy(() => import('./views/GamesLobbyView').then((m) => ({ default: m.GamesLobbyView })));
const SearchModal = lazy(() => import('./components/common/SearchModal').then((m) => ({ default: m.SearchModal })));

function ViewFallback() {
  return (
    <div className="flex-1 min-h-[300px] flex items-center justify-center p-8">
      <div className="w-6 h-6 rounded-full border-2 border-ios-blue border-t-transparent animate-spin" />
    </div>
  );
}

function AppContent() {
  const { positions, isLobbyOpen, closeLobby } = useTrading();
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const getHeaderTitle = () => {
    if (selectedSymbol) return selectedSymbol;
    switch (activeTab) {
      case 'portfolio':
        return 'Portafolio';
      case 'markets':
        return 'Mercados';
      case 'history':
        return 'Historial';
      case 'settings':
        return 'Ajustes';
      default:
        return 'Apex Trade';
    }
  };

  return (
    <div className="min-h-screen bg-ios-bg-light dark:bg-ios-bg-dark text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200 selection:bg-ios-blue selection:text-white">
      {/* iOS Top Bar */}
      {!selectedSymbol && (
        <Header
          title={getHeaderTitle()}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      {/* Main Screen Content */}
      <main className="flex-1 w-full max-w-md mx-auto">
        <Suspense fallback={<ViewFallback />}>
          {selectedSymbol ? (
            <StockDetailView
              symbol={selectedSymbol}
              onBack={() => setSelectedSymbol(null)}
            />
          ) : (
            <>
              {activeTab === 'portfolio' && (
                <PortfolioView
                  onSelectSymbol={handleSelectSymbol}
                  onExploreMarkets={() => setActiveTab('markets')}
                />
              )}

              {activeTab === 'markets' && (
                <MarketsView
                  onSelectSymbol={handleSelectSymbol}
                  onOpenSearch={() => setIsSearchOpen(true)}
                />
              )}

              {activeTab === 'history' && <HistoryView />}

              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </Suspense>
      </main>

      {/* iOS Bottom Navigation Bar - only shown when not on a specific stock detail page */}
      {!selectedSymbol && (
        <TabBar
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setSelectedSymbol(null);
            setActiveTab(tab);
          }}
          openPositionsCount={positions.length}
        />
      )}

      {/* Global Stock Search Modal & Games Lobby */}
      <Suspense fallback={null}>
        {isSearchOpen && (
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              setIsSearchOpen(false);
            }}
          />
        )}

        {isLobbyOpen && <GamesLobbyView onClose={closeLobby} />}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
