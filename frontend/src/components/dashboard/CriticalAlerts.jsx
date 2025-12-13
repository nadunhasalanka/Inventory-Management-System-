import { Box, Card, CardContent, Typography, Alert, Chip, Button, Grid } from '@mui/material';
import { Warning, MoneyOff, Inventory, LocalShipping } from '@mui/icons-material';

const CriticalAlerts = ({ alerts }) => {
    if (!alerts) return null;

    const hasAlerts =
        (alerts.overduePayments?.count > 0) ||
        (alerts.outOfStock?.count > 0) ||
        (alerts.lowStock?.items?.length > 0) ||
        (alerts.pendingPOs?.count > 0);

    if (!hasAlerts) {
        return (
            <Alert
                severity="success"
                sx={{ mb: 3, borderRadius: 2 }}
                icon={<Inventory />}
            >
                <Typography variant="body2" fontWeight={600}>
                    All systems operational! No critical alerts at this time.
                </Typography>
            </Alert>
        );
    }

    return (
        <Card sx={{ mb: 3, border: '2px solid #ff980030', bgcolor: '#fff3e0' }}>
            <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" mb={2}>
                    <Warning sx={{ color: '#ff9800', mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={700} color="#ff9800">
                        Critical Alerts Requiring Attention
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    {alerts.overduePayments?.count > 0 && (
                        <Grid item xs={12} sm={6} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid #f4433630'
                                }}
                            >
                                <Box display="flex" alignItems="center" mb={1}>
                                    <MoneyOff sx={{ color: '#f44336', mr: 1 }} />
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>
                                        OVERDUE PAYMENTS
                                    </Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="#f44336">
                                    {alerts.overduePayments.count}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Rs {((alerts.overduePayments.amount || 0) / 1000).toFixed(1)}K owed
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {alerts.outOfStock?.count > 0 && (
                        <Grid item xs={12} sm={6} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid #f4433630'
                                }}
                            >
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Inventory sx={{ color: '#f44336', mr: 1 }} />
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>
                                        OUT OF STOCK
                                    </Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="#f44336">
                                    {alerts.outOfStock.count}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Products unavailable
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {alerts.lowStock?.items?.length > 0 && (
                        <Grid item xs={12} sm={6} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid #ff980030'
                                }}
                            >
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Warning sx={{ color: '#ff9800', mr: 1 }} />
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>
                                        LOW STOCK
                                    </Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="#ff9800">
                                    {alerts.lowStock.items.length}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Need restocking
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {alerts.pendingPOs?.count > 0 && (
                        <Grid item xs={12} sm={6} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid #ff980030'
                                }}
                            >
                                <Box display="flex" alignItems="center" mb={1}>
                                    <LocalShipping sx={{ color: '#ff9800', mr: 1 }} />
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>
                                        PENDING POs
                                    </Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="#ff9800">
                                    {alerts.pendingPOs.count}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Awaiting delivery
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default CriticalAlerts;
