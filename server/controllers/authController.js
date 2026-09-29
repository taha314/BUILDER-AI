import { User } from "../models/User.js";
import jwt from 'jsonwebtoken'

function sessionCookieOptions() {
    const sameSite = process.env.COOKIE_SAME_SITE || "lax";
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" || sameSite === "none",
        sameSite,
        path: "/",
    };

    if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
    return options;
}

// Helper to set cookie
const setSessionCookie = (res, payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" })
    res.cookie('token', token, {
        ...sessionCookieOptions(),
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
}

export async function register(req, res) {
    const { name, email, password } = req.body || {}

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Name, email, and password are required" })
        return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedName || trimmedName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        res.status(400).json({ error: "Enter a valid name and email address" })
        return;
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
        res.status(400).json({ error: "Password must be at least 8 characters and no more than 72 bytes" })
        return;
    }

    const existing = await User.findOne({ email: trimmedEmail })
    if (existing) {
        res.status(400).json({ error: "An account with this email already exists" })
        return;
    }

    const user = await User.create({
        name: trimmedName,
        email: trimmedEmail,
        password
    })

    setSessionCookie(res, { userId: user._id.toString(), email: user.email })

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })
}

export async function login(req, res) {
    const { email, password } = req.body || {}

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        res.status(400).json({ error: "Email and password are required" })
        return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
        res.status(401).json({ error: "Invalid email or password" })
        return;
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
        res.status(401).json({ error: "Invalid email or password" })
        return;
    }

    setSessionCookie(res, { userId: user._id.toString(), email: user.email })

    res.status(200).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })
}

export async function logout(_req, res) {
    res.clearCookie("token", sessionCookieOptions())
    res.json({ success: true })
}

export async function me(req, res) {
    if (!req.user) {
        res.status(401).json({ error: "Not authenticated" })
        return;
    }

    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ user })
}