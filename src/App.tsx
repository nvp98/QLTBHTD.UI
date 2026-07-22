import { useEffect, useMemo, useState } from 'react';
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

/** Font đọc tốt tiếng Việt có dấu, chỉ dùng font hệ thống thật sự có sẵn (không phụ thuộc CDN/tải ngoài). */
const FONT_STACK =
  "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans', Roboto, Helvetica, Arial, sans-serif";

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);

  // Đồng bộ data-theme trên <html> để CSS gốc (index.css) và mọi phần tử
  // ngoài AntD luôn khớp đúng theme đang chọn, không lệ thuộc OS.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

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
          fontFamily: FONT_STACK,
          fontSize: 14,
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

    // Bộ token "Dark Navy Theme" đã chốt (xem index.css :root[data-theme='dark'] cho bản CSS var
    // tương ứng — 2 nơi này PHẢI khớp nhau khi sửa màu sau này).
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorBgContainer: '#0e2c4a',      // --bg-card
        colorBgElevated: '#1d365d',       // --bg-modal
        colorBgLayout: '#0a2540',         // --bg-sidebar — tối hơn card, để card luôn nổi rõ kể cả
                                           // ngoài vùng có gradient nền (overlay phẳng, iframe con...)
        colorBorder: '#1e4a72',           // --border-default
        colorBorderSecondary: '#163a5c',  // --divider
        colorText: '#e8eef5',             // --text-primary
        colorTextSecondary: '#9fb3c8',    // --text-secondary
        colorTextTertiary: '#8098b0',     // --text-muted
        colorTextPlaceholder: '#7a91a8',  // --text-placeholder
        colorPrimary: '#4d66d1',          // --accent-600
        colorPrimaryHover: '#5b74db',     // --accent-500
        colorPrimaryActive: '#3f56b8',    // --accent-700 — đậm hơn hover để phân biệt pressed
        colorSuccess: '#34d399',
        colorWarning: '#fbbf24',
        colorError: '#f87171',
        colorInfo: '#38bdf8',
        borderRadius: 6,
        fontFamily: FONT_STACK,
        fontSize: 14,
      },
      components: {
        Menu: {
          darkItemBg: 'transparent',
          itemBg: 'transparent',
          itemSelectedBg: '#1a4570',       // --bg-active
          itemSelectedColor: '#e8eef5',    // --text-primary
          itemColor: '#9fb3c8',            // --text-secondary
          itemHoverColor: '#e8eef5',       // --text-primary
          itemHoverBg: '#16416b',          // --bg-hover
          groupTitleColor: '#8098b0',      // --text-muted
          groupTitleFontSize: 10,
        },
        Card: {
          headerBg: 'transparent',
          headerFontSize: 14,
        },
        Table: {
          headerBg: '#0e2c4a',   // --bg-card
          headerColor: '#9fb3c8',
          rowHoverBg: '#16416b', // --bg-hover
          borderColor: '#1e4a72',
          bodySortBg: '#0e2c4a',
        },
        Modal: {
          contentBg: '#1d365d',  // --bg-modal
          headerBg: '#1d365d',
          footerBg: '#1d365d',
        },
        Select: {
          selectorBg: '#16294d',       // --bg-input
          colorBorder: '#3a6ea3',      // --border-input (rõ ranh giới hơn viền mặc định)
          optionSelectedBg: '#1a4570', // --bg-active
        },
        Input: {
          activeBg: '#16294d',
          hoverBg: '#16294d',
          colorBorder: '#3a6ea3',
          hoverBorderColor: '#2c5f8f',
          activeBorderColor: '#5b74db',
        },
        InputNumber: {
          activeBg: '#16294d',
          colorBorder: '#3a6ea3',
          hoverBorderColor: '#2c5f8f',
          activeBorderColor: '#5b74db',
        },
        Segmented: {
          itemSelectedBg: '#4d66d1',
          itemSelectedColor: '#fff',
          trackBg: '#16294d',   // --bg-input — đồng bộ cấu trúc vùng chứa với Input/Select
        },
        Tag: {
          defaultBg: '#163a5c',  // --bg-tag (riêng, không dùng chung với --border-default nữa)
          defaultColor: '#e8eef5', // --text-primary — đảm bảo đạt AA trên nền --bg-tag
        },
        Button: {
          // Sáng hơn bản trước — nút icon nhỏ (size="small", chỉ có icon, không chữ) trong bảng
          // trước đó bị "chìm" vào nền navy vì diện tích nền hiển thị quá nhỏ để nhận ra màu xám cũ.
          defaultBg: '#9aa5bd',
          defaultColor: '#0d1424',          // chữ/icon tối, tương phản mạnh trên nền sáng này
          defaultBorderColor: '#c3cbdb',    // viền sáng để rõ ranh giới nút dù nền xung quanh tối
          defaultHoverBg: '#b3bcce',
          defaultHoverColor: '#0d1424',
          defaultHoverBorderColor: '#dfe4ee',
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
