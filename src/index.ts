import axios from "axios";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import * as path from "path";

dotenv.config();
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const pattern = /\[[^"\]]*]|\$[^$]+\$|#[^$]+#|\\n|@[^!]+!/g;
const DEEPL_FREE_ENDPOINT = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_ENDPOINT = "https://api.deepl.com/v2/translate";

function extractTranslatable(text: string) {
  const matches = text.match(pattern) ?? [];
  const clean = text.replace(pattern, "___");
  return { clean, map: matches };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateText(text: string, targetLang: string) {
  if (!DEEPL_API_KEY) throw new Error("DEEPL_API_KEY is not defined");

  let attempts = 0,
    maxAttempts = 4,
    delay = 5000; // ms

  while (true) {
    try {
      await sleep(3000);

      const res = await axios.post(
        DEEPL_PRO_ENDPOINT,
        null,
        { params: { auth_key: DEEPL_API_KEY, text, target_lang: targetLang } }
      );
      return res.data.translations[0].text as string;
    } catch (err: any) {
      if (err.response?.status === 429 && attempts < maxAttempts) {
        attempts++;
        console.warn(
          `429 alındı, yeniden dene #${attempts} (bekle ${delay}ms)`
        );
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

function reinsertPatterns(translated: string, map: string[]) {
  let i = 0;
  return translated.replace(/___/g, () => map[i++] || "");
}

async function processDirectory(dir: string, targetLang: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await processDirectory(full, targetLang);
    } else if (e.isFile() && full.endsWith(".yml")) {
      await processFile(full, targetLang);
    }
  }
}

async function processFile(filePath: string, targetLang: string) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n");
  let translatedCount = 0;
  const out: string[] = [];

  // 10’ar satırlık batch’ler hâlinde çeviri
  const BATCH_SIZE = 10;
  for (let start = 0; start < lines.length; start += BATCH_SIZE) {
    const batch = lines.slice(start, start + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (line, idx) => {
        const realIdx = start + idx;

        if (realIdx === 0 && line.trim().startsWith("l_english:")) {
          return line;
        }
        if (!line.trim() || line.includes("# Translated!")) {
          return line;
        }

        const noComment = line
          .replace(/(^|[^"])\s+#(?![^"]*#).*$/, "$1")
          .trimEnd();
        const { clean, map } = extractTranslatable(noComment);

        const keyMatch = line.match(/^\s*([^:#"\s]+):/);
        if (keyMatch) {
          console.log(`Translating key: ${keyMatch[1]}`);
        }

        const translated = clean.trim()
          ? await translateText(clean, targetLang)
          : clean;

        translatedCount++;
        const result = reinsertPatterns(translated, map) + " # Translated!";
        return line.startsWith(" ") ? result : " " + result;
      })
    );

    out.push(...batchResults);
  }

  await fs.writeFile(filePath, out.join("\n"), "utf8");
  if (translatedCount > 0) {
    console.log(`\x1b[32m ------------------------- \x1b[0m`);
    console.log(`✓ ${filePath}`);
    console.log(`Total translated lines: ${translatedCount}`);
    console.log(`\x1b[31m ------------------------- \x1b[0m`);
  }
}

const rootFolder = "./loc";
processDirectory(rootFolder, "TR").catch(console.error);
