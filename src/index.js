const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const router = require('./route/route');

const app = express();

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use('/',router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});