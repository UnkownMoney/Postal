import express from 'express';
import bodyParser from 'body-parser';
import userRoutes from './routes/UserRoutes';
import postalRoutes from './routes/PostalRoutes';

const app = express();
const PORT = 3000;

// Logging middleware to trace requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json());

app.use('/api/user', userRoutes);
app.use('/api/postal', postalRoutes);

app.use(express.static('src/public'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
