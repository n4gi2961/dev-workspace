import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Divider,
  IconButton,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Notifications as NotificationIcon,
  SelfImprovement as DetoxIcon,
  Download as ExportIcon,
  Upgrade as UpgradeIcon,
  ChevronRight as ChevronRightIcon,
  Palette as PaletteIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { THEME_COLORS } from '../../constants';

const SettingsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginBottom: theme.spacing(2),
}));

const PremiumButton = styled(Button)(({ theme }) => ({
  background: theme.custom.reverseGradient,
  color: 'white',
  borderRadius: 20,
  padding: '8px 20px',
  textTransform: 'none',
  fontWeight: 600,
  '&:hover': {
    background: theme.custom.accentGradient,
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease',
}));

const ThemeColorCard = styled(Paper)<{ selected: boolean; themeColors: any }>(({ theme, selected, themeColors }) => ({
  width: '100%',
  height: 60,
  borderRadius: 12,
  cursor: 'pointer',
  border: selected ? `3px solid ${theme.palette.primary.main}` : '2px solid transparent',
  background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary}, ${themeColors.accent})`,
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.875rem',
  position: 'relative',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.custom.shadowMedium,
  },
  '&::after': selected ? {
    content: '"✓"',
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  } : {},
}));

export const SettingsPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  
  const handleSettingToggle = (setting: string) => {
    const currentSettings = state.user?.settings || {
      detoxReminders: true,
      focusAlerts: false,
      theme: 'light' as const,
      notifications: true,
    };

    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        ...currentSettings,
        [setting]: !currentSettings[setting as keyof typeof currentSettings],
      },
    });
  };

  const handleExportData = () => {
    // TODO: データエクスポート機能を実装
    console.log('Exporting user data...');
  };

  const handleUpgrade = () => {
    // TODO: プレミアムアップグレード機能を実装
    console.log('Upgrading to premium...');
  };

  const currentSettings = state.user?.settings || {
    detoxReminders: true,
    focusAlerts: false,
    theme: 'light' as const,
    notifications: true,
    themeColor: 'oceanCalm' as const,
  };

  const handleThemeColorChange = (colorKey: string) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        ...currentSettings,
        themeColor: colorKey as any,
      },
    });
  };

  const handleThemeToggle = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        ...currentSettings,
        theme: currentSettings.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  return (
    <Box sx={{ mt: 8 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          mb: 3,
          textAlign: 'center',
          color: 'text.primary',
          fontWeight: 600,
        }}
      >
        設定
      </Typography>

      {/* テーマ設定 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            テーマ設定
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemText
                primary="ダークモード"
                secondary="画面の配色を暗いテーマに変更"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={currentSettings.theme === 'dark'}
                  onChange={handleThemeToggle}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>
      
      {/* テーマカラー設定 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            テーマカラー
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            お好みの配色を選択してください
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
            {/* 寒色系テーマ（左側） */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                寒色系
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(THEME_COLORS).slice(0, 5).map(([key, colors]) => (
                  <ThemeColorCard
                    key={key}
                    selected={currentSettings.themeColor === key}
                    themeColors={colors}
                    onClick={() => handleThemeColorChange(key)}
                    elevation={currentSettings.themeColor === key ? 4 : 1}
                  >
                    {colors.name}
                  </ThemeColorCard>
                ))}
              </Box>
            </Box>
            
            {/* 暖色系テーマ（右側） */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                暖色系
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(THEME_COLORS).slice(5, 10).map(([key, colors]) => (
                  <ThemeColorCard
                    key={key}
                    selected={currentSettings.themeColor === key}
                    themeColors={colors}
                    onClick={() => handleThemeColorChange(key)}
                    elevation={currentSettings.themeColor === key ? 4 : 1}
                  >
                    {colors.name}
                  </ThemeColorCard>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </SettingsCard>

      {/* 通知設定 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            通知設定
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemText
                primary="デトックスリマインダー"
                secondary="定期的にデジタルデトックスを促す通知"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={currentSettings.detoxReminders}
                  onChange={() => handleSettingToggle('detoxReminders')}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemText
                primary="集中力アラート"
                secondary="集中力が低下した時の通知"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={currentSettings.focusAlerts}
                  onChange={() => handleSettingToggle('focusAlerts')}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* プレミアム機能 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            プレミアム機能
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemText
                primary="高度な分析機能"
                secondary="詳細な統計とパフォーマンス分析"
              />
              <ListItemSecondaryAction>
                <PremiumButton
                  startIcon={<UpgradeIcon />}
                  onClick={handleUpgrade}
                  size="small"
                >
                  アップグレード
                </PremiumButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* データ管理 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            データ管理
          </Typography>
          <List disablePadding>
            <ListItem
              disablePadding
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                borderRadius: 1,
                px: 1,
              }}
              onClick={handleExportData}
            >
              <ListItemText
                primary="データをエクスポート"
                secondary="あなたの統計データをJSONファイルでダウンロード"
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={handleExportData}>
                  <ExportIcon color="primary" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* アプリ情報 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            アプリ情報
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            FocusFlow v1.0.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            デジタルウェルビーイングと集中力向上のためのアプリ
          </Typography>
        </CardContent>
      </SettingsCard>
    </Box>
  );
};