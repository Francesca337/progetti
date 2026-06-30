// Netlify Function: GitHub commit proxy
// Receives commit requests from the dashboard (no auth required —
// Personal Access Token lives in Netlify env vars, never in client code).
//
// Endpoints (same function path, dispatched by HTTP method):
//   GET  /.netlify/functions/commit?path=PATH           → returns { content, sha, ... }
//   GET  /.netlify/functions/commit?path=PATH&raw=1     → returns the decoded file body
//                                                         (used by the dashboard to read
//                                                          journey.json live from GitHub
//                                                          without a Netlify rebuild)
//   POST /.netlify/functions/commit                     → body: { path, content (b64), message }
//                                                         → commits to repo, returns GitHub response
//                                                         Commit messages get [skip ci] appended
//                                                         so CMS edits don't burn build minutes.

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
      const qs   = event.queryStringParameters || {};
      const path = qs.path;
      const raw  = qs.raw === "1";
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
      if (raw) {
        const decoded = Buffer.from(data.content || "", "base64").toString("utf8");
        // Pick a Content-Type by extension so JSON callers can fetch().json()
        const ext = (path.split(".").pop() || "").toLowerCase();
        const contentType =
          ext === "json" ? "application/json; charset=utf-8" :
          ext === "html" ? "text/html; charset=utf-8" :
          ext === "css"  ? "text/css; charset=utf-8" :
          ext === "js"   ? "text/javascript; charset=utf-8" :
                            "text/plain; charset=utf-8";
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            // Always-fresh: the whole point of bypassing rebuilds is live reads.
            "Cache-Control": "no-store, max-age=0",
          },
          body: decoded,
        };
      }
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

      // Append [skip ci] so CMS edits don't trigger Netlify rebuilds.
      // Data is read live via this Function (raw=1), so no rebuild is needed.
      const baseMsg = message || `cms: update ${path}`;
      const finalMsg = /\[(skip ci|skip netlify|netlify skip)\]/i.test(baseMsg)
        ? baseMsg
        : `${baseMsg} [skip ci]`;

      const payload = {
        message: finalMsg,
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
