// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TOKEN_EXPIRY_BUFFER = 3500 * 1000;
const CACHE_TTL = 300; // 5 minutes cache for files
const SEARCH_CACHE_TTL = 600; // 10 minutes cache for search results

// Configuration - make this easily configurable
const authConfig = {
  client_id: "", // RClone client_id
  client_secret: "", // RClone client_secret
  refresh_token: "", // unique
  root: "allDrives",
};

let gd;

// Cache implementation
class Cache {
  constructor() {
    this.cache = {};
  }

  set(key, value, ttl = CACHE_TTL) {
    this.cache[key] = {
      value,
      expiry: Date.now() + (ttl * 1000)
    };
  }

  get(key) {
    const item = this.cache[key];
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    delete this.cache[key];
    return null;
  }

  clear() {
    this.cache = {};
  }
}

const cache = new Cache();

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

// Enhanced HTML template with better UX
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>GLOBAL INDEXER</title>
  <link rel="shortcut icon" href="https://raw.githubusercontent.com/cheems/goindex-extended/master/images/favicon-x.png" type="image/x-icon" />
  <style>
    @import url("https://fonts.googleapis.com/css?family=Londrina+Outline");
    @import url("https://fonts.googleapis.com/css2?family=Gemunu+Libre:wght@700&display=swap");

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #1a1a1a;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .neon {
      font-family: "Londrina Outline", cursive;
      text-transform: uppercase;
      font-size: 4em;
      letter-spacing: 0.15em;
      margin-bottom: 10px;
    }

    .pink {
      text-shadow: 0 0 5px #ff7bac, 0 0 10px #ff7bac, 0 0 20px #ff7bac, 0 0 40px #ff7bac;
    }

    .subtitle {
      color: #ccc;
      font-size: 1.2em;
      margin-bottom: 30px;
    }

    .search-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
    }

    .search-form {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .form-control {
      flex: 1;
      padding: 15px 20px;
      border: none;
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 16px;
      outline: none;
    }

    .form-control::placeholder {
      color: #aaa;
    }

    .btn {
      padding: 15px 30px;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(45deg, #007bff, #0056b3);
      color: white;
    }

    .btn-danger {
      background: linear-gradient(45deg, #dc3545, #c82333);
      color: white;
    }

    .btn-secondary {
      background: linear-gradient(45deg, #6c757d, #545b62);
      color: white;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }

    .results-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      padding: 30px;
      backdrop-filter: blur(10px);
    }

    .file-item {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
      transition: all 0.3s ease;
      border-left: 4px solid #4caf50;
    }

    .file-item:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateX(5px);
    }

    .file-link {
      color: #4caf50;
      text-decoration: none;
      font-family: "Gemunu Libre", sans-serif;
      font-size: 1.2em;
      display: block;
      margin-bottom: 10px;
    }

    .file-meta {
      color: #ccc;
      font-size: 0.9em;
    }

    .file-size {
      color: #ff7bac;
      font-weight: bold;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #ccc;
    }

    .error {
      background: rgba(220, 53, 69, 0.2);
      border: 1px solid #dc3545;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      color: #ff6b6b;
    }

    .stats {
      text-align: center;
      color: #aaa;
      margin-top: 20px;
      font-size: 0.9em;
    }

    @media (max-width: 768px) {
      .neon {
        font-size: 2.5em;
      }
      
      .search-form {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="neon pink">GLOBAL INDEXER</h1>
      <p class="subtitle">Search and stream videos from Google Drive</p>
    </div>

    <div class="search-section">
      <form action="/search/" method="get" class="search-form">
        <input type="text" name="q" class="form-control" placeholder="Search for videos (mkv, mp4, avi)..." required />
        <button class="btn btn-primary" type="submit">Search</button>
      </form>
      
      <div style="display: flex; gap: 10px;">
        <form action="/searchjson/" method="get" style="flex: 1;">
          <button class="btn btn-danger" type="submit">Get JSON Results</button>
        </form>
        <button class="btn btn-secondary" onclick="clearCache()">Clear Cache</button>
      </div>
    </div>

    <div class="results-section">
      <div id="results-container">
        SEARCH_RESULT_PLACEHOLDER
      </div>
    </div>

    <div class="stats" id="stats"></div>
  </div>

  <script>
    function clearCache() {
      fetch('/clear-cache/', { method: 'POST' })
        .then(response => {
          if (response.ok) {
            alert('Cache cleared successfully');
            location.reload();
          }
        })
        .catch(error => {
          alert('Error clearing cache');
        });
    }

    // Add loading state for better UX
    document.addEventListener('DOMContentLoaded', function() {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', function() {
          const resultsContainer = document.getElementById('results-container');
          if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading">Searching... Please wait</div>';
          }
        });
      });
    });

    // Update stats
    function updateStats(count, time) {
      const stats = document.getElementById('stats');
      if (stats) {
        stats.innerHTML = \`Found \${count} results in \${time}ms\`;
      }
    }
  </script>
</body>
</html>
`;

/**
 * Enhanced request handler with better routing
 */
async function handleRequest(request) {
  const startTime = Date.now();
  
  try {
    if (gd === undefined) {
      gd = new GoogleDrive(authConfig);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle different routes
    const routes = {
      '/': handleHome,
      '/search/': handleSearch,
      '/searchjson/': handleSearchJSON,
      '/clear-cache/': handleClearCache,
      '/health/': handleHealth,
      'default': handleFileRequest
    };

    const handler = Object.keys(routes).find(route => path.startsWith(route)) || 'default';
    const response = await routes[handler](request, path, url);
    
    // Add performance headers
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', cache.get(path) ? 'HIT' : 'MISS');
    
    return response;

  } catch (error) {
    return handleError(error, request);
  }
}

/**
 * Route handlers
 */
async function handleHome(request, path, url) {
  const html = htmlTemplate.replace("SEARCH_RESULT_PLACEHOLDER", 
    '<div class="loading">Enter a search term to find videos</div>');
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

async function handleSearch(request, path, url) {
  const query = url.searchParams.get("q") || path.replace('/search/', '');
  if (!query) {
    return Response.redirect(url.origin + '/', 302);
  }

  const cacheKey = `search:${query}`;
  let cached = cache.get(cacheKey);
  
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Cache": "HIT"
      }
    });
  }

  const files = await gd.getFilesCached(`/search/${query}`);
  if (!files || files === "FAILED") {
    throw new Error("Could not load search results");
  }

  let resultsHtml = '';
  if (files.length === 0) {
    resultsHtml = '<div class="error">No videos found matching your search</div>';
  } else {
    files.forEach(file => {
      const fileUrl = `${url.origin}/${encodeURIComponent(file.name)}`;
      const sizeGB = formatFileSize(file.size);
      resultsHtml += `
        <div class="file-item">
          <a href="${fileUrl}" class="file-link" target="_blank">${escapeHtml(file.name)}</a>
          <div class="file-meta">
            Size: <span class="file-size">${sizeGB}</span> | 
            ID: ${file.id} | 
            Drive: ${file.driveId || 'Main'}
          </div>
        </div>
      `;
    });
  }

  const fullHtml = htmlTemplate.replace("SEARCH_RESULT_PLACEHOLDER", resultsHtml)
    .replace('updateStats(count, time)', `updateStats(${files.length}, ${Date.now()})`);
  
  cache.set(cacheKey, fullHtml, SEARCH_CACHE_TTL);
  
  return new Response(fullHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Cache": "MISS"
    }
  });
}

