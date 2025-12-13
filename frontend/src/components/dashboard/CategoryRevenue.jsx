import {
    Card,
    CardContent,
    Typography,
    Box,
    Divider,
    Chip
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

const CategoryRevenue = ({ revenueData }) => {
    if (!revenueData || revenueData.length === 0) return null;

    // Prepare chart data
    const chartData = revenueData.slice(0, 8).map((category) => ({
        name: category._id || 'Uncategorized',
        revenue: category.totalRevenue || 0,
        quantity: category.totalQuantity || 0
    }));

    const totalRevenue = chartData.reduce((sum, cat) => sum + cat.revenue, 0);

    // Color palette
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#ff5722', '#3f51b5'];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const percentage = totalRevenue > 0 ? ((payload[0].value / totalRevenue) * 100).toFixed(1) : 0;
            return (
                <Box sx={{
                    bgcolor: 'white',
                    p: 1,
                    border: '1px solid #4caf50',
                    borderRadius: 1,
                    boxShadow: 1
                }}>
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                        {payload[0].payload.name}
                    </Typography>
                    <Typography variant="caption" color="#4caf50" display="block" sx={{ fontSize: '0.7rem' }}>
                        Rs {(payload[0].value / 1000).toFixed(1)}K ({percentage}%)
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                        {payload[0].payload.quantity} items sold
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
                        Revenue by Category
                    </Typography>
                    <Chip
                        label={`Rs ${(totalRevenue / 1000).toFixed(1)}K`}
                        size="small"
                        sx={{
                            bgcolor: '#4caf50',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 24
                        }}
                    />
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Horizontal Bar Chart */}
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={true} vertical={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 10 }}
                            stroke="#666"
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            width={80}
                            stroke="#666"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Category Stats */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                            CATEGORIES
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#4caf50" sx={{ fontSize: '0.9rem' }}>
                            {chartData.length}
                        </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                            TOP CATEGORY
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#2196f3" sx={{ fontSize: '0.75rem' }} noWrap>
                            {chartData[0]?.name || 'N/A'}
                        </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                            AVG/CATEGORY
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#ff9800" sx={{ fontSize: '0.9rem' }}>
                            Rs {chartData.length > 0 ? ((totalRevenue / chartData.length) / 1000).toFixed(1) : 0}K
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CategoryRevenue;
