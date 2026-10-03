function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );
}

function renderPreviewCard(preview) {
  return `<article>
    <h2>${escapeHtml(preview.label)}</h2>
    <div class="links">
      <a href="${preview.id}.html">Open email</a>
      <a href="${preview.id}.txt">Plain text</a>
    </div>
    <iframe title="${escapeHtml(preview.label)}" src="${preview.id}.html" loading="lazy"></iframe>
  </article>`;
}

export function renderPreviewGallery(previews) {
  const cards = previews.map(renderPreviewCard).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Email-kit template gallery</title>

    <style>
      body { margin: 0; font: 16px system-ui; background: #f3f5f8; color: #172033; }
      main { max-width: 1240px; margin: auto; padding: 32px 20px; }
      h1 { font-size: 32px; letter-spacing: -1px; }
      p { line-height: 1.6; color: #475569; }
      h2 { font-size: 16px; margin: 20px 0 8px; }
      a { color: #334155; }
      article { min-width: 0; }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
        gap: 24px;
      }

      iframe {
        width: 100%;
        height: 840px;
        border: 1px solid #dce2ea;
        border-radius: 12px;
        box-sizing: border-box;
        background: white;
      }

      .links { display: flex; gap: 18px; margin-bottom: 12px; font-size: 13px; }
    </style>
  </head>

  <body>
    <main>
      <h1>Email-kit template gallery</h1>
      <p>
        ${previews.length} examples covering account emails, invitations, announcements, and task notifications.
        All content is synthetic. Resize the window or open an email directly to inspect it at another width.
        Expiry values and branding here are examples, not application configuration.
      </p>
      <div class="grid">
        ${cards}
      </div>
    </main>
  </body>
</html>`;
}
