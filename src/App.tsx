import { useMemo, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router-dom';
import viVN from 'antd/locale/vi_VN';
import router from './router';
import { ThemeModeContext, type ThemeMode } from './theme/ThemeModeContext';

const THEME_MODE_KEY = 'cbm_theme_mode';

function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_MODE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);

  const toggleMode = () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    localStorage.setItem(THEME_MODE_KEY, nextMode);
  };

  const themeConfig = useMemo(() => {
    if (mode === 'light') {
      return {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f3f4f6',
          colorBorder: '#d1d5db',
          colorBorderSecondary: '#e5e7eb',
          colorText: '#111827',
          colorTextSecondary: '#4b5563',
          colorTextPlaceholder: '#9ca3af',
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
          fontSize: 13,
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            itemBg: 'transparent',
            itemSelectedBg: '#dbeafe',
            itemSelectedColor: '#1d4ed8',
            itemColor: '#374151',
            itemHoverColor: '#111827',
            itemHoverBg: '#eff6ff',
            groupTitleColor: '#6b7280',
            groupTitleFontSize: 10,
          },
          Card: {
            headerBg: 'transparent',
            headerFontSize: 14,
          },
          Table: {
            headerBg: '#f9fafb',
            headerColor: '#374151',
            rowHoverBg: '#f9fafb',
            borderColor: '#e5e7eb',
            bodySortBg: '#ffffff',
          },
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#ffffff',
            footerBg: '#ffffff',
          },
          Select: {
            selectorBg: '#ffffff',
            optionSelectedBg: '#dbeafe',
          },
          Input: {
            activeBg: '#ffffff',
            hoverBg: '#ffffff',
          },
          InputNumber: {
            activeBg: '#ffffff',
          },
          Segmented: {
            itemSelectedBg: '#2563eb',
            itemSelectedColor: '#fff',
            trackBg: '#f3f4f6',
          },
          Tag: {
            defaultBg: '#f3f4f6',
            defaultColor: '#4b5563',
          },
        },
      };
    }

    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorBgContainer: '#0d1117',
        colorBgElevated: '#111827',
        colorBgLayout: '#060c14',
        colorBorder: '#1f2937',
        colorBorderSecondary: '#374151',
        colorText: '#f9fafb',
        colorTextSecondary: '#9ca3af',
        colorTextPlaceholder: '#4b5563',
        colorPrimary: '#3b82f6',
        borderRadius: 6,
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        fontSize: 13,
      },
      components: {
        Menu: {
          darkItemBg: 'transparent',
          itemBg: 'transparent',
          itemSelectedBg: '#1e3a5f',
          itemSelectedColor: '#93c5fd',
          itemColor: '#9ca3af',
          itemHoverColor: '#e5e7eb',
          itemHoverBg: '#111827',
          groupTitleColor: '#374151',
          groupTitleFontSize: 10,
        },
        Card: {
          headerBg: 'transparent',
          headerFontSize: 14,
        },
        Table: {
          headerBg: '#111827',
          headerColor: '#9ca3af',
          rowHoverBg: '#111827',
          borderColor: '#1f2937',
          bodySortBg: '#0d1117',
        },
        Modal: {
          contentBg: '#111827',
          headerBg: '#111827',
          footerBg: '#111827',
        },
        Select: {
          selectorBg: '#111827',
          optionSelectedBg: '#1e3a5f',
        },
        Input: {
          activeBg: '#111827',
          hoverBg: '#111827',
        },
        InputNumber: {
          activeBg: '#111827',
        },
        Segmented: {
          itemSelectedBg: '#1d4ed8',
          itemSelectedColor: '#fff',
          trackBg: 'transparent',
        },
        Tag: {
          defaultBg: '#1f2937',
          defaultColor: '#9ca3af',
        },
      },
    };
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ConfigProvider locale={viVN} theme={themeConfig}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
