// GET /api/users
exports.getUsers = (req, res) => {
    // 1. In a real app, you would call: userService.findAllUsers()
    const users = [{ id: 1, name: 'nadun' }, { id: 2, name: 'expert' }]; 
    
    // 2. Send the standardized response
    res.status(200).json({
        success: true,
        data: users
    });
};

// Example POST /api/users
exports.createUser = (req, res) => {
    const newUser = req.body;
    // 1. In a real app, you would call: userService.saveUser(newUser)
    
    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
    });
};