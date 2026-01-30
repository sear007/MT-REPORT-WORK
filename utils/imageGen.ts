import { WorkData } from '../types';

// Mercator Projection Helpers
const TILE_SIZE = 256;

function project(lat: number, lng: number, zoom: number) {
  let siny = Math.sin((lat * Math.PI) / 180);
  siny = Math.min(Math.max(siny, -0.9999), 0.9999);
  
  const worldSize = TILE_SIZE * Math.pow(2, zoom);
  const x = worldSize * (lng + 180) / 360;
  const y = worldSize * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI));
  
  return { x, y };
}

function getOptimalZoom(latA: number, lngA: number, latB: number, lngB: number, width: number, height: number, padding: number) {
  for (let z = 19; z >= 0; z--) {
    const pA = project(latA, lngA, z);
    const pB = project(latB, lngB, z);
    const boundsWidth = Math.abs(pA.x - pB.x);
    const boundsHeight = Math.abs(pA.y - pB.y);
    
    if (boundsWidth < (width - padding * 2) && boundsHeight < (height - padding * 2)) {
      return z;
    }
  }
  return 15;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Return a 1x1 transparent image on failure to allow canvas to continue
      const empty = new Image();
      empty.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      resolve(empty);
    };
    img.src = url;
  });
};

export const generateSummaryImage = async (data: WorkData, googleApiKey?: string): Promise<File> => {
  const size = 1024; 
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to create canvas context');

  // Fill white background initially
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  let mapDrawn = false;

  // 1. Google Static Maps (Priority if Key Exists)
  if (googleApiKey && data.pointA && data.pointB) {
    try {
      const mapRequestSize = 512; // Scale 2 -> 1024
      const mapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
      mapUrl.searchParams.append('size', `${mapRequestSize}x${mapRequestSize}`);
      mapUrl.searchParams.append('scale', '2');
      mapUrl.searchParams.append('maptype', 'satellite');
      mapUrl.searchParams.append('key', googleApiKey);
      
      const pathStyle = 'color:0xffff00ff|weight:5';
      const pathCoords = `${data.pointA.latitude},${data.pointA.longitude}|${data.pointB.latitude},${data.pointB.longitude}`;
      mapUrl.searchParams.append('path', `${pathStyle}|${pathCoords}`);
      
      mapUrl.searchParams.append('markers', `color:blue|label:A|${data.pointA.latitude},${data.pointA.longitude}`);
      mapUrl.searchParams.append('markers', `color:red|label:B|${data.pointB.latitude},${data.pointB.longitude}`);

      const mapImg = await loadImage(mapUrl.toString());
      if (mapImg.width > 1) { // Check if not the empty fallback
          ctx.drawImage(mapImg, 0, 0, size, size);
          // Dark overlay for text readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, size, size);
          mapDrawn = true;
      }
    } catch (e) {
      console.warn("Google Map Load Failed", e);
    }
  }

  // 2. OSM Tile Stitching (Fallback)
  if (!mapDrawn && data.pointA && data.pointB) {
    try {
      const latA = data.pointA.latitude;
      const lngA = data.pointA.longitude;
      const latB = data.pointB.latitude;
      const lngB = data.pointB.longitude;

      // 1. Determine Zoom
      const zoom = getOptimalZoom(latA, lngA, latB, lngB, size, size, 200);
      
      // 2. Determine Center Pixel of the bounds
      const pA = project(latA, lngA, zoom);
      const pB = project(latB, lngB, zoom);
      const centerPixelX = (pA.x + pB.x) / 2;
      const centerPixelY = (pA.y + pB.y) / 2;

      // 3. Determine Viewport Top-Left in World Pixels
      const viewportX = centerPixelX - size / 2;
      const viewportY = centerPixelY - size / 2;

      // 4. Determine Tile Grid
      const startTileX = Math.floor(viewportX / TILE_SIZE);
      const startTileY = Math.floor(viewportY / TILE_SIZE);
      const endTileX = Math.floor((viewportX + size) / TILE_SIZE);
      const endTileY = Math.floor((viewportY + size) / TILE_SIZE);

      // 5. Fetch Tiles
      const promises = [];
      for (let tx = startTileX; tx <= endTileX; tx++) {
        for (let ty = startTileY; ty <= endTileY; ty++) {
          const url = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
          promises.push({
            tx, ty,
            promise: loadImage(url)
          });
        }
      }

      // 6. Draw Tiles
      const loadedTiles = await Promise.all(promises.map(p => p.promise));
      
      promises.forEach((item, index) => {
        const img = loadedTiles[index];
        const destX = (item.tx * TILE_SIZE) - viewportX;
        const destY = (item.ty * TILE_SIZE) - viewportY;
        ctx.drawImage(img, destX, destY);
      });

      // 7. Draw Route Line
      const ax = pA.x - viewportX;
      const ay = pA.y - viewportY;
      const bx = pB.x - viewportX;
      const by = pB.y - viewportY;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = '#2563eb'; // Blue
      ctx.lineWidth = 6;
      ctx.setLineDash([15, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8. Draw Markers Helper
      const drawMarker = (x: number, y: number, label: string, color: string) => {
        ctx.save();
        ctx.translate(x, y);
        
        // Pin
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-15, -25, -20, -35, -20, -45);
        ctx.arc(0, -45, 20, Math.PI, 0);
        ctx.bezierCurveTo(20, -35, 15, -25, 0, 0);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, -45);

        ctx.restore();
      };

      drawMarker(ax, ay, 'A', '#ef4444'); // Red
      drawMarker(bx, by, 'B', '#4f46e5'); // Indigo

      mapDrawn = true;
    } catch (err) {
      console.error("OSM generation failed", err);
      // Fallback if OSM fails (network etc)
      const gradient = ctx.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, '#f1f5f9');
      gradient.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
  }

  // 3. Info Card Overlay (Shared)
  const cardH = 380;
  const cardW = size - 60;
  const cardX = 30;
  const cardY = size - cardH - 30;
  
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text Config
  const contentX = size / 2;
  const contentStart = cardY + 70;

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  // Use a fallback to serif/sans-serif which usually maps to system Khmer font, but standard fonts might be tricky on canvas.
  // We'll trust the browser to pick a font that supports Khmer unicode if we say 'sans-serif'
  ctx.font = 'bold 24px "Battambang", sans-serif';
  ctx.fillText('កំណត់ត្រាការងារ', contentX, contentStart - 20); // WORK RECORD

  // Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 54px "Battambang", sans-serif';
  const name = data.name.length > 25 ? data.name.substring(0, 25) + '...' : data.name;
  ctx.fillText(name, contentX, contentStart + 50);

  // Type
  ctx.fillStyle = '#475569';
  ctx.font = '36px "Battambang", sans-serif';
  ctx.fillText(data.type || '', contentX, contentStart + 100);

  // Distance Box
  const dist = data.distance ? data.distance.toFixed(2) : "0.00";
  ctx.fillStyle = '#eff6ff'; // Blue 50
  ctx.strokeStyle = '#bfdbfe'; // Blue 200
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(contentX - 150, contentStart + 130, 300, 70, 35);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1d4ed8'; // Blue 700
  ctx.font = 'bold 44px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${dist} m`, contentX, contentStart + 167);
  ctx.textBaseline = 'alphabetic';

  // Coords Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '18px monospace';
  const latA = data.pointA?.latitude.toFixed(6) || '0.000000';
  const lngA = data.pointA?.longitude.toFixed(6) || '0.000000';
  const latB = data.pointB?.latitude.toFixed(6) || '0.000000';
  const lngB = data.pointB?.longitude.toFixed(6) || '0.000000';
  
  ctx.fillText(`A: ${latA}, ${lngA}`, contentX, contentStart + 240);
  ctx.fillText(`B: ${latB}, ${lngB}`, contentX, contentStart + 270);

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