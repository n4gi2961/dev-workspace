import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  AccessTime as TimeIcon,
  TrendingUp as TrendingIcon,
  SelfImprovement as MeditationIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../../contexts/AppContext';
import { formatDuration } from '../../../utils';

const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.custom.shadowMedium,
  },
}));

const StatIcon = styled(Box)<{ gradientType?: 'focus' | 'detox' | 'accent' | 'reverse' }>(({ theme, gradientType = 'focus' }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(1),
  background: theme.custom[`${gradientType}Gradient`],
  color: 'white',
  '& > svg': {
    fontSize: 20,
  },
}));

interface StatItemProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  gradientType: 'focus' | 'detox' | 'accent' | 'reverse';
}

const StatItem: React.FC<StatItemProps> = ({ icon, title, value, gradientType }) => (
  <Box sx={{ width: '50%', p: 1 }}>
    <StatCard>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
        <StatIcon gradientType={gradientType} sx={{ margin: '0 auto 8px' }}>
          {icon}
        </StatIcon>
        
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.75rem', mb: 0.5 }}
        >
          {title}
        </Typography>
        
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1.25rem',
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </StatCard>
  </Box>
);

export const QuickStatsGrid: React.FC = () => {
  const { state } = useAppContext();
  
  // モックデータ（実際のアプリケーションでは state.user.stats から取得）
  const stats = {
    screenTime: 3.4 * 60 * 60 * 1000, // 3時間24分をミリ秒で
    focusSessions: 5,
    detoxTime: 1.5 * 60 * 60 * 1000, // 1時間30分をミリ秒で
    productivityGain: 23,
  };

  const statItems: StatItemProps[] = [
    {
      icon: <TimeIcon />,
      title: 'スクリーンタイム',
      value: formatDuration(stats.screenTime),
      gradientType: 'reverse',
    },
    {
      icon: <TrendingIcon />,
      title: '集中セッション',
      value: `${stats.focusSessions}回`,
      gradientType: 'focus',
    },
    {
      icon: <MeditationIcon />,
      title: 'デトックス時間',
      value: formatDuration(stats.detoxTime),
      gradientType: 'detox',
    },
    {
      icon: <SpeedIcon />,
      title: '生産性向上',
      value: `+${stats.productivityGain}%`,
      gradientType: 'accent',
    },
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 1,
      justifyContent: 'center',
      alignItems: 'center',
      px: 2
    }}>
      {statItems.map((item, index) => (
        <StatItem key={index} {...item} />
      ))}
    </Box>
  );
};