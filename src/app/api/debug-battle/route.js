import { getDebugBattlePayload } from "@/lib/debug-battle";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getDebugBattlePayload());
}
