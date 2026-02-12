import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabList, TabPanel } from './Tabs';

const defaultTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

describe('Tabs', () => {
  describe('TabList Rendering', () => {
    it('should render all tabs', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should render tabs with role="tab"', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('should render tablist container with role="tablist"', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should mark active tab with aria-selected=true', () => {
      render(
        <Tabs activeTab="tab2" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('should set aria-controls on each tab', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-controls', 'tabpanel-tab1');
      expect(tabs[1]).toHaveAttribute('aria-controls', 'tabpanel-tab2');
    });

    it('should set id on each tab', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('id', 'tab-tab1');
      expect(tabs[1]).toHaveAttribute('id', 'tab-tab2');
    });
  });

  describe('Tab Icons', () => {
    it('should render tab icons', () => {
      const tabsWithIcons = [
        { id: 'tab1', label: 'Tab 1', icon: <span data-testid="icon-1">I</span> },
        { id: 'tab2', label: 'Tab 2' },
      ];
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={tabsWithIcons} />
        </Tabs>
      );

      expect(screen.getByTestId('icon-1')).toBeInTheDocument();
    });
  });

  describe('Tab Badges', () => {
    it('should render tab badges', () => {
      const tabsWithBadges = [
        { id: 'tab1', label: 'Tab 1', badge: 5 },
        { id: 'tab2', label: 'Tab 2', badge: '99+' },
      ];
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={tabsWithBadges} />
        </Tabs>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not render badge when badge is undefined', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      // defaultTabs don't have badges, so no badge elements should exist
      const badges = document.querySelectorAll('.rounded-full.px-2');
      expect(badges).toHaveLength(0);
    });
  });

  describe('Tab Interaction', () => {
    it('should call onTabChange when a tab is clicked', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Tabs activeTab="tab1" onTabChange={handleChange}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      await user.click(screen.getByText('Tab 2'));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('should call onTabChange with correct id for each tab', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Tabs activeTab="tab1" onTabChange={handleChange}>
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      await user.click(screen.getByText('Tab 3'));
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });
  });

  describe('TabPanel', () => {
    it('should render active panel content', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} />
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('should have role="tabpanel"', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabPanel id="tab1">Content</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set correct id on tabpanel', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabPanel id="tab1">Content</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-tab1');
    });

    it('should set aria-labelledby to corresponding tab', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabPanel id="tab1">Content</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-tab1');
    });

    it('should apply custom className', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabPanel id="tab1" className="custom-panel">
            Content
          </TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toHaveClass('custom-panel');
    });

    it('should not render inactive panel', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabPanel id="tab2">Hidden Content</TabPanel>
        </Tabs>
      );

      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    });
  });

  describe('Context Error', () => {
    it('should throw error when TabList is used outside of Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(<TabList tabs={defaultTabs} />);
      }).toThrow('Tabs compound components must be used within a Tabs component');
      consoleSpy.mockRestore();
    });

    it('should throw error when TabPanel is used outside of Tabs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(<TabPanel id="tab1">Content</TabPanel>);
      }).toThrow('Tabs compound components must be used within a Tabs component');
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className to Tabs container', () => {
      const { container } = render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()} className="custom-tabs">
          <TabList tabs={defaultTabs} />
        </Tabs>
      );

      expect(container.firstChild).toHaveClass('custom-tabs');
    });

    it('should apply custom className to TabList', () => {
      render(
        <Tabs activeTab="tab1" onTabChange={vi.fn()}>
          <TabList tabs={defaultTabs} className="custom-tablist" />
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toHaveClass('custom-tablist');
    });
  });
});
