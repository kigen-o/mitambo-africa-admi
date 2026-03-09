#!/bin/bash
# Automated Deployment Script for admin.mitambo.africa
# Run this in cPanel Terminal

echo "🚀 Starting Mitambo Africa Admin Deployment..."
echo "================================================"

# Step 1: Navigate to app directory
echo ""
echo "📁 Step 1: Navigating to app directory..."
cd /home/kigsilco/admin.mitambo.africa
if [ $? -eq 0 ]; then
    echo "✅ Successfully navigated to /home/kigsilco/admin.mitambo.africa"
else
    echo "❌ Failed to navigate to directory"
    exit 1
fi

# Step 2: Rename environment file
echo ""
echo "⚙️  Step 2: Configuring environment..."
if [ -f .env.production ]; then
    mv .env.production .env
    echo "✅ Environment file configured"
else
    echo "⚠️  .env.production not found, checking if .env already exists..."
    if [ -f .env ]; then
        echo "✅ .env already exists"
    else
        echo "❌ No environment file found"
        exit 1
    fi
fi

# Step 3: Install dependencies
echo ""
echo "📦 Step 3: Installing dependencies..."
echo "⏱️  This may take 2-5 minutes..."
npm install --production
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    echo "💡 You may need to use cPanel's 'Run NPM Install' button instead"
fi

# Step 4: Run database migrations
echo ""
echo "🗄️  Step 4: Running database migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed"
else
    echo "❌ Database migrations failed"
    echo "💡 Check your DATABASE_URL in .env file"
    exit 1
fi

# Step 5: Generate Prisma client
echo ""
echo "🔧 Step 5: Generating Prisma client..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Step 6: Build frontend
echo ""
echo "🎨 Step 6: Building frontend..."
echo "⏱️  This takes 10-20 seconds..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Failed to build frontend"
    exit 1
fi

# Step 7: Deploy frontend files
echo ""
echo "📤 Step 7: Deploying frontend files..."
cp -r dist/* /home/kigsilco/admin.mitambo.africa/
if [ $? -eq 0 ]; then
    echo "✅ Frontend files deployed"
else
    echo "❌ Failed to deploy frontend files"
    exit 1
fi

# Step 8: Create .htaccess
echo ""
echo "📝 Step 8: Creating .htaccess file..."
cat > /home/kigsilco/admin.mitambo.africa/.htaccess << 'EOF'
# Enable Rewrite Engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Proxy API requests to Node.js backend
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # React Router - serve index.html for all routes
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
EOF

if [ $? -eq 0 ]; then
    echo "✅ .htaccess file created"
else
    echo "❌ Failed to create .htaccess file"
    exit 1
fi

# Final summary
echo ""
echo "================================================"
echo "🎉 Deployment Script Completed!"
echo "================================================"
echo ""
echo "✅ All automated steps completed successfully!"
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to cPanel → Setup Node.js App"
echo "2. Create Application with these settings:"
echo "   - Node.js version: 18.x or higher"
echo "   - Application mode: Production"
echo "   - Application root: /home/kigsilco/admin.mitambo.africa"
echo "   - Application URL: admin.mitambo.africa"
echo "   - Application startup file: server/index.ts"
echo ""
echo "3. Add Environment Variables:"
echo "   DATABASE_URL=mysql://kigsilco_brandflow_user:kigsilco_brandflow_user@localhost:3306/kigsilco_brandflow_db"
echo "   PORT=3001"
echo "   NODE_ENV=production"
echo ""
echo "4. Click 'Start Application'"
echo ""
echo "5. Test your deployment:"
echo "   Frontend: https://admin.mitambo.africa"
echo "   Backend API: https://admin.mitambo.africa/api/dashboard/stats"
echo ""
echo "================================================"
