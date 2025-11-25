import dotenv from 'dotenv';
import express from 'express';
import courseRouter from './router/courseRouter.js';
import prereqRouter from './router/prereqRouter.js';
import "dotenv/config";
import cors from 'cors';
import fs from 'fs'

import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import adminRouter from './router/adminRouter.js';

const app = express();

// view engine
app.set('views', './views');
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

app.get("/api",(req,res)=>{
        if (req.url === '/favicon.ico') {
                res.end();
        }
        // Ends request for favicon without counting
        const json1 = fs.readFileSync('./data/count.json', 'utf-8');
        const obj = JSON.parse(json1);

        if (req.query.type == 'new-visit'){
                obj.visits = obj.visits + 1
        }
        const newJson = JSON.stringify(obj)

        fs.writeFileSync('./data/count.json', newJson);
        res.send(newJson)
})

// Auth routes: login page and handlers (public)
app.get('/admin/login', (req, res) => {
    res.render('admin_login', { error: null });
});

app.post('/admin/login', loginLimiter, async (req, res) => {
    const password = req.body.password || '';
    const turnstileToken = req.body['cf-turnstile-response'] || req.body['turnstile-response'] || '';

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).send('Admin password not configured');
    }

    // If a TURNSTILE_SITE_KEY is present we require TURNSTILE_SECRET to be configured
    const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
    const turnstileSecret = process.env.TURNSTILE_SECRET;
    if (turnstileSiteKey && !turnstileSecret) {
        console.error('TURNSTILE_SITE_KEY is set but TURNSTILE_SECRET is missing');
        return res.status(500).render('admin_login', { error: 'CAPTCHA misconfigured on server' });
    }

    // If TURNSTILE_SECRET is provided, verify the Turnstile token.
    if (turnstileSecret) {
        if (!turnstileToken) {
            return res.status(400).render('admin_login', { error: 'Missing CAPTCHA' });
        }
        try {
            const params = new URLSearchParams({ secret: turnstileSecret, response: turnstileToken, remoteip: req.ip });
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            const json = await verifyRes.json();
            if (!json.success) {
                console.warn('Turnstile verification failed', json);
                return res.status(403).render('admin_login', { error: 'CAPTCHA verification failed' });
            }
        } catch (err) {
            console.error('Turnstile verify error', err);
            return res.status(500).render('admin_login', { error: 'CAPTCHA verification error' });
        }
    } else {
        // No secret configured — skip verification but warn in logs.
        console.warn('TURNSTILE_SECRET not set; skipping CAPTCHA verification for login');
    }

    if (password === process.env.ADMIN_PASSWORD) {
        // create JWT and set cookie
        const token = jwt.sign({ sub: 'admin' }, jwtSecret, { expiresIn: '8h' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        return res.redirect('/admin');
    }
    return res.status(401).render('admin_login', { error: 'Invalid password' });
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
