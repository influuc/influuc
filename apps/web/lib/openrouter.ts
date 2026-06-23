import { logger } from "@trigger.dev/sdk/v3";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const EXTRACTION_MODEL = "anthropic/claude-haiku-4-5";

export interface BrainFact {
  key: string;
  content: string;
  confidence: number;
}

export interface ExtractedBrain {
  identity: BrainFact[];
  expertise: BrainFact[];
  offer: BrainFact[];
  audience: BrainFact[];
  positioning: BrainFact[];
  belief: BrainFact[];
  story: BrainFact[];
  writing_style: BrainFact[];
  goal: BrainFact[];
}

const BRAIN_LAYERS = [
  "identity",
  "expertise",
  "offer",
  "audience",
  "positioning",
  "belief",
  "story",
  "writing_style",
  "goal",
] as const;

type BrainLayer = (typeof BRAIN_LAYERS)[number];

function buildExtractionPrompt(kind: string, content: string, url?: string): string {
  const sourceLabel = url ? `${kind} content from ${url}` : `${kind} content`;
  return `You are a Founder Brain extractor. Analyze this ${sourceLabel} and extract specific, evidence-based facts about the founder.

Extract facts across these 9 layers:
- identity: Name, title, company, professional role, credentials
- expertise: Deep knowledge areas, specific skills and competencies, what they are known for
- offer: What they sell or deliver, service/product details, pricing signals, deliverables
- audience: Who they serve, customer/client descriptions, niche or segment details
- positioning: How they differentiate, unique angle, POV, what they stand for vs. competitors
- belief: Strongly held convictions, philosophy, worldview, opinions they express confidently
- story: Career narrative, key turning points, origin story, defining experiences
- writing_style: Communication patterns, tone, vocabulary choices, content formats they use
- goal: What they are working toward, stated ambitions, public objectives

Content:
---
${content.slice(0, 6000)}
---

Return ONLY valid JSON with no markdown formatting, no explanation, using this exact structure:
{
  "identity": [{"key": "full_name", "content": "...", "confidence": 0.9}],
  "expertise": [{"key": "primary_expertise", "content": "...", "confidence": 0.8}],
  "offer": [],
  "audience": [],
  "positioning": [],
  "belief": [],
  "story": [],
  "writing_style": [],
  "goal": []
}

Rules:
- confidence: 0.9 = explicitly stated, 0.7 = clearly implied, 0.5 = reasonably inferred
- content: 1-3 specific sentences per fact, grounded in what you actually read
- key: snake_case identifier (e.g., "primary_offer", "target_market", "core_belief_1")
- Return empty array [] for layers with no evidence in the content
- Do NOT fabricate or hallucinate — only extract what is supported by the text
- Limit to 3 facts per layer maximum`;
}

function emptyBrain(): ExtractedBrain {
  return BRAIN_LAYERS.reduce(
    (acc, layer) => ({ ...acc, [layer]: [] }),
    {} as ExtractedBrain
  );
}

/**
 * Extract the first balanced JSON object from an arbitrary string.
 * Handles responses where the model wraps JSON in code fences or appends
 * explanation text (which may contain } characters) after the JSON block.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export async function extractBrainFacts(
  content: string,
  kind: string,
  url?: string
): Promise<ExtractedBrain> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const prompt = buildExtractionPrompt(kind, content, url);

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://influuc.com",
      "X-Title": "Influuc Brain Extractor",
    },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`OpenRouter API error: ${data.error.message}`);
  }

  const rawContent = data.choices?.[0]?.message?.content ?? "";

  logger.info("OpenRouter raw response", {
    rawLength: rawContent.length,
    rawPreview: rawContent.slice(0, 400),
  });
  console.log("[openrouter] rawContent length:", rawContent.length, "preview:", rawContent.slice(0, 200));

  if (!rawContent) return emptyBrain();

  const jsonStr = extractFirstJsonObject(rawContent);
  if (!jsonStr) {
    console.log("[openrouter] no JSON object found in response");
    return emptyBrain();
  }

  try {
    const parsed = JSON.parse(jsonStr) as Partial<Record<BrainLayer, unknown>>;
    const result = emptyBrain();
    for (const layer of BRAIN_LAYERS) {
      const facts = parsed[layer];
      if (Array.isArray(facts)) {
        result[layer] = facts.filter(
          (f): f is BrainFact =>
            typeof f === "object" &&
            f !== null &&
            typeof (f as BrainFact).key === "string" &&
            typeof (f as BrainFact).content === "string"
        );
      }
    }
    console.log("[openrouter] extracted fact counts:", Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.length])));
    return result;
  } catch (err) {
    console.log("[openrouter] JSON parse error:", String(err), "jsonStr[:200]:", jsonStr.slice(0, 200));
    return emptyBrain();
  }
}
