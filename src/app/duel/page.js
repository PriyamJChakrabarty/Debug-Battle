import { readFileSync } from "fs";
import { join } from "path";
import VulnerabilityClient from "../vulnerability-client";

export const metadata = {
  title: "Duel — DebugBattle",
};

export default function DuelPage() {
  const dataPath = join(process.cwd(), "public", "data", "data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  const codePath = join(process.cwd(), "public", "codes", data.Code);
  const initialCode = readFileSync(codePath, "utf-8");

  return <VulnerabilityClient data={data} initialCode={initialCode} />;
}
