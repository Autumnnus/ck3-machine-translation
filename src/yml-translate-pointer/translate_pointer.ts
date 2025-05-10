import fs from "fs";
import * as path from "path";

const targetDir = "src/yml-translate-pointer/loc";

function processFiles(dir: string) {
  const files = fs.readdirSync(dir);
  files.forEach((file: any) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processFiles(filePath);
    } else if (file.endsWith(".yml")) {
      processYmlFile(filePath);
    }
  });
}

function processYmlFile(filePath: string) {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");

  const transformed = lines.map((line: string, index: number) => {
    if (index === 0) return line;

    if (line.trim().startsWith("#") || line.trim() === "") return "";
    const cleanLine = line.split("#")[0].trimEnd();
    return `${cleanLine} # Translated!`;
  });

  fs.writeFileSync(filePath, transformed.join("\n"), "utf-8");
  console.log(`Processed: ${filePath}`);
}

processFiles(targetDir);
