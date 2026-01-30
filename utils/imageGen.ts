import { WorkData } from '../types';

export const generateSummaryImage = async (data: WorkData, googleApiKey?: string): Promise<File> => {
  const size = 1024; 
  // Google Static Maps API Limit is 640x640. Using scale=2 gives 1280x1280, 
  // so we will draw it onto a 1024x1024 canvas, cropping/fitting as needed.
  // Actually, requesting 512x512 with scale=2 gives 1024x1024 exactly.
  const mapRequestSize = 512; 
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to create canvas context');

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  let mapLoaded = false;

  // 1. Load Google Static Map (Satellite) if key exists
  if (googleApiKey && data.pointA && data.pointB) {
    try {
      const mapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
      mapUrl.searchParams.append('size', `${mapRequestSize}x${mapRequestSize}`);
      mapUrl.searchParams.append('scale', '2'); // 512 * 2 = 1024
      mapUrl.searchParams.append('maptype', 'satellite');
      mapUrl.searchParams.append('key', googleApiKey);
      
      // Path
      const pathStyle = 'color:0xffff00ff|weight:5';
      const pathCoords = `${data.pointA.latitude},${data.pointA.longitude}|${data.pointB.latitude},${data.pointB.longitude}`;
      mapUrl.searchParams.append('path', `${pathStyle}|${pathCoords}`);
      
      // Markers
      mapUrl.searchParams.append('markers', `color:blue|label:A|${data.pointA.latitude},${data.pointA.longitude}`);
      mapUrl.searchParams.append('markers', `color:red|label:B|${data.pointB.latitude},${data.pointB.longitude}`);

      const mapImg = await loadImage(mapUrl.toString());
      ctx.drawImage(mapImg, 0, 0, size, size);
      
      // Dark overlay for text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, size, size);
      
      mapLoaded = true;
    } catch (e) {
      console.warn("Failed to load Google Static Map", e);
    }
  }

  if (!mapLoaded) {
    // Fallback Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Schematic Line
    const startX = 200;
    const endX = size - 200;
    const lineY = size / 2;
    
    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 10;
    ctx.setLineDash([25, 25]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.arc(startX, lineY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(endX, lineY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }

  // 2. Info Card Overlay
  const cardH = 400;
  const cardW = size - 80;
  const cardX = 40;
  const cardY = size - cardH - 40;
  
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 30);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text Config
  const contentX = size / 2;
  const contentStart = cardY + 80;

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('WORK RECORD', contentX, contentStart - 20);

  // Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 60px sans-serif';
  const name = data.name.length > 25 ? data.name.substring(0, 25) + '...' : data.name;
  ctx.fillText(name, contentX, contentStart + 50);

  // Type
  ctx.fillStyle = '#475569';
  ctx.font = '40px sans-serif';
  ctx.fillText(data.type || '', contentX, contentStart + 110);

  // Distance
  const dist = data.distance ? data.distance.toFixed(2) : "0.00";
  
  // Distance Box
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(contentX - 160, contentStart + 150, 320, 80, 40);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${dist}m`, contentX, contentStart + 190);
  ctx.textBaseline = 'alphabetic';

  // Coords Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '20px monospace';
  ctx.fillText(`A: ${data.pointA?.latitude.toFixed(6)}, ${data.pointA?.longitude.toFixed(6)}`, contentX, contentStart + 260);
  ctx.fillText(`B: ${data.pointB?.latitude.toFixed(6)}, ${data.pointB?.longitude.toFixed(6)}`, contentX, contentStart + 290);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], `summary-${data.name.replace(/\s+/g,'_')}.jpg`, { type: 'image/jpeg' }));
      } else {
        reject(new Error('Canvas blob creation failed'));
      }
    }, 'image/jpeg', 0.9);
  });
};