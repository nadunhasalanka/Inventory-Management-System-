import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Divider
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const TopProducts = ({ products }) => {
    if (!products || products.length === 0) return null;

    // Prepare chart data - top 8 products for cleaner display
    const chartData = products.slice(0, 8).map((product, index) => ({
        name: product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name,
        fullName: product.name,
        revenue: product.totalRevenue || 0,
        quantity: product.totalQuantity,
        rank: index + 1
    }));

    // Color gradient
    const colors = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9', '#e8f5e9', '#e8f5e9'];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{
                    bgcolor: 'white',
                    p: 1,
                    border: '1px solid #4caf50',
                    borderRadius: 1,
                    boxShadow: 1
                }}>
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                        {payload[0].payload.fullName}
                    </Typography>
                    <Typography variant="caption" color="#4caf50" display="block" sx={{ fontSize: '0.7rem' }}>
                        Rs {(payload[0].value / 1000).toFixed(1)}K
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                        {payload[0].payload.quantity} units
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <Card sx={{
            height: '100%',
            border: '1px solid #4caf5030',
            bgcolor: '#4caf5005'
        }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        color="#4caf50"
                        sx={{ fontSize: '1rem' }}
                    >
                        Top Products
                    </Typography>
                    <Chip
                        label={`Top ${chartData.length}`}
                        size="small"
                        sx={{
                            bgcolor: '#e8f5e9',
                            color: '#4caf50',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 24
                        }}
                    />
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Optimized Bar Chart */}
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            height={50}
                            tick={{ fontSize: 9 }}
                            stroke="#666"
                        />
                        <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="#4caf50"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Compact Top 3 */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    {chartData.slice(0, 3).map((product, index) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const bgColors = ['#ffd70020', '#c0c0c020', '#cd7f3220'];
                        return (
                            <Box
                                key={index}
                                sx={{
                                    flex: 1,
                                    p: 0.75,
                                    bgcolor: bgColors[index],
                                    borderRadius: 1,
                                    border: '1px solid #e0e0e0',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>
                                    {medals[index]}
                                </Typography>
                                <Typography variant="caption" display="block" fontWeight={700} noWrap sx={{ fontSize: '0.7rem' }}>
                                    {product.name}
                                </Typography>
                                <Typography variant="caption" color="#4caf50" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                                    Rs {(product.revenue / 1000).toFixed(1)}K
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
};

export default TopProducts;
