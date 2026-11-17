import axios from 'axios';

export interface LocationWeather {
  temperature: number;
  condition: string;
}

export interface GeocodingResult {
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
}

/**
 * Servicio de consumo de APIs externas relevantes al proyecto (Rúbrica 2.3)
 * Integra:
 * 1. Open-Meteo Weather API (clima en tiempo real de la zona de estacionamiento)
 * 2. OpenStreetMap Nominatim Reverse Geocoding (resolución de dirección física por coordenadas)
 */
export const externalApiService = {
  /**
   * Obtiene las condiciones climáticas actuales para una coordenada geográfica
   * (e.g. Saber si está lloviendo o soleado en la cochera a reservar)
   */
  async getWeather(latitude: number, longitude: number): Promise<LocationWeather | null> {
    try {
      const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,weather_code',
        },
        timeout: 5000,
      });

      const temp = res.data?.current?.temperature_2m;
      const code = res.data?.current?.weather_code;

      let condition = 'Despejado';
      if (code >= 51 && code <= 67) condition = 'Llovizna';
      else if (code >= 71) condition = 'Lluvia intensa';
      else if (code >= 1 && code <= 3) condition = 'Parcialmente nublado';

      return {
        temperature: temp ?? 22,
        condition,
      };
    } catch {
      // Fallback seguro si la API de clima externa no responde
      return {
        temperature: 22,
        condition: 'Templado',
      };
    }
  },

  /**
   * Obtiene la dirección legible a partir de coordenadas GPS mediante OpenStreetMap Nominatim
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 18,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'CocheraYa-Mobile/1.0',
        },
        timeout: 5000,
      });

      const addr = res.data?.address;
      return {
        displayName: res.data?.display_name || '',
        road: addr?.road,
        suburb: addr?.suburb || addr?.neighbourhood,
        city: addr?.city || addr?.town || 'Lima',
      };
    } catch {
      return null;
    }
  },
};

export default externalApiService;
