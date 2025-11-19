# Dinemate Deployment Guide for Vercel

## Prerequisites
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- A GitHub account
- Your project pushed to a GitHub repository

## Environment Variables
Before deploying, you'll need to set up these environment variables in Vercel:

### Required Environment Variables:
1. `MONGODB_URI` - Your MongoDB connection string
2. `JWT_SECRET` - Secret key for JWT token generation
3. `EMAIL_USER` - Email address for nodemailer
4. `EMAIL_PASS` - Email password or app password
5. `GOOGLE_AI_API_KEY` - Google Generative AI API key
6. `NODE_ENV=production`

## Deployment Steps

### Step 1: Prepare Your Repository
1. Make sure all your changes are committed and pushed to GitHub
2. Your project structure should have these files:
   - `vercel.json` (root level)
   - `package.json` (root level)
   - `backend/package.json`
   - `frontend/package.json`

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)
1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project root:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N**
   - What's your project's name? **dinemate** (or your preferred name)
   - In which directory is your code located? **.**

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import from your GitHub repository
4. Configure project settings:
   - Framework Preset: **Other**
   - Root Directory: **/** (leave empty)
   - Build Command: `npm run vercel-build`
   - Output Directory: **frontend/public**

### Step 3: Configure Environment Variables
1. In your Vercel dashboard, go to your project
2. Click on "Settings" → "Environment Variables"
3. Add all the required environment variables mentioned above
4. Make sure to set them for **Production**, **Preview**, and **Development** environments

### Step 4: Update CORS Settings (if needed)
If you encounter CORS issues, the server.js file has been configured to allow Vercel domains. However, you might need to add your specific Vercel URL to the allowed origins.

### Step 5: Test Your Deployment
1. Once deployed, you'll receive a URL like `https://your-project.vercel.app`
2. Test the frontend by visiting the URL
3. Test the API by visiting `https://your-project.vercel.app/api`
4. Check that all API endpoints work correctly

## Important Notes

### Database Connection
- Make sure your MongoDB instance allows connections from Vercel's IP ranges
- If using MongoDB Atlas, add `0.0.0.0/0` to the IP whitelist (for production, consider more restrictive settings)

### File Structure
- The `vercel.json` configuration routes API calls to the backend serverless function
- Static files are served from the `frontend/public` directory
- API routes are prefixed with `/api`

### Environment-Specific Configurations
- The server automatically detects if it's running on Vercel and adjusts accordingly
- Local development still works with `npm run dev` in respective directories
- CORS is configured to work with both local development and production

## Troubleshooting

### Build Failures
1. Check that all dependencies are listed in package.json files
2. Ensure Tailwind CSS builds correctly with `npm run build` in the frontend directory
3. Verify that all imports use correct file extensions (.js)

### API Issues
1. Check environment variables are set correctly
2. Verify database connection string is correct
3. Check Vercel function logs in the dashboard

### CORS Errors
1. The server is configured to allow Vercel domains
2. If you have a custom domain, add it to the allowed origins in server.js

## Post-Deployment
1. Test all functionality thoroughly
2. Set up monitoring and error tracking if needed
3. Configure custom domain if desired
4. Set up automatic deployments from your main branch

## Custom Domain (Optional)
1. In Vercel dashboard, go to "Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Update CORS settings if necessary

Your Dinemate application should now be successfully deployed on Vercel! 🚀