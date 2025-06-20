import React from 'react';
import { Box, Typography, Button, Card, CardContent, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CheckCircle as SuccessIcon, Home as HomeIcon } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { MOTIVATION_TIPS } from '../../constants';
import { getRandomTip } from '../../utils';

const ResultContainer = styled(Box)({
  textAlign: 'center',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
});

const SuccessCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowMedium,
  marginBottom: theme.spacing(3),
  maxWidth: 400,
  width: '100%',
}));

const StatsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: 400,
  marginBottom: theme.spacing(3),
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  borderRadius: 12,
  background: theme.palette.mode === 'dark' ? '#1A1A1A' : '#F8F9FA',
}));

const MotivationCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
  border: `1px solid ${theme.palette.primary.main}30`,
  marginBottom: theme.spacing(3),
  maxWidth: 500,
  width: '100%',
}));

const HomeButton = styled(Button)(({ theme }) => ({
  borderRadius: 25,
  padding: '12px 32px',
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: theme.custom.shadowLight,
  '&:hover': {
    boxShadow: theme.custom.shadowMedium,
    transform: 'translateY(-2px)',
  },
}));

interface DetoxResultPageProps {
  sessionDuration: number; // ミリ秒
  onClose: () => void;
}

export const DetoxResultPage: React.FC<DetoxResultPageProps> = ({ 
  sessionDuration,
  onClose 
}) => {
  const { state } = useAppContext();
  
  const currentSessionMinutes = Math.floor(sessionDuration / (1000 * 60));
  const currentSessionSeconds = Math.floor((sessionDuration % (1000 * 60)) / 1000);
  
  // 週の合計時間を計算（過去7日のデトックスセッション）
  const weeklyTotal = state.user?.detoxSessions
    .filter(session => {
      const sessionDate = new Date(session.startTime);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo && session.completed;
    })
    .reduce((total, session) => total + session.duration, 0) || 0;
  
  const weeklyTotalMinutes = Math.floor(weeklyTotal / (1000 * 60));
  const weeklyTotalHours = Math.floor(weeklyTotalMinutes / 60);
  const remainingMinutes = weeklyTotalMinutes % 60;
  
  const motivationTip = React.useMemo(() => 
    getRandomTip(MOTIVATION_TIPS), []
  );

  const handleGoHome = () => {
    onClose();
  };

  return (
    <Box sx={{ mt: 8 }}>
      <ResultContainer>
        <SuccessCard>
          <CardContent sx={{ p: 3 }}>
            <SuccessIcon 
              sx={{ 
                fontSize: 60, 
                color: 'success.main',
                mb: 2
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600, 
                mb: 1,
                color: 'text.primary'
              }}
            >
              お疲れ様でした！
            </Typography>
          </CardContent>
        </SuccessCard>

        <StatsGrid>
          <StatCard>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              今回の集中時間
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
              {currentSessionMinutes}分{currentSessionSeconds > 0 ? `${currentSessionSeconds}秒` : ''}
            </Typography>
          </StatCard>

          <StatCard>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              週の合計
            </Typography>
            <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 700 }}>
              {weeklyTotalHours > 0 ? `${weeklyTotalHours}時間` : ''}
              {remainingMinutes}分
            </Typography>
          </StatCard>
        </StatsGrid>

        <MotivationCard>
          <CardContent sx={{ p: 3 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontStyle: 'italic',
                lineHeight: 1.8,
                color: 'text.primary',
                textAlign: 'center',
                mb: 2
              }}
            >
              {motivationTip.split(' -')[0]}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                textAlign: 'center',
                fontWeight: 500
              }}
            >
              -{motivationTip.split(' -')[1]}
            </Typography>
          </CardContent>
        </MotivationCard>

        <HomeButton 
          variant="contained" 
          size="large"
          startIcon={<HomeIcon />}
          onClick={handleGoHome}
        >
          戻る
        </HomeButton>
      </ResultContainer>
    </Box>
  );
};