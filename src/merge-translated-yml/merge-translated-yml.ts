const fs = require("fs");
const path = require("path");

const originalRoot = "src/merge-translated-yml/original_files";
const translatedRoot = "src/merge-translated-yml/translated_files";
const outputRoot = "src/merge-translated-yml/output";

function parseYml(content:string) {
  const lines = content.split("\n");
  const entries = {} as any;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const key = line.split(":")[0];
    entries[key] = lines[i];
  }
  return { header: lines[0], entries };
}

function mergeYmlFiles(originalFile: string, translatedFile: string) {
  const original = parseYml(fs.readFileSync(originalFile, "utf-8"));
  const translated = fs.existsSync(translatedFile)
    ? parseYml(fs.readFileSync(translatedFile, "utf-8"))
    : { entries: {} };

  const merged = [original.header];

  for (const key in original.entries) {
    if (translated.entries[key]?.includes("# Translated!")) {
      merged.push(translated.entries[key]);
    } else {
      merged.push(original.entries[key]);
    }
  }

  for (const key in translated.entries) {
    if (!original.entries[key]) {
      merged.push(translated.entries[key]);
    }
  }

  return merged.join("\n");
}

function walkAndMerge(dir:string) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const originalPath = path.join(dir, item);
    const relativePath = path.relative(originalRoot, originalPath);
    const translatedPath = path.join(translatedRoot, relativePath);
    const outputPath = path.join(outputRoot, relativePath);

    const stat = fs.statSync(originalPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(outputPath, { recursive: true });
      walkAndMerge(originalPath);
    } else if (originalPath.endsWith(".yml")) {
      const merged = mergeYmlFiles(originalPath, translatedPath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, merged, "utf-8");
      console.log("Merged:", outputPath);
    }
  }
}

walkAndMerge(originalRoot);
