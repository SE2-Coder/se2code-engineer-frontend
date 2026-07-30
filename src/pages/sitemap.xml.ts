// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';

// Lee la variable de entorno inyectada por K8s, o usa el fallback por seguridad
const SITE_URL = process.env.SITE_URL || 'https://se2code.engineer';
const DIRECTUS_API_URL = process.env.DIRECTUS_API_URL || 'http://172.26.3.43:8055';

export const GET: APIRoute = async () => {
  try {
    // 1. Obtener todos los posts publicados desde Directus
    const response = await fetch(`${DIRECTUS_API_URL}/items/posts?fields=slug,date_updated`);
    const result = await response.json();
    const posts = result.data || [];

    // 2. Generar las URLs de los posts
    const postUrls = posts.map((post: any) => {
      const lastmod = post.date_updated 
        ? new Date(post.date_updated).toISOString() 
        : new Date().toISOString();
        
      return `
      <url>
        <loc>${SITE_URL}/${post.slug}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>`;
    }).join('');

    // 3. Construir el XML final del sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${postUrls}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
};
