import {
    Card,
    CardContent,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Chip,
    Divider
} from '@mui/material';

const InventoryStatus = ({ inventory }) => {
    if (!inventory) return null;

    const { totalValue = {}, lowStockItems = [], outOfStockCount = {} } = inventory;

    return (
        <Card sx={{
            height: '100%',
            border: '1px solid #4caf5030',
            bgcolor: '#4caf5005'
        }}>
            <CardContent sx={{ p: 2.5 }}>
                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="#4caf50"
                    sx={{ mb: 2 }}
                >
                    Inventory Status
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                {/* Total Inventory Value */}
                <Box mb={3}>
                    <Typography
                        variant="caption"
                        color="textSecondary"
                        fontWeight={600}
                        sx={{ textTransform: 'uppercase' }}
                    >
                        Total Inventory Value
                    </Typography>
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        color="#4caf50"
                    >
                        Rs {((totalValue.value || 0) / 1000).toFixed(1)}K
                    </Typography>
                </Box>

                {/* Stock Alerts Summary */}
                <Box display="flex" gap={1.5} mb={3}>
                    <Box
                        sx={{
                            flex: 1,
                            p: 1.5,
                            bgcolor: '#fff3e0',
                            borderRadius: 1.5,
                            border: '1px solid #ff980030'
                        }}
                    >
                        <Typography variant="caption" color="textSecondary" fontWeight={600}>
                            LOW STOCK
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="#ff9800">
                            {lowStockItems.length}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            p: 1.5,
                            bgcolor: '#ffebee',
                            borderRadius: 1.5,
                            border: '1px solid #f4433630'
                        }}
                    >
                        <Typography variant="caption" color="textSecondary" fontWeight={600}>
                            OUT OF STOCK
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="#f44336">
                            {outOfStockCount.value || 0}
                        </Typography>
                    </Box>
                </Box>

                {/* Low Stock Items List */}
                {lowStockItems.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="textSecondary" mb={1}>
                            Low Stock Items ({lowStockItems.length})
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                            <List dense disablePadding>
                                {lowStockItems.slice(0, 5).map((item, index) => (
                                    <ListItem
                                        key={index}
                                        sx={{
                                            px: 1.5,
                                            py: 1,
                                            bgcolor: '#fff3e0',
                                            borderRadius: 1,
                                            mb: 0.5,
                                            border: '1px solid #ff980020'
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" fontWeight={500}>
                                                    {item.name || 'Unknown Product'}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="textSecondary">
                                                    Current: {item.quantity || 0} | Min: {item.minStock || 0}
                                                </Typography>
                                            }
                                        />
                                        <Chip
                                            label={`${item.quantity || 0} left`}
                                            size="small"
                                            sx={{
                                                bgcolor: '#ff9800',
                                                color: 'white',
                                                fontWeight: 600
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            {lowStockItems.length > 5 && (
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                                    +{lowStockItems.length - 5} more items
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default InventoryStatus;
