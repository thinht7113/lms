export type VideoEmbedInfo = {
  isIframe: boolean;
  embedUrl: string;
  provider: "youtube" | "gdrive" | "vimeo" | "rumble" | "dailymotion" | "okru" | "iframe" | "direct" | "unknown";
};

export const getVideoEmbedInfo = (url?: string | null): VideoEmbedInfo => {
  if (!url) {
    return { isIframe: false, embedUrl: "", provider: "unknown" };
  }

  const cleanUrl = url.trim();

  // 1. YouTube & YouTube Nocookie
  if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be") || cleanUrl.includes("youtube-nocookie.com")) {
    const match = cleanUrl.match(/^.*(youtu.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    const embedUrl = match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : cleanUrl;
    return { isIframe: true, embedUrl, provider: "youtube" };
  }

  // 2. Google Drive
  if (cleanUrl.includes("drive.google.com") || cleanUrl.includes("drive.usercontent.google.com")) {
    const driveMatch = cleanUrl.match(/(?:id=|file\/d\/|open\?id=|^)([a-zA-Z0-9_-]{25,33})/);
    const embedUrl = driveMatch ? `https://drive.google.com/file/d/${driveMatch[1]}/preview` : cleanUrl;
    return { isIframe: true, embedUrl, provider: "gdrive" };
  }

  // 3. Vimeo
  if (cleanUrl.includes("vimeo.com")) {
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    const embedUrl = vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : cleanUrl;
    return { isIframe: true, embedUrl, provider: "vimeo" };
  }

  // 4. Rumble
  if (cleanUrl.includes("rumble.com")) {
    return { isIframe: true, embedUrl: cleanUrl, provider: "rumble" };
  }

  // 5. Dailymotion
  if (cleanUrl.includes("dailymotion.com") || cleanUrl.includes("dai.ly")) {
    return { isIframe: true, embedUrl: cleanUrl, provider: "dailymotion" };
  }

  // 6. Ok.ru
  if (cleanUrl.includes("ok.ru")) {
    return { isIframe: true, embedUrl: cleanUrl, provider: "okru" };
  }

  // 7. Generic Iframe Embed URL (contains /embed/, /player/, or /preview)
  if (cleanUrl.includes("/embed/") || cleanUrl.includes("/player/") || cleanUrl.includes("/preview")) {
    return { isIframe: true, embedUrl: cleanUrl, provider: "iframe" };
  }

  // Direct MP4 / M3U8 / other direct video URL
  return { isIframe: false, embedUrl: cleanUrl, provider: "direct" };
};

