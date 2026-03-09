
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('exit', (code) => {
    console.log(`Process successfully exited with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Exiting...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Exiting...');
    process.exit(0);
});

const app = express();

// Initialize Prisma Client (will use DATABASE_URL from .env)
const prisma = new PrismaClient();
console.log("Prisma Client initialized for MySQL");

// Test connection
(async () => {
    try {
        await prisma.$connect();
        console.log("Successfully connected to database");
    } catch (e) {
        console.error("Failed to connect to database:", e);
        process.exit(1);
    }
})();

const seedSuperAdmin = async () => {
    try {
        const email = "kigen@mitambo.africa"; // Using a valid email format
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { role: 'super_admin' }
                ]
            }
        });

        if (!existingUser) {
            console.log("Seeding Super Admin user...");
            await prisma.user.create({
                data: {
                    email: email,
                    password: "1234567887654321", // In production, hash this!
                    role: 'super_admin',
                    profile: {
                        create: {
                            fullName: "kIGEN"
                        }
                    }
                }
            });
            console.log("Super Admin seeded successfully.");
        }
    } catch (error) {
        console.error("Failed to seed Super Admin:", error);
    }
};

console.log("Database URL:", process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')); // Hide password in logs
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://admin.mitambo.africa', 'https://www.admin.mitambo.africa']
        : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use original name but ensure uniqueness if needed, or just overwrite. 
        // For folder uploads, we might get name clashes if flattened. 
        // Let's prepend timestamp.
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const monthLetters: Record<number, string> = {
    0: 'JA', 1: 'FE', 2: 'MR', 3: 'AP', 4: 'MY', 5: 'JN',
    6: 'JL', 7: 'AU', 8: 'SE', 9: 'OC', 10: 'NO', 11: 'DE'
};

async function generateDocumentId(type: 'invoice' | 'quotation') {
    const now = new Date();
    const prefix = type === 'invoice' ? 'I' : 'Q';
    const year = now.getFullYear();
    const month = monthLetters[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');

    // Start of day
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    let count = 0;
    if (type === 'invoice') {
        count = await prisma.invoice.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
    } else {
        count = await prisma.quotation.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
    }

    const nextCount = String(count + 1).padStart(2, '0');
    return `${prefix}-D${year}${month}${day}-${nextCount}`;
}

// Auth Routes (Mock for now, replacing Supabase)
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
        const user = await prisma.user.create({
            data: {
                email,
                password, // In production, hash this!
                profile: {
                    create: {
                        fullName
                    }
                },
                role: 'user'
            }
        });

        res.json({ user });
    } catch (error) {
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
    });

    if (user && user.password === password) {
        res.json({ user, session: { access_token: 'mock-token' } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// User Routes
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { profile: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error("GET /users/:id error:", error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { profile: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error("GET /users error:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', async (req, res) => {
    const { email, password, fullName, role } = req.body;
    try {
        const user = await prisma.user.create({
            data: {
                email,
                password,
                role: role || 'user',
                profile: {
                    create: {
                        fullName
                    }
                }
            },
            include: { profile: true }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { email, password, fullName, avatarUrl } = req.body;
    try {
        const updateData: { email: string; password?: string } = { email };
        if (password) updateData.password = password;

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...updateData,
                profile: {
                    upsert: {
                        create: {
                            fullName,
                            avatarUrl
                        },
                        update: {
                            fullName,
                            avatarUrl
                        }
                    }
                }
            },
            include: { profile: true }
        });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Invoices Routes
app.get('/api/invoices', async (req, res) => {
    const invoices = await prisma.invoice.findMany({
        include: {
            client: true,
            user: {
                include: { profile: true }
            }
        }
    });
    res.json(invoices);
});

app.post('/api/invoices', async (req, res) => {
    try {
        const id = await generateDocumentId('invoice');
        const { vatRate } = req.body;
        const invoice = await prisma.invoice.create({
            data: {
                ...req.body,
                vatRate: vatRate || 0,
                items: typeof req.body.items === 'string' ? req.body.items : JSON.stringify(req.body.items),
                id
            }
        });
        res.json(invoice);
    } catch (error) {
        console.error("POST /api/invoices error:", error);
        res.status(400).json({ error: 'Failed to create invoice' });
    }
});

app.put('/api/invoices/:id', async (req, res) => {
    try {
        const invoice = await prisma.invoice.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(invoice);
    } catch (error) {
        console.error("PUT /api/invoices/:id error:", error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        await prisma.invoice.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/invoices/:id error:", error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// Clients Routes
app.get('/api/clients', async (req, res) => {
    const clients = await prisma.client.findMany({
        include: { invoices: true, quotations: true }
    });
    res.json(clients);
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                invoices: {
                    orderBy: { createdAt: 'desc' }
                },
                quotations: {
                    orderBy: { createdAt: 'desc' }
                },
                projects: {
                    orderBy: { createdAt: 'desc' }
                },
                communications: {
                    orderBy: { date: 'desc' }
                }
            }
        });
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const client = await prisma.client.create({
            data: req.body
        });
        res.json(client);
    } catch (error) {
        console.error("POST /api/clients error:", error);
        res.status(400).json({ error: 'Failed to create client' });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const client = await prisma.client.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(client);
    } catch (error) {
        console.error("PUT /api/clients/:id error:", error);
        res.status(400).json({ error: 'Failed to update client' });
    }
});

// Products Routes
app.get('/api/products', async (req, res) => {
    const products = await prisma.product.findMany();
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const product = await prisma.product.create({
        data: req.body
    });
    res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
    await prisma.product.delete({
        where: { id: req.params.id }
    });
    res.json({ success: true });
});

// Quotations Routes
app.get('/api/quotations', async (req, res) => {
    const quotations = await prisma.quotation.findMany({
        include: {
            client: true,
            user: {
                include: { profile: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
});

app.post('/api/quotations', async (req, res) => {
    try {
        const id = await generateDocumentId('quotation');
        const quotation = await prisma.quotation.create({
            data: {
                id,
                clientId: req.body.clientId,
                title: req.body.title,
                amount: req.body.amount,
                status: req.body.status || 'Draft',
                vatRate: req.body.vatRate || 0,
                validUntil: new Date(req.body.validUntil),
                items: typeof req.body.items === 'string' ? req.body.items : JSON.stringify(req.body.items)
            }
        });
        res.json(quotation);
    } catch (error) {
        console.error("POST /api/quotations error:", error);
        res.status(400).json({ error: 'Failed to create quotation' });
    }
});

app.put('/api/quotations/:id', async (req, res) => {
    try {
        const quotation = await prisma.quotation.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(quotation);
    } catch (error) {
        console.error("PUT /api/quotations/:id error:", error);
        res.status(500).json({ error: 'Failed to update quotation' });
    }
});

app.delete('/api/quotations/:id', async (req, res) => {
    try {
        await prisma.quotation.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/quotations/:id error:", error);
        res.status(500).json({ error: 'Failed to delete quotation' });
    }
});

// Settings Routes
app.get('/api/settings', async (req, res) => {
    const settings = await prisma.settings.findFirst();
    res.json(settings || {});
});

app.post('/api/settings', async (req, res) => {
    const count = await prisma.settings.count();
    if (count === 0) {
        const settings = await prisma.settings.create({
            data: req.body
        });
        res.json(settings);
    } else {
        const first = await prisma.settings.findFirst();
        const settings = await prisma.settings.update({
            where: { id: first?.id },
            data: req.body
        });
        res.json(settings);
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    const clientsCount = await prisma.client.count();
    const invoicesCount = await prisma.invoice.count();
    const productsCount = await prisma.product.count();
    const revenue = await prisma.invoice.aggregate({
        _sum: {
            paid: true
        }
    });

    // Expenses
    const expenses = await prisma.expense.aggregate({
        _sum: {
            amount: true
        }
    });

    const totalRevenue = revenue._sum.paid || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netIncome = totalRevenue - totalExpenses;

    // Unpaid Invoices
    const unpaidInvoices = await prisma.invoice.aggregate({
        where: { status: 'Unpaid' },
        _sum: { amount: true }
    });

    // Pending Quotations
    const pendingQuotations = await prisma.quotation.count({
        where: { status: 'Draft' } // Assuming 'Draft' implies pending/active work
    });

    res.json({
        clients: clientsCount,
        invoices: invoicesCount,
        products: productsCount,
        revenue: totalRevenue,
        expenses: totalExpenses,
        netIncome,
        unpaidAmount: unpaidInvoices._sum.amount || 0,
        pendingQuotations
    });
});

// Tasks Routes
app.get('/api/tasks', async (req, res) => {
    try {
        const { assignedTo } = req.query;
        const where: any = {};
        if (assignedTo) {
            where.assignedTo = assignedTo;
        }
        const tasks = await prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(tasks);
    } catch (error) {
        console.error("GET /api/tasks error:", error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const task = await prisma.task.create({
        data: req.body
    });
    res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
    const task = await prisma.task.update({
        where: { id: req.params.id },
        data: req.body
    });
    res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
    await prisma.task.delete({
        where: { id: req.params.id }
    });
    res.json({ success: true });
});

// Projects Routes
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: { client: true, tasks: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, clientId, stage, progress, priority, deadline } = req.body;
        console.log("Creating project:", { name, clientId, deadline });

        if (!name || !clientId || !deadline) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime())) {
            return res.status(400).json({ error: 'Invalid deadline date' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                clientId,
                stage: stage || 'Design',
                progress: progress || 0,
                priority: priority || 'Medium',
                deadline: deadlineDate
            }
        });
        res.json(project);
    } catch (error) {
        console.error("POST /api/projects error details:", error);
        res.status(500).json({ error: 'Failed to create project', details: error instanceof Error ? error.message : String(error) });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await prisma.project.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Files Routes
app.get('/api/files', async (req, res) => {
    try {
        const files = await prisma.file.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(files);
    } catch (error) {
        console.error("GET /api/files error:", error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

app.post('/api/files', upload.array('files'), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const savedFiles = await Promise.all(files.map(async (file) => {
            return await prisma.file.create({
                data: {
                    name: file.originalname,
                    path: `/uploads/${file.filename}`,
                    size: file.size,
                    type: file.mimetype,
                    taskId: req.body.taskId || null
                }
            });
        }));

        res.json(savedFiles);
    } catch (error) {
        console.error("POST /api/files error:", error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

app.delete('/api/files/:id', async (req, res) => {
    try {
        const file = await prisma.file.findUnique({
            where: { id: req.params.id }
        });

        if (file) {
            // Delete from filesystem
            const filePath = path.join(__dirname, '..', file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // Delete from DB
            await prisma.file.delete({
                where: { id: req.params.id }
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/files/:id error:", error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Expenses Routes
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const expense = await prisma.expense.create({
            data: {
                description: req.body.description,
                amount: parseFloat(req.body.amount),
                category: req.body.category,
                date: new Date(req.body.date)
            }
        });
        res.json(expense);
    } catch (error) {
        console.error("POST /api/expenses error:", error);
        res.status(400).json({ error: 'Failed to create expense' });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await prisma.expense.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// Communications Routes
app.get('/api/communications/:id', async (req, res) => {
    try {
        const comm = await prisma.communication.findUnique({
            where: { id: req.params.id }
        });
        res.json(comm);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch communication' });
    }
});

app.post('/api/communications', async (req, res) => {
    try {
        const comm = await prisma.communication.create({
            data: {
                clientId: req.body.clientId,
                type: req.body.type,
                subject: req.body.subject,
                summary: req.body.summary,
                date: new Date(req.body.date)
            }
        });
        res.json(comm);
    } catch (error) {
        console.error("POST /api/communications error:", error);
        res.status(400).json({ error: 'Failed to create communication' });
    }
});

app.put('/api/communications/:id', async (req, res) => {
    try {
        const comm = await prisma.communication.update({
            where: { id: req.params.id },
            data: {
                type: req.body.type,
                subject: req.body.subject,
                summary: req.body.summary,
                date: req.body.date ? new Date(req.body.date) : undefined
            }
        });
        res.json(comm);
    } catch (error) {
        console.error("PUT /api/communications/:id error:", error);
        res.status(400).json({ error: 'Failed to update communication' });
    }
});

app.delete('/api/communications/:id', async (req, res) => {
    try {
        await prisma.communication.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete communication' });
    }
});

// Start Server
app.listen(PORT, async () => {
    await seedSuperAdmin();
    console.log(`Server running on http://localhost:${PORT}`);
});
