import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ArrowBack as BackIcon,
  Refresh as RestartIcon,
  TrendingUp as TrendingUpIcon,
  Timer as TimerIcon,
  FavoriteRounded as HeartIcon,
} from '@mui/icons-material';
import { BreathingSessionData, BREATHING_PATTERNS } from '../../constants/breathing';
import { useAppContext } from '../../contexts/AppContext';

const ResultsContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${theme.palette.background.default}, ${theme.palette.background.paper})`,
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const ScoreCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: theme.custom.focusGradient,
  color: 'white',
  marginBottom: theme.spacing(3),
  boxShadow: theme.custom.shadowMedium,
}));

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginBottom: theme.spacing(2),
}));

const StatRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5, 0),
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#3A3A3A' : '#F0F0F0'}`,
  },
}));

const ScoreCircle = styled(Box)(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  margin: '0 auto',
  marginBottom: theme.spacing(2),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(1.5, 3),
  fontWeight: 600,
  flex: 1,
}));

interface BreathingResultsProps {
  sessionData: BreathingSessionData;
  onRestart: () => void;
  onBack: () => void;
}

export const BreathingResults: React.FC<BreathingResultsProps> = ({
  sessionData,
  onRestart,
  onBack,
}) => {
  const { dispatch } = useAppContext();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const getScoreLevel = (score: number): string => {
    if (score >= 90) return 'すばらしい！';
    if (score >= 80) return '良好';
    if (score >= 70) return '普通';
    if (score >= 60) return '改善の余地あり';
    return 'もう少し頑張りましょう';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const pattern = BREATHING_PATTERNS[sessionData.pattern];

  return (
    <ResultsContainer>
      <HeaderBox>
        <IconButton 
          onClick={() => {
            onBack();
            dispatch({ type: 'END_BREATHING_SESSION' });
          }} 
          sx={{ mr: 1 }}
        >
          <BackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          セッション完了
        </Typography>
      </HeaderBox>

      {/* スコアカード */}
      <ScoreCard>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <ScoreCircle>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>
              {Math.round(sessionData.consistencyScore)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              一貫性スコア
            </Typography>
          </ScoreCircle>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {getScoreLevel(sessionData.consistencyScore)}
          </Typography>
          
          <LinearProgress
            variant="determinate"
            value={sessionData.completionRate}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'white',
                borderRadius: 4,
              },
            }}
          />
          
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            完了率: {Math.round(sessionData.completionRate)}%
          </Typography>
        </CardContent>
      </ScoreCard>

      {/* セッション詳細 */}
      <StatsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <TimerIcon sx={{ mr: 1 }} />
            セッション詳細
          </Typography>

          <StatRow>
            <Typography variant="body2" color="text.secondary">
              呼吸パターン
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {pattern.name}
            </Typography>
          </StatRow>

          <StatRow>
            <Typography variant="body2" color="text.secondary">
              実際の時間
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {formatDuration(sessionData.duration)}
            </Typography>
          </StatRow>

          <StatRow>
            <Typography variant="body2" color="text.secondary">
              予定時間
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {formatDuration(sessionData.plannedDuration)}
            </Typography>
          </StatRow>

          <StatRow>
            <Typography variant="body2" color="text.secondary">
              呼吸回数
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {sessionData.breathCount}回
            </Typography>
          </StatRow>

          <StatRow>
            <Typography variant="body2" color="text.secondary">
              平均呼吸数/分
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {sessionData.metrics.avgBreathsPerMinute}回
            </Typography>
          </StatRow>
        </CardContent>
      </StatsCard>

      {/* フィードバック */}
      <StatsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            フィードバック
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {sessionData.consistencyScore >= 80 && 
              '素晴らしい集中力でした！リズムが安定していて、深いリラックス状態に入れています。'
            }
            {sessionData.consistencyScore >= 60 && sessionData.consistencyScore < 80 && 
              'よくできました。呼吸のリズムをもう少し意識すると、さらに深い瞑想状態に入れるでしょう。'
            }
            {sessionData.consistencyScore < 60 && 
              '練習を重ねることで、より安定した呼吸リズムを身につけることができます。継続が重要です。'
            }
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
            <HeartIcon sx={{ color: '#4CAF50', mr: 1 }} />
            <Typography variant="body2" color="text.primary">
              定期的な呼吸瞑想は、ストレス軽減と集中力向上に効果的です
            </Typography>
          </Box>
        </CardContent>
      </StatsCard>

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
        <ActionButton
          variant="outlined"
          onClick={onRestart}
          startIcon={<RestartIcon />}
        >
          もう一度
        </ActionButton>
        <ActionButton
          variant="contained"
          onClick={onBack}
        >
          完了
        </ActionButton>
      </Box>
    </ResultsContainer>
  );
};