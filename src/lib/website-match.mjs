// Local, explainable fallback. This does not call an AI provider or send customer data externally.
export function suggestWebsites(description, websites) {
  const text = description.toLocaleLowerCase("de-DE");
  return websites
    .map((w) => {
      const reasons = [];
      let score = 0;
      const domain = String(w.domain || "")
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];
      if (
        domain &&
        text.includes(domain) &&
        new RegExp(
          "(^|[^a-z0-9.-])(?:www\\.)?" +
            domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "(?=$|[^a-z0-9.-])",
          "i",
        ).test(text)
      ) {
        score += 100;
        reasons.push("Domain genannt");
      }
      if (
        String(w.name).length >= 4 &&
        text.includes(String(w.name).toLowerCase())
      ) {
        score += 40;
        reasons.push("Website-Name genannt");
      }
      for (const feature of String(w.features || "")
        .split(/[,;\n]/)
        .map((x) => x.trim().toLowerCase())
        .filter((x) => x.length >= 4)) {
        if (text.includes(feature)) {
          score += 10;
          reasons.push("Funktion: " + feature);
        }
      }
      return {
        website_id: w.id,
        score,
        reasons,
        method: "Regelbasierter Abgleich",
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
