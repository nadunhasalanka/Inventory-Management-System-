import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Paid, CreditCard } from '@mui/icons-material';

const PaymentBreakdown = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Breakdown
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" height={150}>
            Loading...
          </Box>
        </CardContent>
      </Card>
    );
  }

  const totalSales = (data.cashSales || 0) + (data.creditSales || 0);
  const cashPercentage = totalSales > 0 ? ((data.cashSales / totalSales) * 100).toFixed(1) : 0;
  const creditPercentage = totalSales > 0 ? ((data.creditSales / totalSales) * 100).toFixed(1) : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Payment Breakdown
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                backgroundColor: '#4caf50', 
                borderRadius: '12px', 
                p: 1.5, 
                mb: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Paid sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Cash Sales
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                ${(data.cashSales || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {cashPercentage}% • {data.cashCount || 0} orders
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                backgroundColor: '#2196f3', 
                borderRadius: '12px', 
                p: 1.5, 
                mb: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Credit Sales
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                ${(data.creditSales || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {creditPercentage}% • {data.creditCount || 0} orders
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            <Box sx={{ 
              flex: cashPercentage, 
              height: 8, 
              backgroundColor: '#4caf50', 
              borderRadius: '4px 0 0 4px' 
            }} />
            <Box sx={{ 
              flex: creditPercentage, 
              height: 8, 
              backgroundColor: '#2196f3', 
              borderRadius: '0 4px 4px 0' 
            }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PaymentBreakdown;
