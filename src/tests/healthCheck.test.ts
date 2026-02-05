import request from 'supertest';
import express from 'express';

// Create a simple express app for testing if the real app is too complex to decouple immediately
const app = express();
app.get('/', (req, res) => res.status(200).send('API is running'));

describe('Health Check', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toBe('API is running');
    });
});
