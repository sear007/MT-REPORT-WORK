import { WorkData } from '../types';

export const generateKML = (data: WorkData): File => {
  if (!data.pointA || !data.pointB) {
    throw new Error("Missing coordinates for KML generation");
  }

  // KML uses Longitude, Latitude order
  const coordsA = `${data.pointA.longitude},${data.pointA.latitude},0`;
  const coordsB = `${data.pointB.longitude},${data.pointB.latitude},0`;
  const lineCoords = `${coordsA} ${coordsB}`;

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${data.name || 'MT Field Work'}</name>
    <description>${data.type || 'Field Work Record'}</description>
    <Style id="lineStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>ចំណុច A (ចាប់ផ្តើម)</name>
      <Point>
        <coordinates>${coordsA}</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>ចំណុច B (បញ្ចប់)</name>
      <Point>
        <coordinates>${coordsB}</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>ខ្សែតភ្ជាប់</name>
      <styleUrl>#lineStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${lineCoords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  
  // Create a clean filename with timestamp YYYYMMDD_HHMMSS
  const date = new Date();
  const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}${date.getSeconds().toString().padStart(2,'0')}`;
  const cleanName = data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'work';
  const filename = `${cleanName}_${timestamp}.kml`;
  
  return new File([blob], filename, { type: 'application/vnd.google-earth.kml+xml' });
};