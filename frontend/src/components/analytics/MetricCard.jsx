import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';

const MetricCard = ({ title, value, subtitle, loading, icon: Icon, color = '#1976d2' }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {Icon && (
            <Box
              sx={{
                backgroundColor: color,
                borderRadius: '10px',
                p: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Icon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
              {value}
            </Typography>

            {subtitle && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
