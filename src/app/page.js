import { readFileSync } from "fs";
import { join } from "path";
import VulnerabilityClient from "./vulnerability-client";

export default function Home() {
  const dataPath = join(process.cwd(), "public", "data", "data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Code field is just the filename; files live in public/codes/
  const codePath = join(process.cwd(), "public", "codes", data.Code);
  const initialCode = readFileSync(codePath, "utf-8");

  return <VulnerabilityClient data={data} initialCode={initialCode} />;
}
