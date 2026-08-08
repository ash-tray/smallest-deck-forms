// Cloudflare Worker: proxies Notion calls so the Figma plugin never talks
// to api.notion.com directly (Notion's API sends no CORS headers, so any
// browser-based fetch to it is blocked regardless of Figma's permissions).
//
// Set these under Settings -> Variables and Secrets:
//   NOTION_TOKEN            - your Notion integration token (Secret)
//   NOTION_DATA_SOURCE_ID   - 3b4f9ba0-53c5-8009-8827-000b79126ae6
//
//   { action: "query",  customerName }
//   { action: "update", pageId, figmaUrl?, status? }
//   { action: "create", requesterEmail, customerName, customerLogo?, delivery, pitches, slides, customSlides? }

const ALLOWED_EMAIL_DOMAINS = ["smallest.ai"];
const REQUESTER_EMAIL_PROPERTY = "Request";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const action = body.action || "query";

    if (action === "query") return handleQuery(body, env);
    if (action === "update") return handleUpdate(body, env);
    if (action === "create") return handleCreate(body, env);

    return json({ error: `Unknown action "${action}"` }, 400);
  }
};

async function handleCreate(body, env) {
  const { requesterEmail, customerName, customerLogo, delivery, pitches, slides, customSlides } = body;

  const email = String(requesterEmail || "").trim().toLowerCase();
  if (!isAllowedEmail(email)) {
    return json({ error: "A valid @smallest.ai email is required" }, 403);
  }

  if (!customerName?.trim() || !delivery) {
    return json({ error: "Missing required fields (customerName, delivery)" }, 400);
  }

  if (!Array.isArray(pitches) || pitches.length === 0) {
    return json({ error: "Pick at least one pitch option" }, 400);
  }

  if (!Array.isArray(slides)) {
    return json({ error: "slides must be an array" }, 400);
  }

  if (slides.length === 0 && !customSlides?.trim()) {
    return json({ error: "Pick at least one slide or describe custom slides" }, 400);
  }

  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID) {
    return json({ error: "Worker missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID" }, 500);
  }

  const properties = {
    "Customer Name": { title: [{ text: { content: truncate(customerName.trim(), 2000) } }] },
    [REQUESTER_EMAIL_PROPERTY]: { email },
    Delivery: { date: { start: delivery } },
    "What are we pitching ": { select: { name: pitches[0] } },
    Slides: { multi_select: slides.map((name) => ({ name })) },
    Status: { status: { name: "Requested" } }
  };

  if (customSlides?.trim()) {
    properties["Custom Slides"] = { rich_text: richTextChunks(customSlides.trim()) };
  }

  if (customerLogo?.trim()) {
    properties["Customer Logo"] = {
      files: [{ name: "logo", type: "external", external: { url: customerLogo.trim() } }]
    };
  }

  try {
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { data_source_id: env.NOTION_DATA_SOURCE_ID },
        properties
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return json(
        {
          error: "Notion API error",
          status: notionRes.status,
          detail: data,
          hint: notionHint(data)
        },
        notionRes.status
      );
    }

    return json(
      {
        ok: true,
        pageId: data.id,
        url: data.url,
        requesterEmail: data.properties?.[REQUESTER_EMAIL_PROPERTY]?.email || email
      },
      200
    );
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleQuery(body, env) {
  const customerName = body.customerName;
  if (!customerName) {
    return json({ error: "Missing customerName" }, 400);
  }

  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/data_sources/${env.NOTION_DATA_SOURCE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filter: {
            property: "Customer Name",
            title: { equals: customerName }
          }
        })
      }
    );

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return json({ error: "Notion API error", status: notionRes.status, detail: data }, notionRes.status);
    }

    return json(data, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleUpdate(body, env) {
  const { pageId, figmaUrl, status } = body;

  if (!pageId) {
    return json({ error: "Missing pageId" }, 400);
  }

  const properties = {};
  if (figmaUrl) {
    properties["Figma URL"] = { url: figmaUrl };
  }
  if (status) {
    properties["Status"] = { status: { name: status } };
  }

  if (Object.keys(properties).length === 0) {
    return json({ error: "Nothing to update - provide figmaUrl and/or status" }, 400);
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ properties })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return json({ error: "Notion API error", status: notionRes.status, detail: data }, notionRes.status);
    }

    return json(data, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

function truncate(str, max) {
  return str.length <= max ? str : str.slice(0, max);
}

function richTextChunks(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({ text: { content: text.slice(i, i + 2000) } });
  }
  return chunks;
}

function notionHint(data) {
  const msg = data?.message || "";
  if (msg.includes("is not a property that exists")) {
    return `Add an Email column named "${REQUESTER_EMAIL_PROPERTY}" to the Decks database.`;
  }
  if (msg.includes("is expected to be")) {
    return "A field value doesn't match the Notion property type or allowed options.";
  }
  if (msg.includes("Unauthorized")) {
    return "Check NOTION_TOKEN and that the integration is connected to the Decks database.";
  }
  return null;
}

function isAllowedEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  const domain = normalized.split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
