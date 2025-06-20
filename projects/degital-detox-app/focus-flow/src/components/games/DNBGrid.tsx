import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DNBTrial } from '../../types/dnb';
import { DNB_CONFIG, DNB_COLORS, DNB_ANIMATIONS } from '../../constants/dnb';

const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gridTemplateRows: 'repeat(3, 1fr)',
  gap: theme.spacing(1),
  aspectRatio: '1',
  maxWidth: 300,
  width: '100%',
  margin: '0 auto',
  padding: theme.spacing(2),
}));

const GridCell = styled(Box)<{ 
  isActive: boolean; 
  showStimulus: boolean;
  feedback?: 'correct' | 'incorrect' | null;
}>(({ theme, isActive, showStimulus, feedback }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: isActive && showStimulus 
    ? DNB_COLORS.GRID_ACTIVE 
    : DNB_COLORS.GRID_INACTIVE,
  borderRadius: 12,
  border: feedback === 'correct' 
    ? `3px solid ${DNB_COLORS.CORRECT_FEEDBACK}`
    : feedback === 'incorrect'
    ? `3px solid ${DNB_COLORS.INCORRECT_FEEDBACK}`
    : '2px solid transparent',
  boxShadow: isActive && showStimulus
    ? `0 8px 16px rgba(42, 157, 143, 0.3)`
    : theme.custom?.shadowLight || '0 2px 8px rgba(0,0,0,0.1)',
  transition: `all ${DNB_ANIMATIONS.GRID_FADE_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
  transform: isActive && showStimulus ? 'scale(1.05)' : 'scale(1)',
  opacity: showStimulus ? (isActive ? 1 : 0.3) : 0.6,
  position: 'relative',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isActive && showStimulus
      ? 'linear-gradient(135deg, rgba(42, 157, 143, 0.2), rgba(42, 157, 143, 0.4))'
      : 'transparent',
    borderRadius: 'inherit',
    transition: `opacity ${DNB_ANIMATIONS.GRID_FADE_DURATION}ms ease-in-out`,
  }
}));

const NumberText = styled(Typography)<{ 
  showStimulus: boolean;
  isActive: boolean;
}>(({ showStimulus, isActive }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: DNB_COLORS.NUMBER_TEXT,
  zIndex: 1,
  transform: showStimulus && isActive ? 'scale(1)' : 'scale(0)',
  opacity: showStimulus && isActive ? 1 : 0,
  transition: `all ${DNB_ANIMATIONS.NUMBER_SCALE_DURATION}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
}));

const FeedbackOverlay = styled(Box)<{ 
  show: boolean;
  type: 'correct' | 'incorrect';
}>(({ show, type }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: type === 'correct' 
    ? DNB_COLORS.CORRECT_FEEDBACK 
    : DNB_COLORS.INCORRECT_FEEDBACK,
  opacity: show ? 0.8 : 0,
  transition: `opacity ${DNB_ANIMATIONS.FEEDBACK_DURATION}ms ease-in-out`,
  borderRadius: 'inherit',
  pointerEvents: 'none',
  zIndex: 2,
}));

interface DNBGridProps {
  currentTrial: DNBTrial | null;
  showStimulus: boolean;
  feedback?: 'correct' | 'incorrect' | null;
}

export const DNBGrid: React.FC<DNBGridProps> = ({
  currentTrial,
  showStimulus,
  feedback
}) => {
  const renderGridCell = (row: number, col: number) => {
    const isActive = currentTrial && 
                    currentTrial.position.row === row && 
                    currentTrial.position.col === col;

    return (
      <GridCell
        key={`${row}-${col}`}
        isActive={!!isActive}
        showStimulus={showStimulus}
        feedback={feedback}
      >
        {isActive && (
          <>
            <NumberText
              showStimulus={showStimulus}
              isActive={!!isActive}
              variant="h3"
            >
              {currentTrial?.number}
            </NumberText>
            {feedback && (
              <FeedbackOverlay
                show={!!feedback}
                type={feedback}
              />
            )}
          </>
        )}
      </GridCell>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GridContainer>
        {Array.from({ length: DNB_CONFIG.GRID_SIZE }, (_, row) =>
          Array.from({ length: DNB_CONFIG.GRID_SIZE }, (_, col) =>
            renderGridCell(row, col)
          )
        )}
      </GridContainer>
      
      {/* グリッド下部の情報表示 */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        {currentTrial && (
          <Typography variant="body2" color="text.secondary">
            Trial {currentTrial.index + 1}
          </Typography>
        )}
      </Box>
    </Box>
  );
};