async function handleSearchJSON(request, path, url) {
  const query = url.searchParams.get("q") || path.replace('/searchjson/', '');
  if (!query) {
    return new Response(JSON.stringify({ error: "Query parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cacheKey = `searchjson:${query}`;
  let cached = cache.get(cacheKey);
  
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT"
      }
    });
  }

  const files = await gd.getFilesCached(`/search/${query}`);
  if (!files || files === "FAILED") {
    throw new Error("Could not load search results");
  }

  const response = files.map(file => ({
    name: file.name,
    link: `${url.origin}/${encodeURIComponent(file.name)}`,
    size: file.size,
    size_gb: formatFileSize(file.size),
    file_id: file.id,
    drive_id: file.driveId,
    mime_type: 'video/*'
  }));

  const jsonResponse = JSON.stringify({
    query: query,
    results: response,
    count: response.length,
    timestamp: new Date().toISOString()
  }, null, 2);

  cache.set(cacheKey, jsonResponse, SEARCH_CACHE_TTL);
  
  return new Response(jsonResponse, {
    headers: {
      "Content-Type": "application/json",
      "X-Cache": "MISS"
    }
  });
}

async function handleClearCache(request, path, url) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  cache.clear();
  return new Response(JSON.stringify({ message: "Cache cleared successfully" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleHealth(request, path, url) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    cache_size: Object.keys(cache.cache).length,
    version: "2.0.0"
  };
  
  return new Response(JSON.stringify(health), {
    headers: { "Content-Type": "application/json" }
  });
}

async function handleFileRequest(request, path, url) {
  if (path === '/') {
    return handleHome(request, path, url);
  }

  const file = await gd.getFilesCached(path);
  if (!file || file.length === 0) {
    throw new Error("File not found");
  }

  const fileInfo = file[0];
  const range = request.headers.get("Range");
  return gd.downloadFile(fileInfo.id, range);
}

/**
 * Enhanced Google Drive class with better error handling and performance
 */
class GoogleDrive {
  constructor(authConfig) {
    this.authConfig = authConfig;
    this.filesCache = new Map();
    this.accessTokenPromise = null;
    this.init();
  }

  async init() {
    // Pre-warm the token
    await this.accessToken();
  }

  async fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await sleep(RETRY_DELAY * Math.pow(2, attempt - 1));
        }
        
        const response = await fetch(url, options);
        
        if (response.ok || response.status === 404) {
          return response;
        }
        
        // Refresh token on 401
        if (response.status === 401 && attempt < maxRetries) {
          this.authConfig.accessToken = null;
          this.authConfig.expires = 0;
          options.headers.set('authorization', 'Bearer ' + await this.accessToken());
          continue;
        }
        
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
      }
    }
    
    throw lastError;
  }

  async downloadFile(id, range = "") {
    const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    const requestOption = await this.requestOption();
    
    if (range) {
      requestOption.headers.set("Range", range);
    }

    const response = await this.fetchWithRetry(url, requestOption);
    
    // Handle partial content
    const headers = new Headers(response.headers);
    if (range && response.status === 206) {
      headers.set("Content-Range", response.headers.get("Content-Range"));
    }
    
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });
  }

  async getFilesCached(path) {
    const cached = this.filesCache.get(path);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const files = await this.getFiles(path);
    if (files !== "FAILED") {
      this.filesCache.set(path, {
        data: files,
        expiry: Date.now() + (CACHE_TTL * 1000)
      });
    }
    
    return files;
  }

  async getFiles(path) {
    try {
      const arr = path.split("/");
      let name = arr.pop();
      name = decodeURIComponent(name).replace(/'/g, "\\'");

      const url = "https://www.googleapis.com/drive/v3/files";
      const params = this.getSearchScopeParams();

      // Enhanced search query with more video formats
      params.q = `name contains '${name}' and (mimeType contains 'video/' or mimeType contains 'application/octet-stream') and trashed = false`;
      params.fields = "files(id, name, size, mimeType, driveId, modifiedTime)";
      params.orderBy = "modifiedTime desc";
      params.pageSize = 50;

      const fullUrl = url + "?" + this.enQuery(params);
      const requestOption = await this.requestOption();
      
      const response = await this.fetchWithRetry(fullUrl, requestOption);
      const obj = await response.json();

      return response.ok ? obj.files : "FAILED";
    } catch (error) {
      console.error('Error fetching files:', error);
      return "FAILED";
    }
  }

  getSearchScopeParams() {
    if (this.authConfig.root === "allDrives") {
      return {
        corpora: "allDrives",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 1000,
      };
    } else if (this.authConfig.root) {
      return {
        corpora: "drive",
        driveId: this.authConfig.root,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 1000,
      };
    }
    
    return {
      spaces: "drive",
      pageSize: 1000,
    };
  }

  async accessToken() {
    if (!this.authConfig.accessToken || this.authConfig.expires < Date.now()) {
      // Prevent multiple simultaneous token refreshes
      if (!this.accessTokenPromise) {
        this.accessTokenPromise = this.fetchAccessToken().finally(() => {
          this.accessTokenPromise = null;
        });
      }
      
      const tokenData = await this.accessTokenPromise;
      this.authConfig.accessToken = tokenData.access_token;
      this.authConfig.expires = Date.now() + (tokenData.expires_in * 1000) - TOKEN_EXPIRY_BUFFER;
    }
    
    return this.authConfig.accessToken;
  }

  async fetchAccessToken() {
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const postData = {
      client_id: this.authConfig.client_id,
      client_secret: this.authConfig.client_secret,
      refresh_token: this.authConfig.refresh_token,
      grant_type: "refresh_token",
    };

    const requestOption = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: this.enQuery(postData),
    };

    const response = await this.fetchWithRetry(url, requestOption);
    return await response.json();
  }

  async requestOption(headers = new Headers(), method = "GET") {
    const accessToken = await this.accessToken();
    headers.set("authorization", "Bearer " + accessToken);
    return { method, headers };
  }

  enQuery(data) {
    const ret = [];
    for (let key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        ret.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
      }
    }
    return ret.join("&");
  }
}

/**
 * Utility functions
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleError(error, request) {
  console.error('Global error handler:', error);
  
  const isJson = request.headers.get('accept')?.includes('application/json');
  
  if (isJson) {
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  }
  
  const errorHtml = htmlTemplate.replace("SEARCH_RESULT_PLACEHOLDER", 
    `<div class="error"><strong>Error:</strong> ${escapeHtml(error.message)}</div>`);
  
  return new Response(errorHtml, {
    status: 500,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
