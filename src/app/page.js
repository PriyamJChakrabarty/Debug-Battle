import { readFileSync } from "fs";
import { join } from "path";
import VulnerabilityClient from "./vulnerability-client";

export default function Home() {
  const dataPath = join(process.cwd(), "public", "data", "data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  // data.Code is relative to public/data/ (e.g. "../codes/UserManager.cpp")
  const codePath = join(process.cwd(), "public", "data", data.Code);
  const code = readFileSync(codePath, "utf-8");

  return <VulnerabilityClient data={data} code={code} />;
}
