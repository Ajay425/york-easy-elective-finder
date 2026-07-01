import express from 'express';
import courseRouter from './router/courseRouter.js';
import prereqRouter from './router/prereqRouter.js';
import "dotenv/config";
import cors from 'cors';
import fs from 'fs/promises';

import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import adminRouter from './router/adminRouter.js';
import { COUNT_FILE, RUNTIME_STATE_DIR, VIEWS_DIR } from './utils/paths.js';

const app = express();

// view engine
app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(cookieParser());
app.set('trust proxy', 1);
// No server-side session store: stateless JWT-only auth

// Passport-JWT setup
const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret';
const jwtOptions = {
    jwtFromRequest: (req) => req && req.cookies ? req.cookies.token : null,
    secretOrKey: jwtSecret,
};

passport.use(new JwtStrategy(jwtOptions, (payload, done) => {
    if (payload && payload.sub === 'admin') return done(null, { id: 'admin' });
    return done(null, false);
}));

app.use(passport.initialize());

// Rate limiter for login attempts
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

const PORT = process.env.PORT || 3000;

async function ensureCountFile() {
    await fs.mkdir(RUNTIME_STATE_DIR, { recursive: true });
    try {
        await fs.access(COUNT_FILE);
    } catch {
        await fs.writeFile(COUNT_FILE, JSON.stringify({ visits: 0 }, null, 2), 'utf-8');
    }
}

app.get("/api", async (req, res) => {
        if (req.url === '/favicon.ico') {
                res.end();
        }
        try {
            // Keep visit counter in runtime/state regardless of process cwd.
            await ensureCountFile();
            const json1 = await fs.readFile(COUNT_FILE, 'utf-8');
            const obj = JSON.parse(json1);

            if (req.query.type == 'new-visit') {
                obj.visits = obj.visits + 1;
            }

            const newJson = JSON.stringify(obj);
            await fs.writeFile(COUNT_FILE, newJson, 'utf-8');
            res.send(newJson);
        } catch (err) {
            console.error('Failed to process /api visit counter:', err);
            res.status(500).json({ msg: 'Failed to read visit counter' });
        }
});

// Auth routes: login page and handlers (public)
function grantAdminCookie(res) {
    const token = jwt.sign({ sub: 'admin' }, jwtSecret, { expiresIn: '8h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
}

app.get('/admin/login', (req, res) => {
    grantAdminCookie(res);
    return res.redirect('/admin');
});

app.post('/admin/login', loginLimiter, async (req, res) => {
    grantAdminCookie(res);
    return res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('token');
    return res.redirect('/admin/login');
});

// Mount API routers
app.use("/courses", courseRouter)
app.use("/prereq", prereqRouter)

// Protect admin routes with Passport-JWT
app.use('/admin', passport.authenticate('jwt', { session: false, failureRedirect: '/admin/login' }), adminRouter);

app.listen(PORT, (err)=>{
        if (err){
            console.log(err)
        }
        else{
                console.log("Sucessfully running on PORT " + PORT)
        }
})
