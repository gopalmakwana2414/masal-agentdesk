import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv() {
  const candidatePaths = [
    path.join(process.cwd(), "server", ".env"),
    path.join(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
    path.join(process.cwd(), "server", ".env.local"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "server", ".env.example"),
    path.join(process.cwd(), ".env.example"),
    path.resolve(__dirname, "../.env.example"),
    path.resolve(__dirname, "../../.env.example"),
  ];

  const loadedPaths: string[] = [];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath) && !loadedPaths.includes(envPath)) {
      dotenv.config({ path: envPath, override: true });
      loadedPaths.push(envPath);
      const key = (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "").trim().replace(/^["']|["']$/g, "");
      if (key.length > 0) break;
    }
  }

  // Windows accidental .env.txt detection
  const envTxtPaths = [
    path.join(process.cwd(), "server", ".env.txt"),
    path.join(process.cwd(), ".env.txt"),
    path.resolve(__dirname, "../.env.txt"),
    path.resolve(__dirname, "../../.env.txt"),
  ];

  for (const txtPath of envTxtPaths) {
    if (fs.existsSync(txtPath) && !loadedPaths.includes(txtPath)) {
      console.warn(`[Env Warning] Found accidental '.env.txt' at ${txtPath}. Reading environment variables from it...`);
      dotenv.config({ path: txtPath, override: true });
      loadedPaths.push(txtPath);
    }
  }

  if (loadedPaths.length > 0) {
    console.log(`[Env Loader] Loaded environment files: ${loadedPaths.join(", ")}`);
  } else {
    console.warn(`[Env Loader] No .env file found in searched locations.`);
    dotenv.config();
  }

  const rawKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  const hasKey = apiKey.length > 0;

  console.log(`[Env Diagnostic] process.cwd(): ${process.cwd()}`);
  console.log(`[Env Diagnostic] Gemini API key configured: ${hasKey}`);
}

// Execute immediately when module is imported
loadEnv();



