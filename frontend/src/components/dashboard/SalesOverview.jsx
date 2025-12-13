import {
    Card,
    CardContent,
    Typography,
    Box,
    Divider,
    Chip
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const SalesOverview = ({ salesData }) => {
    if (!salesData || !salesData.trend) return null;

    const { trend = [] } = salesData;
    const totalSales = trend.reduce((sum, day) => sum + (day.sales || 0), 0);
    const totalOrders = trend.reduce((sum, day) => sum + (day.orders || 0), 0);

    // Prepare chart data
    const chartData = trend.map(day => ({
        date: new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: day.sales,
        orders: day.orders
    }));

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
                        7-Day Sales Trend
                    </Typography>
                    <Box display="flex" gap={0.5}>
                        <Chip
                            label={`${totalOrders} Orders`}
                            size="small"
                            sx={{
                                bgcolor: '#e8f5e9',
                                color: '#4caf50',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 24
                            }}
                        />
                        <Chip
                            label={`Rs ${(totalSales / 1000).toFixed(1)}K`}
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
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {trend.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" align="center" py={3}>
                        No sales data available
                    </Typography>
                ) : (
                    <Box>
                        {/* Optimized Line Chart */}
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    stroke="#666"
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 10 }}
                                    stroke="#4caf50"
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 10 }}
                                    stroke="#2196f3"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #4caf50',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        padding: 8
                                    }}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#4caf50"
                                    strokeWidth={2.5}
                                    dot={{ fill: '#4caf50', r: 3 }}
                                    name="Revenue (Rs)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#2196f3"
                                    strokeWidth={2}
                                    dot={{ fill: '#2196f3', r: 2 }}
                                    name="Orders"
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        {/* Compact Stats */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                            <Box sx={{ flex: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                                    AVG DAILY
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#4caf50" sx={{ fontSize: '0.85rem' }}>
                                    Rs {(totalSales / trend.length).toFixed(0)}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                                    AVG ORDER
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#2196f3" sx={{ fontSize: '0.85rem' }}>
                                    Rs {totalOrders > 0 ? (totalSales / totalOrders).toFixed(0) : 0}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                                    BEST DAY
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="#ff9800" sx={{ fontSize: '0.85rem' }}>
                                    Rs {Math.max(...trend.map(d => d.sales)).toFixed(0)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default SalesOverview;
