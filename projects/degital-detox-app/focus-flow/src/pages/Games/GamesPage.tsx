import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CardActionArea } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Air as BreathingIcon,
  Memory as DNBIcon,
  Pattern as PatternIcon,
  Visibility as AttentionIcon,
} from '@mui/icons-material';
import { GAME_DURATIONS, GAME_TYPES } from '../../constants';
import { BreathingMeditationGame } from '../../components/games/BreathingMeditationGame';
import { DNBGame } from '../../components/games/DNBGame';

const GameCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.custom.shadowMedium,
  },
}));

const GameIcon = styled(Box)(({ theme }) => ({
  width: 60,
  height: 60,
  margin: '0 auto 16px',
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& > svg': {
    fontSize: 30,
  },
}));

interface GameItemProps {
  title: string;
  duration: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}

const GameItem: React.FC<GameItemProps> = ({ title, duration, icon, gradient, onClick }) => (
  <Box sx={{ width: '50%', p: 1 }}>
    <GameCard>
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <GameIcon sx={{ background: gradient, color: 'white' }}>
            {icon}
          </GameIcon>
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 1,
            }}
          >
            {title}
          </Typography>
          
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.875rem' }}
          >
            {duration}
          </Typography>
        </CardContent>
      </CardActionArea>
    </GameCard>
  </Box>
);

export const GamesPage: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  const handleGameClick = (gameType: string) => {
    if (gameType === GAME_TYPES.BREATHING) {
      setCurrentGame(GAME_TYPES.BREATHING);
    } else if (gameType === GAME_TYPES.DNB) {
      setCurrentGame(GAME_TYPES.DNB);
    } else {
      // TODO: 他のゲームの実装
      console.log(`Starting ${gameType} game`);
    }
  };

  const handleBackToGames = () => {
    setCurrentGame(null);
  };

  // 呼吸瞑想ゲーム画面を表示
  if (currentGame === GAME_TYPES.BREATHING) {
    return <BreathingMeditationGame onBack={handleBackToGames} />;
  }

  // DNBゲーム画面を表示
  if (currentGame === GAME_TYPES.DNB) {
    return <DNBGame onBack={handleBackToGames} />;
  }

  const games = [
    {
      title: '呼吸瞑想',
      duration: `3-10分`,
      icon: <BreathingIcon />,
      gradient: 'linear-gradient(135deg, #2A9D8F, #4FBDAA)',
      onClick: () => handleGameClick(GAME_TYPES.BREATHING),
    },
    {
      title: 'Dual N-Back',
      duration: `2分`,
      icon: <DNBIcon />,
      gradient: 'linear-gradient(135deg, #E76F51, #F0A690)',
      onClick: () => handleGameClick(GAME_TYPES.DNB),
    },
    {
      title: 'パターン認識',
      duration: `5分`,
      icon: <PatternIcon />,
      gradient: 'linear-gradient(135deg, #264653, #457B9D)',
      onClick: () => handleGameClick(GAME_TYPES.PATTERN),
    },
    {
      title: '注意力テスト',
      duration: `5分`,
      icon: <AttentionIcon />,
      gradient: 'linear-gradient(135deg, #457B9D, #A8DADC)',
      onClick: () => handleGameClick(GAME_TYPES.ATTENTION),
    },
  ];

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
       Focus Training
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          textAlign: 'center',
          mb: 4,
          maxWidth: 400,
          mx: 'auto',
        }}
      >
        様々なゲームで集中力を鍛えましょう。定期的なトレーニングが効果的です。
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 2,
        justifyContent: 'center',
        alignItems: 'stretch',
        px: 2
      }}>
        {games.map((game, index) => (
          <GameItem key={index} {...game} />
        ))}
      </Box>
    </Box>
  );
};