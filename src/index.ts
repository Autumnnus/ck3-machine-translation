import axios from "axios";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import * as path from "path";

dotenv.config();
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const pattern = /\[[^"\]]*]|\$[^$]+\$|#[^$]+#|\\n|@[^!]+!/g;

function extractTranslatable(text: string) {
  const matches = text.match(pattern) ?? [];
  const clean = text.replace(pattern, "___");
  return { clean, map: matches };
}

async function translateText(text: string, targetLang: string) {
  if (!DEEPL_API_KEY) throw new Error("DEEPL_API_KEY is not defined");
  const res = await axios.post(
    "https://api-free.deepl.com/v2/translate",
    null,
    { params: { auth_key: DEEPL_API_KEY, text, target_lang: targetLang } }
  );
  return res.data.translations[0].text as string;
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
  const out = await Promise.all(
    lines.map(async (line, idx) => {
      if (idx === 0 && line.trim().startsWith("l_english:")) {
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

      const result = reinsertPatterns(translated, map) + " # Translated!";

      translatedCount++;
      return line.startsWith(" ") ? result : " " + result;
    })
  );

  await fs.writeFile(filePath, out.join("\n"), "utf8");
  console.log(`\x1b[32m ------------------------- \x1b[0m`);
  console.log(`✓ ${filePath}`);
  console.log(`Total translated lines: ${translatedCount}`);
  console.log(`\x1b[31m ------------------------- \x1b[0m`);
}

const rootFolder = "./loc";
processDirectory(rootFolder, "TR").catch(console.error);
