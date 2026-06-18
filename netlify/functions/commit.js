// Netlify Function: GitHub commit proxy
// Receives commit requests from the dashboard (no auth required —
// Personal Access Token lives in Netlify env vars, never in client code).
//
// Endpoints (same function path, dispatched by HTTP method):
//   GET  /.netlify/functions/commit?path=PATH  → returns { content, sha, ... }
//   POST /.netlify/functions/commit             → body: { path, content (b64), message }
//                                                 → commits to repo, returns GitHub response

const TOKEN  = process.env.GITHUB_TOKEN;
const REPO   = process.env.GITHUB_REPO   || "Francesca337/progetti";
const BRANCH = process.env.GITHUB_BRANCH || "claude/create-retail-dashboard-pzdUj";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (!TOKEN) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "GITHUB_TOKEN env var not configured on Netlify" }),
    };
  }

  try {
    if (event.httpMethod === "GET") {
      const path = (event.queryStringParameters || {}).path;
      if (!path) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "path required" }) };
      }
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(BRANCH)}`,
        { headers: { Authorization: `token ${TOKEN}`, "User-Agent": "giotto-dashboard" } }
      );
      if (res.status === 404) {
        return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "not found" }) };
      }
      if (!res.ok) {
        const txt = await res.text();
        return { statusCode: res.status, headers: corsHeaders, body: JSON.stringify({ error: txt }) };
      }
      const data = await res.json();
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { path, content, message } = body;
      if (!path || content == null) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "path + content required" }) };
      }

      // Get current SHA if the file exists (required to update)
      let sha;
      const getRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(BRANCH)}`,
        { headers: { Authorization: `token ${TOKEN}`, "User-Agent": "giotto-dashboard" } }
      );
      if (getRes.ok) {
        const cur = await getRes.json();
        sha = cur.sha;
      }

      const payload = {
        message: message || `cms: update ${path}`,
        content,
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      };

      const putRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${TOKEN}`,
            "User-Agent": "giotto-dashboard",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!putRes.ok) {
        const txt = await putRes.text();
        return { statusCode: putRes.status, headers: corsHeaders, body: JSON.stringify({ error: txt }) };
      }
      const result = await putRes.json();
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
    }

    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "method not allowed" }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
};
