import { Box, Card, CardContent, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatCard = ({ title, value, subtitle, trend, color }) => {
    const isPositive = trend && parseFloat(trend) > 0;

    return (
        <Card sx={{
            height: '100%',
            bgcolor: color === 'warning' ? '#fff3e0' : color === 'info' ? '#e3f2fd' : '#e8f5e9',
            border: `1px solid ${color === 'warning' ? '#ff980030' : color === 'info' ? '#2196f330' : '#4caf5030'}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }
        }}>
            <CardContent sx={{ p: 2.5 }}>
                <Typography
                    variant="overline"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: 'text.secondary'
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="h3"
                    sx={{
                        my: 1,
                        fontWeight: 700,
                        fontSize: '2rem',
                        lineHeight: 1,
                        color: color === 'warning' ? '#ff9800' : color === 'info' ? '#2196f3' : '#4caf50'
                    }}
                >
                    {value}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            mb: trend ? 0.5 : 0
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
                {trend && (
                    <Box display="flex" alignItems="center" mt={1}>
                        {isPositive ?
                            <TrendingUp sx={{ fontSize: 16, mr: 0.5, color: '#4caf50' }} /> :
                            <TrendingDown sx={{ fontSize: 16, mr: 0.5, color: '#f44336' }} />
                        }
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: isPositive ? '#4caf50' : '#f44336'
                            }}
                        >
                            {isPositive ? '+' : ''}{trend}% vs last period
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const KPICards = ({ kpis }) => {
    if (!kpis) return null;

    const cards = [
        {
            title: 'Total Revenue',
            value: `Rs ${((kpis.totalRevenue?.value || 0) / 1000).toFixed(1)}K`,
            subtitle: 'All time',
            trend: kpis.totalRevenue?.change,
            color: 'success'
        },
        {
            title: "Today's Sales",
            value: `Rs ${((kpis.todaySales?.value || 0) / 1000).toFixed(1)}K`,
            subtitle: `${kpis.todaySales?.count || 0} orders`,
            color: 'success'
        },
        {
            title: 'Active Customers',
            value: kpis.activeCustomers?.value || 0,
            subtitle: 'Total customers',
            color: 'info'
        },
        {
            title: 'Low Stock Alerts',
            value: kpis.lowStock?.value || 0,
            subtitle: 'Items need restock',
            color: 'warning'
        },
        {
            title: 'Credit Outstanding',
            value: `Rs ${((kpis.creditOutstanding?.value || 0) / 1000).toFixed(1)}K`,
            subtitle: `${kpis.creditOutstanding?.count || 0} customers`,
            color: 'warning'
        },
        {
            title: 'Pending Orders',
            value: kpis.pendingOrders?.value || 0,
            subtitle: 'Need attention',
            color: 'warning'
        },
        {
            title: 'Total Products',
            value: kpis.totalProducts?.value || 0,
            subtitle: 'In inventory',
            color: 'info'
        },
        {
            title: 'Monthly Revenue',
            value: `Rs ${((kpis.monthlyRevenue?.value || 0) / 1000).toFixed(1)}K`,
            subtitle: `Target: Rs ${((kpis.monthlyRevenue?.target || 0) / 1000).toFixed(0)}K`,
            trend: kpis.monthlyRevenue?.change,
            color: 'success'
        }
    ];

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(4, 1fr)'
                },
                gap: 2,
                mb: 3
            }}
        >
            {cards.map((card, index) => (
                <StatCard key={index} {...card} />
            ))}
        </Box>
    );
};

export default KPICards;
