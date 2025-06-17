import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ArrowBack as BackIcon,
  Refresh as RestartIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { NAVIGATION_TABS } from '../../constants';

const CompletionContainer = styled(Box)(({ theme }) => ({
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

const CompletionCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: theme.custom.focusGradient,
  color: 'white',
  marginBottom: theme.spacing(3),
  boxShadow: theme.custom.shadowMedium,
}));

const TipsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginBottom: theme.spacing(3),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(1.5, 3),
  fontWeight: 600,
  flex: 1,
}));

const breathingTips = [
  '5分間の深呼吸で血圧が8-10mmHg低下し、即座にリラックス効果を実感します',
  '1回の瞑想で集中力の持続時間が平均12分から18分に延長します',
  '4-7-8呼吸法の実践で入眠までの時間が平均15分短縮します',
  '8週間の継続で海馬の灰白質密度が増加し、記憶力が23%向上します',
  '週5回の実践でストレス耐性が45%向上し、心拍変動が改善します',
  '呼吸瞑想により、扁桃体の過活動が25%抑制され、不安感が軽減します',
  '毎日10分の瞑想で、テロメアの短縮速度が遅くなり、細胞レベルで若返り効果があります',
  '3ヶ月の実践で、感情調整能力が向上し、衝動的な行動が52%減少します',
  '呼吸瞑想により、炎症マーカーが30%減少し、免疫機能が強化されます',
  '6ヶ月継続すると、デフォルトモードネットワークが最適化され、創造性が向上します'
];

interface SimpleBreathingCompletionProps {
  onRestart: () => void;
  onBack: () => void;
}

export const SimpleBreathingCompletion: React.FC<SimpleBreathingCompletionProps> = ({
  onRestart,
  onBack,
}) => {
  const { dispatch } = useAppContext();

  const handleContinue = () => {
    onRestart();
  };

  const handleFinish = () => {
    dispatch({ type: 'END_BREATHING_SESSION' });
    dispatch({ type: 'SET_ACTIVE_TAB', payload: NAVIGATION_TABS.GAMES });
    onBack();
  };

  return (
    <CompletionContainer>
      <HeaderBox>
        <IconButton 
          onClick={handleFinish} 
          sx={{ mr: 1 }}
        >
          <BackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          瞑想完了
        </Typography>
      </HeaderBox>

      {/* 完了メッセージ */}
      <CompletionCard>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CompleteIcon sx={{ fontSize: 60, mb: 2, opacity: 0.9 }} />
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            お疲れさまでした
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            瞑想セッションが完了しました
          </Typography>
        </CardContent>
      </CompletionCard>

      {/* Tips */}
      <TipsCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            🧠 瞑想の科学的効果
          </Typography>
          <Typography variant="body1" color="text.primary" sx={{ lineHeight: 1.6 }}>
            {breathingTips[Math.floor(Math.random() * breathingTips.length)]}
          </Typography>
        </CardContent>
      </TipsCard>

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
        <ActionButton
          variant="outlined"
          onClick={handleContinue}
          startIcon={<RestartIcon />}
        >
          続ける
        </ActionButton>
        <ActionButton
          variant="contained"
          onClick={handleFinish}
        >
          やめる
        </ActionButton>
      </Box>
    </CompletionContainer>
  );
};