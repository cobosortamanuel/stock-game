import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/common/Header';
import { TabBar, TabType } from './components/common/TabBar';
import { SearchModal } from './components/common/SearchModal';
import { PortfolioView } from './views/PortfolioView';
import { MarketsView } from './views/MarketsView';
import { StockDetailView } from './views/StockDetailView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { GamesLobbyView } from './views/GamesLobbyView';

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

      {/* Global Stock Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSymbol={(sym) => {
          setSelectedSymbol(sym);
          setIsSearchOpen(false);
        }}
      />

      {/* Games Lobby View Modal */}
      {isLobbyOpen && <GamesLobbyView onClose={closeLobby} />}
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
