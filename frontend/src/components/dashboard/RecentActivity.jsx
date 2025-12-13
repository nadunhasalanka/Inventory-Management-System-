import {
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Box,
    Divider
} from '@mui/material';
import { History } from '@mui/icons-material';

const RecentActivity = ({ activities }) => {
    if (!activities || activities.length === 0) {
        return (
            <Card sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" fontWeight={700} color="#4caf50" mb={2}>
                        Recent Activity
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center" py={3}>
                        No recent activity
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const getTransactionColor = (type) => {
        switch (type) {
            case 'IN':
                return { bgcolor: '#4caf5020', color: '#4caf50' };
            case 'OUT':
                return { bgcolor: '#f4433620', color: '#f44336' };
            default:
                return { bgcolor: '#e0e0e0', color: '#666' };
        }
    };

    return (
        <Card sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={700} color="#4caf50">
                        Recent Activity
                    </Typography>
                    <Chip
                        icon={<History />}
                        label={`Last ${activities.length}`}
                        sx={{ bgcolor: '#4caf50', color: 'white', fontWeight: 600 }}
                        size="small"
                    />
                </Box>
                <Divider sx={{ mb: 2 }} />

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Product</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Qty</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>User</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Time</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activities.slice(0, 10).map((log, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>
                                        <Chip
                                            label={log.transaction_type}
                                            size="small"
                                            sx={{
                                                ...getTransactionColor(log.transaction_type),
                                                fontWeight: 600,
                                                minWidth: 50
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {log.product_id?.name || 'N/A'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" fontWeight={700}>
                                            {log.quantity}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {log.user_id
                                                ? `${log.user_id.first_name || ''} ${log.user_id.last_name || ''}`.trim()
                                                || log.user_id.username
                                                || log.user_id.email
                                                : 'System'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

export default RecentActivity;
