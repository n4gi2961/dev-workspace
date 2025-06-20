import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    padding: theme.spacing(1),
    maxWidth: 400,
  },
}));


const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  padding: '10px 24px',
  fontWeight: 600,
  textTransform: 'none',
}));

interface DetoxEndDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentDuration: string;
}

export const DetoxEndDialog: React.FC<DetoxEndDialogProps> = ({
  open,
  onClose,
  onConfirm,
  currentDuration,
}) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      aria-labelledby="detox-end-dialog-title"
      aria-describedby="detox-end-dialog-description"
    >
      <DialogTitle 
        id="detox-end-dialog-title"
        sx={{ 
          textAlign: 'center',
          pb: 1,
          fontWeight: 600
        }}
      >
        終了しますか？
      </DialogTitle>
      
      <DialogContent>
        <Typography 
          id="detox-end-dialog-description"
          variant="body1"
          sx={{ 
            textAlign: 'center',
            mb: 2,
            color: 'text.primary'
          }}
        >
          現在の集中時間: <strong>{currentDuration}</strong>
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
        <ActionButton
          onClick={onClose}
          variant="outlined"
          color="primary"
        >
          続ける
        </ActionButton>
        
        <ActionButton
          onClick={onConfirm}
          variant="contained"
          color="primary"
        >
          終了する
        </ActionButton>
      </DialogActions>
    </StyledDialog>
  );
};