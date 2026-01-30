import { WorkData } from '../types';

const sendDocument = async (botToken: string, chatId: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', file);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Failed to send document: ${result.description}`);
  }
};

export const sendTelegramReport = async (
  botToken: string,
  chatId: string,
  data: WorkData,
  kmlFile?: File
): Promise<boolean> => {
  if (!data.type || !data.pointA || !data.pointB || data.photos.length === 0) {
    throw new Error("Incomplete work data");
  }

  const distanceText = data.distance 
    ? `\n📏 <b>ចម្ងាយ:</b> ${data.distance.toFixed(2)}m` 
    : '';

  const caption = `
👷 <b>របាយការណ៍ការងារ MT</b>
<b>ឈ្មោះទីតាំង:</b> ${data.name || 'គ្មានឈ្មោះ'}
<b>ប្រភេទ:</b> ${data.type}${distanceText}

📍 <b>ចំណុច A (ចាប់ផ្តើម):</b>
Lat: ${data.pointA.latitude.toFixed(6)}
Long: ${data.pointA.longitude.toFixed(6)}
<a href="https://www.google.com/maps/search/?api=1&query=${data.pointA.latitude},${data.pointA.longitude}">មើលលើផែនទី</a>

📍 <b>ចំណុច B (បញ្ចប់):</b>
Lat: ${data.pointB.latitude.toFixed(6)}
Long: ${data.pointB.longitude.toFixed(6)}
<a href="https://www.google.com/maps/search/?api=1&query=${data.pointB.latitude},${data.pointB.longitude}">មើលលើផែនទី</a>
`;

  const formData = new FormData();
  formData.append('chat_id', chatId);

  try {
    // 1. Send Photos
    if (data.photos.length === 1) {
      formData.append('photo', data.photos[0]);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.description);
    } else {
      const media = data.photos.map((_, index) => ({
        type: 'photo',
        media: `attach://photo_${index}`,
        parse_mode: 'HTML',
        caption: index === 0 ? caption : ''
      }));

      formData.append('media', JSON.stringify(media));
      data.photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo);
      });

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.description);
    }

    // 2. Send KML if provided
    if (kmlFile) {
      await sendDocument(botToken, chatId, kmlFile);
    }

    return true;
  } catch (error) {
    console.error('Telegram API Error:', error);
    throw error;
  }
};