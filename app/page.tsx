import { getModels } from "@/lib/pricing";
import RouterClient from "@/components/RouterClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { models, lastSynced, source } = await getModels();

  return <RouterClient models={models} lastSynced={lastSynced} source={source} />;
}
