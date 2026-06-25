'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface CityGroup {
  city: string;
  country: string;
  count: number;
  totalSales: number;
  customers: { id: string; name: string; sales: number }[];
}

// Diccionario mínimo de ciudades comunes ES/EU. Para producción real, usar
// servicio de geocoding (Nominatim/Mapbox) y cachear en DB.
const CITY_COORDS: Record<string, [number, number]> = {
  'madrid|es': [40.4168, -3.7038],
  'barcelona|es': [41.3851, 2.1734],
  'valencia|es': [39.4699, -0.3763],
  'sevilla|es': [37.3891, -5.9845],
  'zaragoza|es': [41.6488, -0.8891],
  'málaga|es': [36.7213, -4.4214],
  'malaga|es': [36.7213, -4.4214],
  'murcia|es': [37.9922, -1.1307],
  'bilbao|es': [43.263, -2.935],
  'palma|es': [39.5696, 2.6502],
  'las palmas|es': [28.1235, -15.4363],
  'alicante|es': [38.3452, -0.481],
  'córdoba|es': [37.8882, -4.7794],
  'cordoba|es': [37.8882, -4.7794],
  'valladolid|es': [41.6523, -4.7245],
  'vigo|es': [42.2406, -8.7207],
  'gijón|es': [43.5322, -5.6611],
  'gijon|es': [43.5322, -5.6611],
  'a coruña|es': [43.3623, -8.4115],
  'la coruña|es': [43.3623, -8.4115],
  'granada|es': [37.1773, -3.5986],
  'oviedo|es': [43.3614, -5.8493],
  'tenerife|es': [28.2916, -16.6291],
  'santander|es': [43.4623, -3.8099],
  'pamplona|es': [42.8125, -1.6458],
  'salamanca|es': [40.9701, -5.6635],
  'lisboa|pt': [38.7223, -9.1393],
  'lisbon|pt': [38.7223, -9.1393],
  'porto|pt': [41.1579, -8.6291],
  'paris|fr': [48.8566, 2.3522],
  'london|uk': [51.5074, -0.1278],
  'london|gb': [51.5074, -0.1278],
  'roma|it': [41.9028, 12.4964],
  'milano|it': [45.4642, 9.19],
  'berlin|de': [52.52, 13.405],
};

declare global {
  interface Window {
    L: any;
  }
}

export function CustomersMap({ groups }: { groups: CityGroup[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(containerRef.current).setView([40.4, -3.7], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    let markerCount = 0;
    for (const g of groups) {
      const key = `${g.city.toLowerCase()}|${g.country.toLowerCase()}`;
      const coords = CITY_COORDS[key];
      if (!coords) continue;

      const radius = Math.min(8 + g.count * 2, 30);
      const marker = L.circleMarker(coords, {
        radius,
        fillColor: '#3b82f6',
        color: '#1d4ed8',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.65,
      }).addTo(map);

      const popupHtml = `
        <div style="min-width:200px">
          <p style="font-weight:600;text-transform:capitalize;margin:0 0 4px">${g.city}</p>
          <p style="font-size:11px;color:#666;text-transform:uppercase;margin:0 0 8px">${g.country}</p>
          <p style="font-size:12px;margin:0 0 4px"><strong>${g.count}</strong> clientes · <strong>${g.totalSales}</strong> ventas</p>
          <ul style="font-size:11px;margin:8px 0 0;padding:0 0 0 16px;max-height:120px;overflow:auto">
            ${g.customers.slice(0, 8).map(c => `<li>${c.name} (${c.sales})</li>`).join('')}
          </ul>
        </div>
      `;
      marker.bindPopup(popupHtml);
      markerCount++;
    }

    mapRef.current = map;
    if (markerCount === 0) {
      console.warn('Mapa: ninguna ciudad reconocida en el diccionario');
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady, groups]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onLoad={() => setLeafletReady(true)}
      />
      <div ref={containerRef} style={{ height: 500, width: '100%' }} />
    </>
  );
}
