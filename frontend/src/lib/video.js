// Helpers vidéo (Cloudinary).

// Génère l'URL de la miniature de couverture d'une vidéo Cloudinary
// (première frame en JPG, façon vignette YouTube).
// Ex : .../video/upload/v123/abc.mp4 -> .../video/upload/so_0,w_640,h_360,c_fill,q_auto/v123/abc.jpg
export function cloudinaryVideoThumb(url, { width = 640, height = 360 } = {}) {
  if (!url || !url.includes('/upload/')) return null;
  return url
    .replace('/upload/', `/upload/so_0,w_${width},h_${height},c_fill,q_auto/`)
    .replace(/\.\w+(\?.*)?$/, '.jpg');
}
