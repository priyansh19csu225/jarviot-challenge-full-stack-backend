const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);


const prisma = new PrismaClient();

module.exports = {
    oauth2Client,
    prisma,
};
