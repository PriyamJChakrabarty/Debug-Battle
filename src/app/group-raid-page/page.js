import { readFileSync } from "fs";
import { join } from "path";
import SiteNav from "@/components/site-nav";
import HeartbeatClient from "@/components/heartbeat";
import GroupRaidClient from "./group-raid-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Group Raid — DebugBattle" };

// Build a folder-tree from the flat file list
function buildTree(files) {
  const root = { name: "", type: "root", children: [] };
  for (const file of files) {
    const parts = file.Path.split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      let found = node.children.find((c) => c.type === "folder" && c.name === dir);
      if (!found) {
        found = { name: dir, type: "folder", children: [] };
        node.children.push(found);
      }
      node = found;
    }
    node.children.push({
      name: parts[parts.length - 1],
      type: "file",
      path: file.Path,
    });
  }
  return root;
}

export default function GroupRaidPage() {
  const idxPath    = join(process.cwd(), "public", "Codebases", "index.json");
  const { Codebases } = JSON.parse(readFileSync(idxPath, "utf-8"));
  const cbMeta     = Codebases[0]; // AstroStructure

  const masterPath = join(process.cwd(), "public", "Codebases", cbMeta.Folder, "master.json");
  const master     = JSON.parse(readFileSync(masterPath, "utf-8"));

  const cbRoot = join(process.cwd(), "public", "Codebases", cbMeta.Folder);
  const filesCode = {};
  for (const file of master.Files) {
    try {
      filesCode[file.Path] = readFileSync(join(cbRoot, file.Path), "utf-8");
    } catch {
      filesCode[file.Path] = `// Could not load: ${file.Path}\n`;
    }
  }

  const fileTree = buildTree(master.Files);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#0d1a1f",
      color: "#c9d6da",
      fontFamily: "'Segoe UI', 'Aptos', 'Trebuchet MS', sans-serif",
      overflow: "hidden",
    }}>
      <HeartbeatClient />
      <SiteNav active="/group-raid-page" />
      <GroupRaidClient
        codebaseName={master["Codebase Name"]}
        files={master.Files}
        filesCode={filesCode}
        fileTree={fileTree}
      />
    </div>
  );
}
