/**
 * Inyecta tracking en el HTML de una campaña:
 * - Pixel de apertura: <img 1x1> antes de </body>
 * - Reescribe links externos para pasar por /api/campaigns/track/click
 *
 * Si el HTML no tiene <body>, añade el pixel al final.
 */
export function injectEmailTracking(html: string, trackingId: string, baseUrl: string): string {
  const pixel = `<img src="${baseUrl}/api/campaigns/track/open/${trackingId}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`;

  // Reescribe href="https://..." (ignora ya-tracked y mailto)
  let out = html.replace(/href="(https?:\/\/[^"]+)"/gi, (m, url) => {
    if (url.startsWith(`${baseUrl}/api/campaigns/track/`)) return m;
    const encoded = encodeURIComponent(url);
    return `href="${baseUrl}/api/campaigns/track/click/${trackingId}?u=${encoded}"`;
  });

  // Inyecta pixel
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${pixel}</body>`);
  } else {
    out = out + pixel;
  }

  return out;
}
