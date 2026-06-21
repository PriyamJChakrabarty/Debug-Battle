const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CODEBASES_DIR = path.join(ROOT, "public", "Codebases");
const ASTRO_DIR = path.join(CODEBASES_DIR, "AstroStructure");
const INDEX_PATH = path.join(CODEBASES_DIR, "index.json");
const MASTER_PATH = path.join(ASTRO_DIR, "master.json");
const DATA2_PATH = path.join(ROOT, "public", "data2", "data.json");
const CODES2_DIR = path.join(ROOT, "public", "codes2");

const selectedFiles = [
  { path: "AccountImporter.cpp", source: "AccountImporter.cpp" },
  { path: "auth/BillingQueryService.cpp", source: "BillingQueryService.cpp" },
  { path: "auth/SessionTokenService.cpp", source: "SessionTokenService.cpp" },
  { path: "core/ops/ShellTaskRunner.cpp", source: "ShellTaskRunner.cpp" },
  { path: "core/storage/FileExportController.cpp", source: "FileExportController.cpp" },
  { path: "core/reports/TempReportPublisher.cpp", source: "TempReportPublisher.cpp" },
  { path: "ui/SupportMessageFormatter.cpp", source: "SupportMessageFormatter.cpp" },
  { path: "services/orders/OrderAllocator.cpp", source: "OrderAllocator.cpp" },
  { path: "services/cache/CustomerPointerCache.cpp", source: "CustomerPointerCache.cpp" },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copySelectedCodeFiles() {
  for (const entry of selectedFiles) {
    const sourcePath = path.join(CODES2_DIR, entry.source);
    const destinationPath = path.join(ASTRO_DIR, entry.path);
    ensureDir(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function buildMasterJson() {
  const data = JSON.parse(fs.readFileSync(DATA2_PATH, "utf8"));
  const byCode = new Map(data.Problems.map((problem) => [problem.Code, problem]));

  return {
    "Codebase Number": 1,
    "Codebase Name": "AstroStructure",
    Root: "public/Codebases/AstroStructure",
    Files: selectedFiles.map((entry) => {
      const problem = byCode.get(entry.source);
      if (!problem) {
        throw new Error(`Could not find problem metadata for ${entry.source}`);
      }
      return {
        "Problem Number": problem["Problem Number"],
        Path: entry.path,
        Code: entry.path,
        "Source Code": problem.Code,
        Vulnerabilities: problem.Vulnerabilities,
      };
    }),
  };
}

function writeIndexJson() {
  const index = {
    Codebases: [
      {
        "Codebase Number": 1,
        Name: "AstroStructure",
        Folder: "AstroStructure",
        Master: "AstroStructure/master.json",
        "File Count": selectedFiles.length,
      },
    ],
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

function main() {
  ensureDir(CODEBASES_DIR);
  fs.rmSync(ASTRO_DIR, { recursive: true, force: true });
  ensureDir(ASTRO_DIR);

  copySelectedCodeFiles();
  writeIndexJson();
  fs.writeFileSync(MASTER_PATH, JSON.stringify(buildMasterJson(), null, 2), "utf8");

  console.log(`Created codebase at ${ASTRO_DIR}`);
}

main();
