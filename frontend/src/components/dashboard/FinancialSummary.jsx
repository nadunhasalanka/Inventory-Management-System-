import {
    Card,
    CardContent,
    Typography,
    Box,
    Divider
} from '@mui/material';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip
} from 'recharts';

const FinancialSummary = ({ financial }) => {
    if (!financial) return null;

    const { totalRevenue = {}, cashRevenue = {}, creditRevenue = {}, receivables = {} } = financial;
    const totalRevenueValue = totalRevenue.value || 0;
    const cashValue = cashRevenue.value || 0;
    const creditValue = creditRevenue.value || 0;

    // Prepare pie chart data
    const pieData = [
        { name: 'Cash', value: cashValue, color: '#4caf50' },
        { name: 'Credit', value: creditValue, color: '#2196f3' }
    ].filter(item => item.value > 0);

    return (
        <Card sx={{
            height: '100%',
            border: '1px solid #4caf5030',
            bgcolor: '#4caf5005'
        }}>
            <CardContent sx={{ p: 2 }}>
                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="#4caf50"
                    sx={{ mb: 1.5, fontSize: '1rem' }}
                >
                    Financial Summary
                </Typography>
                <Divider sx={{ mb: 1.5 }} />

                {/* Total Revenue */}
                <Box mb={2} textAlign="center">
                    <Typography
                        variant="caption"
                        color="textSecondary"
                        fontWeight={600}
                        sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                    >
                        Total Revenue
                    </Typography>
                    <Typography
                        variant="h3"
                        fontWeight={700}
                        color="#4caf50"
                        sx={{ fontSize: '2rem' }}
                    >
                        Rs {(totalRevenueValue / 1000).toFixed(1)}K
                    </Typography>
                </Box>

                {/* Compact Pie Chart */}
                {pieData.length > 0 && (
                    <Box mb={2}>
                        <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `Rs ${(value / 1000).toFixed(1)}K`}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #4caf50',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        padding: 8
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Compact Legend */}
                        <Box display="flex" justifyContent="center" gap={2} mt={-1}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%' }} />
                                <Typography variant="caption" fontSize="0.7rem">
                                    Cash: Rs {(cashValue / 1000).toFixed(1)}K
                                </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Box sx={{ width: 12, height: 12, bgcolor: '#2196f3', borderRadius: '50%' }} />
                                <Typography variant="caption" fontSize="0.7rem">
                                    Credit: Rs {(creditValue / 1000).toFixed(1)}K
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Compact Receivables */}
                <Box
                    sx={{
                        p: 1.5,
                        bgcolor: '#fff3e0',
                        borderRadius: 1.5,
                        border: '1px solid #ff980030'
                    }}
                >
                    <Typography
                        variant="caption"
                        color="textSecondary"
                        fontWeight={600}
                        sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                    >
                        Outstanding Receivables
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="h6" fontWeight={700} color="#ff9800" sx={{ fontSize: '1.1rem' }}>
                            Rs {((receivables.value || 0) / 1000).toFixed(1)}K
                        </Typography>
                        <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                            {receivables.count || 0} customers
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default FinancialSummary;
