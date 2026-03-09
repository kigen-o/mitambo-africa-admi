# 🚀 Mitambo Africa Admin Deployment Guide

This document contains instructions for deploying the Mitambo Africa Admin to your cPanel hosting environment.

## 📦 What's in this Package?
- `backend/`: The FastAPI Python application.
- `frontend/`: The built React static files.
- `database/`: MySQL schema file (`mysql_schema.sql`).
- `.htaccess`: Optimized routing for cPanel.

## 🛠️ Step 1: Database Setup
1. Log into cPanel and go to **MySQL Dashboard**.
2. Create a new database (e.g., `brand_flow_db`).
3. Create a database user and assign them to the database with **All Privileges**.
4. Go to **phpMyAdmin**, select your database, and **Import** the `database/mysql_schema.sql` file.

## 🐍 Step 2: Python Backend Setup
1. In cPanel, go to **Setup Python App**.
2. Click **Create Application**:
   - Python Version: **3.9+**
   - Application Root: `/home/USER/mitambo-africa-admin`
   - Application URL: `yourdomain.com` (or a subdomain)
3. Under **Environment Variables**, add:
   - `DATABASE_URL`: `mysql://USER:PASSWORD@localhost:3306/DB_NAME`
   - `JWT_SECRET_KEY`: `your_random_secret_string`
4. Click **Run Pip Install** and select `requirements.txt`.
5. Start the application.

## 🎨 Step 3: Frontend Deployment
1. Open **File Manager** and navigate to your public folder (e.g., `public_html`).
2. Upload the contents of the `frontend/` folder.
3. Ensure the `.htaccess` file is also in the root folder. It handles the link between your frontend and the Python backend.

## ⚙️ .htaccess Configuration
The included `.htaccess` file is pre-configured to:
- Proxy `/api` requests to your Python backend (running on port 3001).
- Handle React Router navigation (serving `index.html` for clean URLs).
- Enable Gzip compression and browser caching.

---
*Support: admin@mitambo.africa*
