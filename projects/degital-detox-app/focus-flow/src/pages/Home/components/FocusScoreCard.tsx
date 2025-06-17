import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { getScoreMessage } from '../../../utils';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(3),
  textAlign: 'center',
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowMedium,
  marginBottom: theme.spacing(3),
}));

const ScoreCircle = styled(Box)(({ theme }) => ({
  width: 160,
  height: 160,
  margin: '0 auto 20px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  background: `conic-gradient(${theme.custom.accentGradient} 0deg, ${theme.custom.accentGradient} var(--angle), #e0e0e0 var(--angle))`,
  
  [theme.breakpoints.down('sm')]: {
    width: 140,
    height: 140,
  },
}));

const ScoreInner = styled(Box)(({ theme }) => ({
  width: 130,
  height: 130,
  background: theme.palette.mode === 'dark' ? '#1A1A1A' : 'white',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  
  [theme.breakpoints.down('sm')]: {
    width: 110,
    height: 110,
    fontSize: '2rem',
  },
}));

interface FocusScoreCardProps {
  score: number;
}

export const FocusScoreCard: React.FC<FocusScoreCardProps> = ({ score }) => {
  const angle = (score / 100) * 360;
  const message = getScoreMessage(score);

  return (
    <StyledCard>
      <CardContent>
        <ScoreCircle
          sx={{
            '--angle': `${angle}deg`,
          }}
        >
          <ScoreInner>
            {score}
          </ScoreInner>
        </ScoreCircle>
        
        <Typography
          variant="h6"
          sx={{ 
            color: 'text.primary',
            fontWeight: 600,
            mb: 1,
          }}
        >
          {message}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          継続して集中力を向上させましょう
        </Typography>
      </CardContent>
    </StyledCard>
  );
};