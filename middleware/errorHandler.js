const errorHandler = (err, req, res, next) => {
    console.error('Error details:', err);
    console.error('Stack trace:', err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }
    
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(500).json({
            error: 'Database Error',
            details: err.message
        });
    }
    
    res.status(500).json({
        error: 'Internal Server Error',
        details: err.message
    });
};

module.exports = errorHandler;
