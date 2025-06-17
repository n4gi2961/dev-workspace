import React, { useState, useCallback, useMemo } from 'react';
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
  LinearProgress,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow as PlayIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { 
  BREATHING_PATTERNS, 
  SESSION_STATES, 
  SESSION_DURATIONS,
  BreathingSessionData
} from '../../constants/breathing';
import { BreathingCircle } from './BreathingCircle';
import { SessionControls } from './SessionControls';
import { SimpleBreathingCompletion } from './SimpleBreathingCompletion';
import { useBreathingSession } from '../../hooks/useBreathingSession';
import { useBreathingData } from '../../hooks/useBreathingData';
import { useAppContext } from '../../contexts/AppContext';
import { formatDuration, formatTime } from '../../utils/breathingCalculations';

const GameContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `linear-gradient(135deg, ${theme.palette.background.default}, ${theme.palette.background.paper})`,
  position: 'relative',
  overflow: 'hidden',
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(5.5), // topbarに隠れないよう20px追加
  maxWidth: 400,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '100vh',
}));

const SettingsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginBottom: theme.spacing(3),
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

interface BreathingMeditationGameProps {
  onBack: () => void;
}

export const BreathingMeditationGame: React.FC<BreathingMeditationGameProps> = ({ onBack }) => {
  // 設定状態
  const [selectedPattern, setSelectedPattern] = useState('box');
  const [sessionDuration, setSessionDuration] = useState(SESSION_DURATIONS.MEDIUM);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionData, setSessionData] = useState<BreathingSessionData | null>(null);
  
  // データ管理フック
  const { saveSession } = useBreathingData();
  const { dispatch } = useAppContext();
  
  // セッション完了時のコールバック
  const handleSessionComplete = useCallback(async (completedSessionData: BreathingSessionData) => {
    const success = await saveSession(completedSessionData);
    if (success) {
      setSessionData(completedSessionData);
    } else {
      console.error('Failed to save session data');
    }
  }, [saveSession]);
  
  // セッション管理フック
  const selectedPatternData = useMemo(() => BREATHING_PATTERNS[selectedPattern], [selectedPattern]);
  
  const {
    sessionState,
    elapsedTime,
    currentPhaseIndex,
    totalBreathCount,
    countdown,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    calculateSessionMetrics,
  } = useBreathingSession({
    pattern: selectedPatternData,
    duration: sessionDuration,
    onComplete: handleSessionComplete,
  });


  const handlePatternChange = (event: any) => {
    if (sessionState === SESSION_STATES.IDLE) {
      setSelectedPattern(event.target.value);
    }
  };

  const handleDurationChange = (event: any) => {
    if (sessionState === SESSION_STATES.IDLE) {
      setSessionDuration(event.target.value);
    }
  };

  const handleStartSession = () => {
    startSession();
    dispatch({ type: 'START_BREATHING_SESSION' });
  };

  const handlePauseResume = () => {
    if (sessionState === SESSION_STATES.ACTIVE) {
      pauseSession();
    } else if (sessionState === SESSION_STATES.PAUSED) {
      resumeSession();
    }
  };

  const handleStop = () => {
    stopSession();
    dispatch({ type: 'END_BREATHING_SESSION' });
  };
  
  const handleRestart = () => {
    setSessionData(null);
    stopSession();
    dispatch({ type: 'END_BREATHING_SESSION' });
  };

  const sessionMetrics = useMemo(() => {
    if (sessionState === SESSION_STATES.IDLE || sessionState === SESSION_STATES.PREPARING) {
      return { progressPercentage: 0 };
    }
    return calculateSessionMetrics();
  }, [calculateSessionMetrics, sessionState]);
  
  const progressPercentage = sessionMetrics.progressPercentage;

  // 設定画面（IDLE状態）
  if (sessionState === SESSION_STATES.IDLE) {
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
              呼吸瞑想
            </Typography>
          </HeaderBox>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 4 }}
          >
            深い呼吸で心を落ち着かせ、集中力を高めましょう
          </Typography>

          <SettingsCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                セッション設定
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>呼吸パターン</InputLabel>
                <Select
                  value={selectedPattern}
                  onChange={handlePatternChange}
                  label="呼吸パターン"
                >
                  {Object.entries(BREATHING_PATTERNS).map(([key, pattern]) => (
                    <MenuItem key={key} value={key}>
                      <Box>
                        <Typography variant="body1">{pattern.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pattern.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>セッション時間</InputLabel>
                <Select
                  value={sessionDuration}
                  onChange={handleDurationChange}
                  label="セッション時間"
                >
                  <MenuItem value={SESSION_DURATIONS.SHORT}>
                    {formatTime(SESSION_DURATIONS.SHORT)}
                  </MenuItem>
                  <MenuItem value={SESSION_DURATIONS.MEDIUM}>
                    {formatTime(SESSION_DURATIONS.MEDIUM)}
                  </MenuItem>
                  <MenuItem value={SESSION_DURATIONS.LONG}>
                    {formatTime(SESSION_DURATIONS.LONG)}
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleStartSession}
                startIcon={<PlayIcon />}
                sx={{
                  borderRadius: 20,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                セッション開始
              </Button>
            </CardContent>
          </SettingsCard>
        </ContentWrapper>
      </GameContainer>
    );
  }

  // 結果画面（COMPLETED状態）
  if (sessionState === SESSION_STATES.COMPLETED) {
    return (
      <SimpleBreathingCompletion
        onRestart={handleRestart}
        onBack={onBack}
      />
    );
  }

  // セッション画面（PREPARING, ACTIVE, PAUSED状態）
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
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {selectedPatternData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sessionState === SESSION_STATES.PREPARING 
                ? '準備中...' 
                : `${formatDuration(elapsedTime)} / ${formatDuration(sessionDuration)}`
              }
            </Typography>
          </Box>
        </HeaderBox>

        {sessionState !== SESSION_STATES.PREPARING && (
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              mb: 4,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              },
            }}
          />
        )}

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sessionState === SESSION_STATES.PREPARING ? (
            <Box sx={{ textAlign: 'center' }}>
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
              <Typography variant="h6" color="text.secondary">
                呼吸の準備をしてください
              </Typography>
            </Box>
          ) : (
            <BreathingCircle
              pattern={selectedPatternData}
              currentPhaseIndex={currentPhaseIndex}
              sessionState={sessionState}
            />
          )}
        </Box>

        {sessionState !== SESSION_STATES.PREPARING && (
          <SessionControls
            sessionState={sessionState}
            onPauseResume={handlePauseResume}
            onStop={handleStop}
            breathCount={totalBreathCount}
          />
        )}
      </ContentWrapper>
    </GameContainer>
  );
};