import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ArrowBack as BackIcon,
  PlayArrow as PlayIcon,
  Psychology as BrainIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDNBGame } from '../../hooks/useDNBGame';
import { useAppContext } from '../../contexts/AppContext';
import { DNBGrid } from './DNBGrid';
import { DNBControls } from './DNBControls';
import { 
  DNBSessionData, 
  DNB_GAME_STATES
} from '../../types/dnb';
import { 
  DNB_CONFIG, 
  DNB_TIPS, 
  DIFFICULTY_DESCRIPTIONS,
  PERFORMANCE_MESSAGES,
  formatDNBLevel
} from '../../constants/dnb';

const GameContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${theme.palette.background.default}, ${theme.palette.background.paper})`,
  position: 'relative',
  overflow: 'hidden',
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(5.5),
  maxWidth: 500,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '100vh',
}));

const SettingsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom?.shadowLight || '0 2px 8px rgba(0,0,0,0.1)',
  marginBottom: theme.spacing(3),
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const CountdownBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  flex: 1,
}));

const ResultsCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  background: theme.custom?.focusGradient || 'linear-gradient(135deg, #2A9D8F, #264653)',
  color: 'white',
  marginBottom: theme.spacing(3),
  boxShadow: theme.custom?.shadowMedium || '0 4px 12px rgba(0,0,0,0.15)',
}));

interface DNBGameProps {
  onBack: () => void;
}

export const DNBGame: React.FC<DNBGameProps> = ({ onBack }) => {
  const [nLevel, setNLevel] = useState(DNB_CONFIG.MIN_N_LEVEL);
  const [sessionData, setSessionData] = useState<DNBSessionData | null>(null);
  const { dispatch } = useAppContext();

  // セッション完了時のコールバック
  const handleSessionComplete = useCallback(async (completedSessionData: DNBSessionData) => {
    setSessionData(completedSessionData);
    // TODO: データ保存機能を後で実装
    console.log('Session completed:', completedSessionData);
  }, []);

  const {
    gameState,
    currentTrial,
    currentTrialIndex,
    showStimulus,
    sessionStats,
    feedback,
    countdown,
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    handleResponse,
    canRespond
  } = useDNBGame({
    nLevel,
    onSessionComplete: handleSessionComplete
  });

  const handleLevelChange = (event: any) => {
    if (gameState === DNB_GAME_STATES.MENU) {
      setNLevel(event.target.value);
    }
  };

  const handleStartGame = () => {
    startGame();
    dispatch({ type: 'START_BREATHING_SESSION' }); // DNB用のアクションを後で追加
  };

  const handleStopGame = () => {
    stopGame();
    dispatch({ type: 'END_BREATHING_SESSION' }); // DNB用のアクションを後で追加
  };

  const handleRestart = () => {
    setSessionData(null);
    stopGame();
  };

  const getPerformanceMessage = (accuracy: number): string => {
    if (accuracy >= DNB_CONFIG.EXCELLENT_THRESHOLD) return PERFORMANCE_MESSAGES.EXCELLENT;
    if (accuracy >= DNB_CONFIG.GOOD_THRESHOLD) return PERFORMANCE_MESSAGES.GOOD;
    if (accuracy >= DNB_CONFIG.AVERAGE_THRESHOLD) return PERFORMANCE_MESSAGES.AVERAGE;
    return PERFORMANCE_MESSAGES.POOR;
  };

  // 設定画面（MENU状態）
  if (gameState === DNB_GAME_STATES.MENU) {
    return (
      <GameContainer>
        <ContentWrapper>
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
              Dual N-Back
            </Typography>
          </HeaderBox>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 4 }}
          >
            ワーキングメモリを鍛える科学的トレーニング
          </Typography>

          <SettingsCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                <BrainIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                ゲーム設定
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>難易度レベル</InputLabel>
                <Select
                  value={nLevel}
                  onChange={handleLevelChange}
                  label="難易度レベル"
                >
                  {Array.from({ length: DNB_CONFIG.MAX_N_LEVEL }, (_, i) => {
                    const level = i + 1;
                    return (
                      <MenuItem key={level} value={level}>
                        <Box>
                          <Typography variant="body1">
                            {formatDNBLevel(level)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {DIFFICULTY_DESCRIPTIONS[level as keyof typeof DIFFICULTY_DESCRIPTIONS]}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InfoIcon sx={{ mr: 1, fontSize: 16 }} />
                  科学的効果
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {DNB_TIPS[Math.floor(Math.random() * DNB_TIPS.length)]}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleStartGame}
                startIcon={<PlayIcon />}
                sx={{
                  borderRadius: 20,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                トレーニング開始
              </Button>
            </CardContent>
          </SettingsCard>
        </ContentWrapper>
      </GameContainer>
    );
  }

  // カウントダウン画面（COUNTDOWN状態）
  if (gameState === DNB_GAME_STATES.COUNTDOWN) {
    return (
      <GameContainer>
        <ContentWrapper>
          <CountdownBox>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              準備してください
            </Typography>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: '120px', 
                fontWeight: 300,
                color: 'primary.main',
                mb: 2 
              }}
            >
              {countdown || 'START'}
            </Typography>
            <Chip
              label={formatDNBLevel(nLevel)}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            />
          </CountdownBox>
        </ContentWrapper>
      </GameContainer>
    );
  }

  // 結果画面（COMPLETED状態）
  if (gameState === DNB_GAME_STATES.COMPLETED && sessionData) {
    return (
      <GameContainer>
        <ContentWrapper>
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
              トレーニング完了
            </Typography>
          </HeaderBox>

          <ResultsCard>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <BrainIcon sx={{ fontSize: 60, mb: 2, opacity: 0.9 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                お疲れさまでした
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                {formatDNBLevel(sessionData.nLevel)} クリア
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {(sessionData.accuracy * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                正答率
              </Typography>
            </CardContent>
          </ResultsCard>

          <SettingsCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                詳細統計
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    平均反応時間
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sessionData.avgResponseTime.toFixed(0)}ms
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    正解数
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sessionData.correctResponses}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    試行数
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sessionData.totalTrials}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    誤答数
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sessionData.falsePositives}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                {getPerformanceMessage(sessionData.accuracy)}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleRestart}
                  sx={{ flex: 1, borderRadius: 20 }}
                >
                  もう一度
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    onBack();
                    dispatch({ type: 'END_BREATHING_SESSION' });
                  }}
                  sx={{ flex: 1, borderRadius: 20 }}
                >
                  終了
                </Button>
              </Box>
            </CardContent>
          </SettingsCard>
        </ContentWrapper>
      </GameContainer>
    );
  }

  // ゲーム画面（PLAYING, STIMULUS_SHOW, INTERVAL, PAUSED状態）
  return (
    <GameContainer>
      <ContentWrapper>
        <HeaderBox>
          <IconButton onClick={handleStopGame} sx={{ mr: 1 }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatDNBLevel(nLevel)} トレーニング
            </Typography>
            {gameState === DNB_GAME_STATES.PAUSED && (
              <Typography variant="body2" color="warning.main">
                一時停止中
              </Typography>
            )}
          </Box>
        </HeaderBox>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <DNBGrid
            currentTrial={currentTrial}
            showStimulus={showStimulus}
            feedback={feedback}
          />

          <DNBControls
            canRespond={canRespond}
            onResponse={handleResponse}
            onPause={pauseGame}
            onResume={resumeGame}
            onStop={handleStopGame}
            gameState={gameState}
            sessionStats={sessionStats}
            currentTrialIndex={currentTrialIndex}
            totalTrials={currentTrial ? DNB_CONFIG.BASE_TRIALS + nLevel : 0}
            nLevel={nLevel}
            feedback={feedback}
          />
        </Box>
      </ContentWrapper>
    </GameContainer>
  );
};