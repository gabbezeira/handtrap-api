import app from './app';

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`);
    });
}

export default app;