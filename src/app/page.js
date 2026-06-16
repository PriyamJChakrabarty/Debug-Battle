import DebugBattleClient from "./debug-battle-client";
import { getDebugBattlePayload } from "@/lib/debug-battle";

export default async function Home() {
  const initialPayload = await getDebugBattlePayload();
  return <DebugBattleClient initialPayload={initialPayload} />;
}
