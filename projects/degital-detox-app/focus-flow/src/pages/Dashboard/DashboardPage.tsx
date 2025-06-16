import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';

const ChartPlaceholder = styled(Box)(({ theme }) => ({
  height: 200,
  background: 'linear-gradient(to right, #f0f0f0, #e0e0e0)',
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  fontSize: '1rem',
  fontWeight: 500,
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: theme.palette.mode === 'dark' ? '#2A2A2A' : 'white',
  boxShadow: theme.custom.shadowLight,
  marginBottom: theme.spacing(3),
}));

export const DashboardPage: React.FC = () => {
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
        分析ダッシュボード
      </Typography>

      <StyledCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            週間集中力トレンド
          </Typography>
          <ChartPlaceholder>
            グラフエリア（Chart.js実装予定）
          </ChartPlaceholder>
        </CardContent>
      </StyledCard>

      <StyledCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            時間帯別パフォーマンス
          </Typography>
          <ChartPlaceholder>
            グラフエリア（Chart.js実装予定）
          </ChartPlaceholder>
        </CardContent>
      </StyledCard>

      <StyledCard>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            アプリ使用時間分析
          </Typography>
          <ChartPlaceholder>
            グラフエリア（Chart.js実装予定）
          </ChartPlaceholder>
        </CardContent>
      </StyledCard>
    </Box>
  );
};