import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.ORIGINS || (isProduction ? "" : "http://localhost:5173"))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

if (isProduction && allowedOrigins.length === 0) {
    throw new Error("ORIGINS must contain the production frontend origin");
}

if (allowedOrigins.includes("*")) {
    throw new Error("ORIGINS must list explicit frontend origins; wildcards are not allowed");
}

if (isProduction && allowedOrigins.some((origin) => new URL(origin).protocol !== "https:")) {
    throw new Error("Production ORIGINS must use HTTPS");
}

if (isProduction && (!process.env.APP_URL || new URL(process.env.APP_URL).protocol !== "https:")) {
    throw new Error("Production APP_URL must be the HTTPS public API URL");
}

if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
}

if (process.env.COOKIE_SAME_SITE && !["lax", "strict", "none"].includes(process.env.COOKIE_SAME_SITE.toLowerCase())) {
    throw new Error("COOKIE_SAME_SITE must be lax, strict, or none");
}

await connectToDatabase();

if (isProduction) app.set("trust proxy", 1);
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }))

app.get("/", (req, res) => res.send("Server is Live!"))
app.get("/health", (_req, res) => res.json({ status: "ok" }))
app.get("/api/health", (_req, res) => res.json({ status: "ok" }))
app.use("/api/auth", authRouter)
app.use("/api/projects", projectRouter)

app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found", code: "NOT_FOUND" })
})

app.use((err, _req, res, _next) => {
    const isDuplicate = err.code === 11000;
    const isMongooseValidation = err.name === "ValidationError";
    const isInvalidId = err.name === "CastError";
    const isInvalidJson = err.type === "entity.parse.failed";
    const status = isDuplicate ? 409 : (isMongooseValidation || isInvalidId || isInvalidJson ? 400 : err.status || err.statusCode || 500);
    const isClientError = status >= 400 && status < 500;
    const message = isDuplicate
        ? "A record with that value already exists"
        : isMongooseValidation
            ? "Invalid request data"
            : isInvalidId
                ? "Invalid request parameter"
                : isInvalidJson
                    ? "Invalid JSON request body"
                    : isClientError ? err.message : "Internal server error";
    const code = isDuplicate ? "CONFLICT" : isInvalidJson ? "INVALID_JSON" : isClientError ? "BAD_REQUEST" : "INTERNAL_ERROR";

    if (!isClientError) console.error("[API Error]", err.name || "Error", err.code || "");
    res.status(status).json({ error: message, code })
})

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Server is listening at ${process.env.APP_URL || `http://localhost:${port}`}`)
})