// CivicEye v8.1 — Vision Classification via Lovable AI Gateway (Gemini)
// Performs true vision-based detection on the uploaded image using Chain-of-Thought reasoning.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = ["Pothole", "Pole Fault", "Water Leak", "Waste Overflow", "Drainage Block", "Road Damage"] as const;
const DEPT_MAP: Record<string, string> = {
  Pothole: "Road Dept",
  "Road Damage": "Road Dept",
  "Pole Fault": "Electricity",
  "Water Leak": "Water & Sewage",
  "Waste Overflow": "Waste Management",
  "Drainage Block": "Drainage",
};

const SYSTEM_PROMPT = `You are CivicGuard, a forensic vision AI for urban civic-infrastructure reporting in India.

Perform a 3-step Chain-of-Thought:
1. Identify TEXTURES visible (asphalt, concrete, rust, dirt, metal, industrial, etc.)
2. Identify SETTING (outdoor, roadside, pavement, utility zone, indoor, etc.)
3. RECONCILE: does the object match its civic environment?

Then classify into exactly one category (or null):
- "Pothole" — circular road depression, cavity in asphalt
- "Road Damage" — cracks, surface erosion, peeling, debris on road
- "Pole Fault" — sparking/tilting/dark streetlight, damaged utility pole, exposed wires
- "Water Leak" — leaking pipe, sewage overflow, bubbling water from main
- "Drainage Block" — clogged drain, blocked manhole, stagnant flooding
- "Waste Overflow" — overflowing bin/dumpster, scattered litter, illegal dumping

Rules:
- SOVEREIGNTY: if image clearly shows ANY road/utility/civic infrastructure, accept it.
- CONTEXTUAL PASS: if civic context exists but specific fault unclear, set isContextualPass=true and category="Road Damage".
- REJECT only clearly non-civic indoor scenes (sofas, beds, kitchens, screens).
- Confidence threshold for accept = 0.75.
- Be probabilistic, not binary.`;

const TOOL = {
  type: "function",
  function: {
    name: "classify_civic_image",
    description: "Return a structured civic-issue classification with CoT reasoning.",
    parameters: {
      type: "object",
      properties: {
        textures: { type: "array", items: { type: "string" }, description: "Visible textures" },
        setting: { type: "array", items: { type: "string" }, description: "Detected setting tags" },
        reconciled: { type: "boolean", description: "Object matches civic environment" },
        reasoning: { type: "string", description: "One-sentence CoT summary" },
        primaryObject: { type: "string", description: "Short snake_case label of detected primary object" },
        category: {
          type: ["string", "null"],
          enum: [...CATEGORIES, null],
          description: "Civic category, or null if non-civic",
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        isContextualPass: { type: "boolean" },
        isCivicScene: { type: "boolean", description: "False only for clearly indoor/non-civic scenes" },
        rejectionReason: { type: ["string", "null"], description: "Reason if isCivicScene=false" },
      },
      required: [
        "textures", "setting", "reconciled", "reasoning",
        "primaryObject", "category", "confidence",
        "isContextualPass", "isCivicScene", "rejectionReason",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl, description } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userText = description?.trim()
      ? `Citizen description: "${description}". Analyze the IMAGE primarily; use the description only as a hint.`
      : `No description provided — rely entirely on the image.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "classify_civic_image" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model returned no structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const category = parsed.category && CATEGORIES.includes(parsed.category) ? parsed.category : null;
    const accepted = parsed.isCivicScene && parsed.confidence >= 0.75 && !!category;
    const department = category ? DEPT_MAP[category] : null;

    return new Response(
      JSON.stringify({
        category,
        department,
        confidence: parsed.confidence,
        accepted,
        isCivicScene: parsed.isCivicScene,
        rejectionReason: parsed.rejectionReason,
        isContextualPass: !!parsed.isContextualPass,
        tier1Object: parsed.primaryObject || "unknown",
        cot: {
          textures: parsed.textures || [],
          setting: parsed.setting || [],
          reconciled: !!parsed.reconciled,
          reasoning: parsed.reasoning || "",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("classify-image error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
