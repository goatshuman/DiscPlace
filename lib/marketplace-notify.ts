export async function notifyMarketplace(event: string, fields: Record<string, string | number>) {
  const webhook = process.env.DISCORD_ORDER_WEBHOOK_URL;
  if (!webhook) return;
  const description = Object.entries(fields).map(([key, value]) => `**${key}**: ${String(value).slice(0, 180)}`).join("\n");
  try {
    await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ embeds: [{ title: `DiscPlace · ${event}`, description, color: 0xa88aff, timestamp: new Date().toISOString() }] }), cache: "no-store" });
  } catch { /* A notification outage must not change payment state. */ }
}
