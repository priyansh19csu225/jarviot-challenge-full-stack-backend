const { oauth2Client , prisma } = require('../services/services');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

async function generateAuthUrl(req, res) {
    try {
       
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', 
            scope: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/drive.readonly',
            ],
        });

        res.status(200).json(url);
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate auth URL' });
    }
}

async function findUserByEmail(email) {
    return await prisma.users.findUnique({
        where: {
            user_email: email,
        },
    });
}

async function handleGoogleRedirect(req, res) {
    try {
        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code.toString());
        const email = jwt.decode(tokens.id_token).email;
        oauth2Client.setCredentials(tokens);

        const existingUser = await findUserByEmail(email);

        if (!existingUser) {
            const expires_at = new Date(tokens.expiry_date);
            const body = {
                user_email: email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at
            };

            await prisma.users.create({
                data: body,
            });
        }

        const redirectUrl = `${process.env.FRONTEND_URL}/analytics?email=${email}`;
        res.status(302).redirect(redirectUrl);
    } catch (error) {
        console.error('Error handling Google redirect:', error);
        res.status(500).json({ error: 'Failed to handle Google redirect' });
    }
}

function isAccessTokenExpired(expires_at) {
    let now = Date.now();
    now = new Date(now).getTime();
    const expires_at_ms = new Date(expires_at).getTime();
    return expires_at_ms < now;
}


async function getAnalytics(req, res) {
    try {
        const { email } = req.query;

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { access_token, refresh_token , expires_at } = user;

        oauth2Client.setCredentials({
            access_token,
            refresh_token,
        });

    
        if (isAccessTokenExpired(expires_at)) {
      
            const { tokens } = await oauth2Client.refreshToken(refresh_token);
            const expires_at = new Date(tokens.expiry_date);
            await prisma.users.update({
                where: { user_email: email },
                data: { access_token: tokens.access_token , expires_at},
            });

            oauth2Client.setCredentials({
                access_token: tokens.access_token,
                refresh_token,
            });
        }

       
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

const results = await drive.files.list({
  pageSize: 25,
  q: "'me' in owners or 'me' in writers",
  fields: 'nextPageToken, files(id, name,  mimeType, size, webViewLink,permissions,ownedByMe,createdTime,modifiedTime,fileExtension,shared,owners)'
});


const about = await drive.about.get({
    fields: 'storageQuota'
});


const totalUsage = about.data.storageQuota.usage;
const limit = about.data.storageQuota.limit;

const calculateRiskScore = (file) => {
    let riskScore = 0;
  
    // Check mimetype and file extension
    if (
      file.mimeType.includes('application') ||
      (file.fileExtension && file.fileExtension.toLowerCase() === 'exe')
    ) {
      riskScore = 1; // Very dangerous
    } else if (
      file.mimeType.includes('script') ||
      file.fileExtension === 'js'
    ) {
      riskScore = 0.5; // Somewhat dangerous
    }
  

    // Check if the file is shared
    if (file.shared && riskScore < 1) {
      riskScore += 0.5; // Add 0.5 to the score if shared
    }

    // Check if the file is owned by the user
    if (file.ownedByMe && riskScore > 0) {
        riskScore -= 0.5; // Subtract 0.5 from the score if owned by the user
    }
    
    // Check the file size
    if (file.size > 10485760 && riskScore < 1) {
      riskScore += 0.5; // Add 0.5 to the score if the size is greater than 10 MB
    }
  
    return riskScore;
  }
  
  // Calculate riskscores for each file and create riskcounter
  let totalRiskScore = 0;
  let totalFiles = 0;
  
  for (const file of results.data.files) {
    file.riskscore = calculateRiskScore(file);
    totalRiskScore += file.riskscore;
    totalFiles++;
  }
  
  // Calculate riskcounter as a percentage
  const riskCounter = (totalRiskScore / (totalFiles * 1.0)) * 100;
  
  const body = {
    totalUsage,
    limit,
    files: results.data.files,
    riskCounter,
  };
  
  res.status(200).json(body);

    } catch (error) {
        console.error('Error fetching Google Drive analytics:', error);
        res.status(500).json({ error: 'Failed to fetch Google Drive analytics' });
    }
}

function revokeAccessToken(token) {
    return new Promise((resolve, reject) => {
        oauth2Client.revokeToken(token, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
}

async function revokeAccessAndDeleteUser(req, res) {
    try {
        const { email } = req.query;

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { access_token } = user;
        await revokeAccessToken(access_token);

        await prisma.users.delete({
            where: { user_email: email },
        });

        res.status(200).json({ message: 'Access revoked and user deleted successfully' });
    } catch (error) {
        console.error('Error revoking access and deleting user:', error);
        res.status(500).json({ error: 'Failed to revoke access and delete user' });
    }
}


module.exports = {
    generateAuthUrl,
    handleGoogleRedirect,
    getAnalytics,
    revokeAccessAndDeleteUser
};
