export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;  
    const user = url.searchParams.get("user") || "letmeowllc";
    const isOrg = url.searchParams.get("org") === "true"; 
    const accentColor = url.searchParams.get("color") || "#22C58B";
    const theme = url.searchParams.get("theme") || "dark";
    const textColor = theme === "light" ? "#24292f" : "#E8FFF5";
    const subtextColor = theme === "light" ? "#57606a" : "#7DA798";
    const headers = {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "max-age=3600",
      "Access-Control-Allow-Origin": "*"
    };
    const ghHeaders = { "User-Agent": "letmeow-widgets" };
    
    // Увеличили ширину до 260
    const style = `
      <style>
        .title { font-family: 'Segoe UI', sans-serif; font-size: 13px; font-weight: 600; fill: ${subtextColor}; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-family: 'Segoe UI', sans-serif; font-size: 28px; font-weight: bold; fill: ${textColor}; }
        .subtext { font-family: 'Segoe UI', sans-serif; font-size: 12px; fill: ${subtextColor}; }
        .accent-text { fill: ${accentColor}; }
      </style>
    `;

    try {
      if (path === "/followers") {
        const res = await fetch(`https://api.github.com/${isOrg ? 'orgs' : 'users'}/${user}`, { headers: ghHeaders });
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const svg = `
          <svg width="260" height="100" viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg">
            ${style}
            <text x="0" y="20" class="title">Комьюнити</text> 
            <text x="0" y="55" class="value">${data.followers || 0}</text>
            <text x="0" y="75" class="subtext">Подписчики</text>
            <text x="130" y="55" class="value">${data.public_repos || 0}</text>
            <text x="130" y="75" class="subtext">Репозитории</text>
          </svg>
        `;
        return new Response(svg, { headers });
      }

      if (path === "/stars") {
        const reposRes = await fetch(`https://api.github.com/${isOrg ? 'orgs' : 'users'}/${user}/repos?per_page=100`, { headers: ghHeaders });
        if (!reposRes.ok) throw new Error("Repos not found");
        const repos = await reposRes.json();
        const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
        const totalForks = repos.reduce((acc, r) => acc + r.forks_count, 0);
        const svg = `
          <svg width="260" height="100" viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg">
            ${style}
            <text x="0" y="20" class="title">Достижения</text>   
            <text x="0" y="55" class="value accent-text">${totalStars}</text>
            <text x="0" y="75" class="subtext">Звёзды</text>
            <text x="130" y="55" class="value">${totalForks}</text>
            <text x="130" y="75" class="subtext">Форки</text>
          </svg>
        `;
        return new Response(svg, { headers });
      }

      if (path === "/langs") {
        const reposRes = await fetch(`https://api.github.com/${isOrg ? 'orgs' : 'users'}/${user}/repos?per_page=100`, { headers: ghHeaders });
        if (!reposRes.ok) throw new Error("Repos not found");
        const repos = await reposRes.json(); 
        const langs = {};
        let totalSize = 0;
        for (const repo of repos) {
          if (repo.language) {
            const langRes = await fetch(repo.languages_url, { headers: ghHeaders });
            if (langRes.ok) {
              const langData = await langRes.json();
              for (const [lang, size] of Object.entries(langData)) {
                langs[lang] = (langs[lang] || 0) + size;
                totalSize += size;
              }
            }
          }
        }   
        const topLangs = Object.entries(langs)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4);
        const opacities = [1, 0.7, 0.4, 0.2];
        let barWidth = 0;
        let barSvg = '';
        let legendSvg = '';  
        topLangs.forEach(([lang, size], i) => {
          const percent = (size / totalSize) * 100;
          const width = (percent / 100) * 260;
          
  
          const shortLang = lang.length > 15 ? lang.substring(0, 15) + '...' : lang;

          barSvg += `<rect x="${barWidth}" y="0" width="${width}" height="6" fill="${accentColor}" opacity="${opacities[i] || 0.1}" />`;
          legendSvg += `
            <circle cx="0" cy="${i * 18}" r="3" fill="${accentColor}" opacity="${opacities[i] || 0.1}" />
            <text x="10" y="${i * 18 + 4}" font-family="'Segoe UI', sans-serif" font-size="10" fill="${textColor}">${shortLang} (${Math.round(percent)}%)</text>
          `;
          barWidth += width;
        });
        const svg = `
          <svg width="260" height="120" viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
            ${style}
            <text x="0" y="20" class="title">Языки</text>
            <g transform="translate(0, 30)">${barSvg}</g>
            <g transform="translate(0, 50)">${legendSvg}</g>
          </svg>
        `;
        return new Response(svg, { headers });
      }

      if (path === "/repos") {
        const reposRes = await fetch(`https://api.github.com/${isOrg ? 'orgs' : 'users'}/${user}/repos?per_page=100&sort=stars`, { headers: ghHeaders });
        if (!reposRes.ok) throw new Error("Repos not found");
        const repos = await reposRes.json();
        const topRepos = repos.slice(0, 3);
        let reposSvg = '';
        topRepos.forEach((repo, i) => {
          reposSvg += `
            <g transform="translate(0, ${30 + i * 25})">
              <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="12" fill="${accentColor}">★ ${repo.stargazers_count}</text>
              <text x="40" y="0" font-family="'Segoe UI', sans-serif" font-size="12" fill="${textColor}">${repo.name}</text>
            </g>
          `;
        });
        const svg = `
          <svg width="260" height="110" viewBox="0 0 260 110" xmlns="http://www.w3.org/2000/svg">
            ${style}
            <text x="0" y="20" class="title">Популярные репозитории</text>
            ${reposSvg}
          </svg>
        `;
        return new Response(svg, { headers });
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="50"><text x="0" y="30" fill="#FF5A72" font-family="sans-serif">Error: ${e.message}</text></svg>`, { headers });
    }
  }
};
