exports.authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }
    
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role (${req.user.role}) is not authorized to access this resource.`
            });
        }
        
        next(); 
    };
};