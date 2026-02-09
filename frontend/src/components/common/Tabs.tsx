import { createContext, useContext, type ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component');
  }
  return context;
}

interface TabsProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ children, activeTab, onTabChange, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: onTabChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  tabs: Tab[];
  className?: string;
}

export function TabList({ tabs, className }: TabListProps) {
  const { activeTab, setActiveTab } = useTabsContext();

  return (
    <div
      className={clsx('border-b border-gray-200', className)}
      role="tablist"
      aria-orientation="horizontal"
    >
      <nav className="-mb-px flex gap-3 sm:gap-6 overflow-x-auto scrollbar-hide flex-nowrap whitespace-nowrap">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'ml-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (id !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}
