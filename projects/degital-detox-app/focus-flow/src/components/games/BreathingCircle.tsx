import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { 
  BreathingPattern, 
  PHASE_COLORS, 
  SESSION_STATES, 
  SessionState 
} from '../../constants/breathing';

// 呼吸アニメーション用のキーフレーム
const breatheIn = keyframes`
  0% {
    transform: scale(0.8);
  }
  100% {
    transform: scale(1.5);
  }
`;

const breatheOut = keyframes`
  0% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(0.8);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
`;

const CircleContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  width: 300,
  height: 300,
  margin: '0 auto',
}));

const BreathingCircleElement = styled(Box)<{
  phaseType: string;
  phaseDuration: number;
  isActive: boolean;
}>(({ theme, phaseType, phaseDuration, isActive }) => ({
  width: 200,
  height: 200,
  borderRadius: '50%',
  background: `radial-gradient(circle, ${PHASE_COLORS[phaseType as keyof typeof PHASE_COLORS]}, ${PHASE_COLORS[phaseType as keyof typeof PHASE_COLORS]}AA)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  boxShadow: `0 0 30px ${PHASE_COLORS[phaseType as keyof typeof PHASE_COLORS]}40`,
  transition: 'all 0.3s ease',
  
  ...(isActive && phaseType === 'inhale' && {
    animation: `${breatheIn} ${phaseDuration}ms ease-in-out`,
  }),
  
  ...(isActive && phaseType === 'exhale' && {
    animation: `${breatheOut} ${phaseDuration}ms ease-in-out`,
  }),
  
  ...(isActive && phaseType === 'hold' && {
    animation: `${pulse} 2s ease-in-out infinite`,
  }),
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: '50%',
    background: `linear-gradient(45deg, ${PHASE_COLORS[phaseType as keyof typeof PHASE_COLORS]}20, transparent)`,
    animation: isActive ? `${pulse} 3s ease-in-out infinite` : 'none',
  },
}));

const InstructionText = styled(Typography)(({ theme }) => ({
  color: 'white',
  fontWeight: 600,
  fontSize: '1.5rem',
  textAlign: 'center',
  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  zIndex: 1,
}));

const PhaseIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -50,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const CountdownText = styled(Typography)(({ theme }) => ({
  fontSize: '3rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

const PreparationCircle = styled(Box)(({ theme }) => ({
  width: 200,
  height: 200,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${pulse} 1s ease-in-out infinite`,
}));

interface BreathingCircleProps {
  pattern: BreathingPattern;
  currentPhaseIndex: number;
  sessionState: SessionState;
  countdown?: number;
}

export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  pattern,
  currentPhaseIndex,
  sessionState,
  countdown = 0,
}) => {
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const currentPhase = pattern.phases[currentPhaseIndex] || pattern.phases[0];
  const isActive = sessionState === SESSION_STATES.ACTIVE;
  const isPreparing = sessionState === SESSION_STATES.PREPARING;

  // フェーズが変更されるたびにアニメーションキーを更新
  useEffect(() => {
    if (isActive) {
      setAnimationKey(prev => prev + 1);
      setPhaseProgress(0);
    }
  }, [currentPhaseIndex, isActive]);

  // プログレスサークルの計算
  useEffect(() => {
    if (!isActive) return;

    setPhaseProgress(0);
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / currentPhase.duration) * 100, 100);
      setPhaseProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentPhaseIndex, isActive, currentPhase.duration]);

  // 準備中の表示
  if (isPreparing && countdown > 0) {
    return (
      <CircleContainer>
        <PreparationCircle>
          <CountdownText>{countdown}</CountdownText>
        </PreparationCircle>
        <PhaseIndicator>
          <Typography variant="body1" color="text.secondary">
            まもなく開始します...
          </Typography>
        </PhaseIndicator>
      </CircleContainer>
    );
  }

  return (
    <CircleContainer>
      <BreathingCircleElement
        key={animationKey}
        phaseType={currentPhase.type}
        phaseDuration={currentPhase.duration}
        isActive={isActive}
      >
        <InstructionText>
          {currentPhase.instruction}
        </InstructionText>
        
        {/* プログレスリング */}
        <svg
          style={{
            position: 'absolute',
            top: -5,
            left: -5,
            width: 210,
            height: 210,
          }}
        >
          <circle
            cx="105"
            cy="105"
            r="100"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
          />
          <circle
            cx="105"
            cy="105"
            r="100"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 100}`}
            strokeDashoffset={`${2 * Math.PI * 100 * (1 - phaseProgress / 100)}`}
            transform="rotate(-90 105 105)"
            style={{
              transition: 'stroke-dashoffset 0.1s ease',
            }}
          />
        </svg>
      </BreathingCircleElement>

      <PhaseIndicator>
        <Typography variant="body2" color="text.secondary">
          フェーズ {currentPhaseIndex + 1} / {pattern.phases.length}
        </Typography>
      </PhaseIndicator>
    </CircleContainer>
  );
};