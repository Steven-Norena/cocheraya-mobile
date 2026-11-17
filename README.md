# 📱 CocheraYa — Aplicación Móvil (React Native + Expo + TypeScript)

---

## 📑 Portada del Proyecto

* **Proyecto:** CocheraYa — Cliente Móvil Nativo
* **Curso:** CS 2031 Desarrollo Basado en Plataformas
* **Periodo:** 2026-2
* **Institución:** Universidad de Ingeniería y Tecnología (UTEC) — Lima, Perú
* **Enlace de Publicación (Expo Go / EAS):** Disponible para escaneo QR mediante Expo Go
* **Repositorio Frontend Web:** [cocheraya-frontend](https://github.com/Steven-Norena/cocheraya-frontend)
* **Repositorio Backend:** [cocheraya-backend](https://github.com/ChrisMar0512/cocheraya-backend)

---

## 👥 Tabla de Participación de los Integrantes (Rúbrica de Evaluación)

En cumplimiento con el criterio de evaluación de la segunda entrega del curso, a continuación se presenta la tabla de participación individual de cada integrante del equipo:

| Integrante | Código UTEC | Correo Institucional | Principales Aportes | Participación (%) |
| :--- | :--- | :--- | :--- | :---: |
| **Christian Mar Carrillo** | 202410512 | christian.mar@utec.edu.pe | Arquitectura REST Backend con Spring Boot 3.2, geoespacial PostGIS, transaccionalidad pesimista, eventos asíncronos y aprovisionamiento Docker/Cloud. | **100 %** |
| **Steven Daniel Noreña Paredes** | 202510642 | steven.norena@utec.edu.pe | Desarrollo del cliente Web (React 18 + TS + Vite), integración con mapa interactivo Leaflet, breadcrumbs, lazy loading y diseño de interfaces UI/UX. | **100 %** |
| **Luciano Gabriel Rivera Valentin** | 202410149 | luciano.rivera@utec.edu.pe | Desarrollo de la aplicación móvil nativa (React Native + Expo), integración de sensores (GPS, Cámara para QR, galería), arquitectura modular y consumo de API. | **100 %** |
| **Anthony Yair Caypane Ramirez** | 202410690 | anthony.caypane@utec.edu.pe | Integración de endpoints de reservas y billetera auditada, manejo global de errores (Error Boundary), validaciones client-side y políticas CORS. | **100 %** |

---

## 🚀 Tecnologías Principales

- **React Native 0.81 & Expo SDK 54:** Framework principal para aplicaciones móviles nativas iOS y Android con rendimiento fluido.
- **Expo Router:** Enrutamiento nativo basado en archivos por grupo de rol (`(auth)`, `(driver)`, `(host)`).
- **Expo SecureStore:** Almacenamiento seguro en hardware encriptado para tokens JWT y datos de sesión (`Keychain` en iOS y `KeyStore` en Android).
- **Expo Location:** Acceso nativo al sensor GPS con manejo de permisos y coordenadas en tiempo real.
- **Expo Camera (`CameraView`):** Acceso a la cámara nativa para escaneo en vivo de códigos QR de check-in/out con vibración háptica.
- **Expo Image Picker:** Acceso a cámara y galería para captura de fotos de cocheras con fallback visual.
- **React Native Maps:** Integración nativa con Google Maps (Android) y Apple Maps (iOS).
- **Open-Meteo Weather API:** API externa de condiciones meteorológicas en tiempo real integrada en la selección de cocheras.
- **Axios con Interceptores:** Cliente HTTP desacoplado con resolución dinámica de IP, inyección de tokens y reintentos ante caídas transitorias de red.
- **Context API:** Manejo de sesión global (`AuthContext`) y sincronización reactiva de saldo de billetera.

---

## 🧱 Arquitectura y Separación de Responsabilidades (Rúbrica 2.2)

La arquitectura sigue una separación estricta en capas modulares:

```text
mobile-cocheraya/
├── app.json             # Manifiesto y configuración de Expo (identificadores y esquema CocheraYa)
├── assets/              # Recursos estáticos (iconos, splash, tipografías)
└── src/
    ├── app/             # Capa de UI y Navegación (Expo Router)
    │   ├── _layout.tsx    # Enrutador raíz con control de autenticación
    │   ├── index.tsx      # Redirección dinámica por rol (DRIVER / HOST)
    │   ├── (auth)/        # Vistas de autenticación (login, register)
    │   ├── (driver)/      # Vistas de conductor (mapa interactivo, reservas, billetera)
    │   ├── (host)/        # Vistas de anfitrión (dashboard, scan QR, cocheras, agregar, ganancias)
    │   └── chat/[id].tsx  # Mensajería bidireccional en tiempo real
    ├── components/      # Componentes presentacionales reutilizables (Button, Input, Card, Badge, Spinner)
    ├── constants/       # Paleta de colores, tipografías y tema visual
    ├── context/         # AuthContext para estado global de autenticación
    ├── hooks/           # Custom hooks (useForm con useReducer, useFetch)
    └── services/        # Capa de servicios e integración con el backend
        ├── api.ts              # Axios centralizado, reintentos e interceptores
        ├── secureStore.ts      # Encriptación de JWT en SecureStore nativo
        ├── externalApiService.ts # Consumo de Open-Meteo Weather API
        ├── authService.ts      # Login, registro y refresh token
        ├── parkingService.ts   # Cocheras, búsqueda espacial PostGIS y dashboard
        ├── reservationService.ts # Reservas, check-in, check-out y QR
        ├── reviewService.ts    # Calificaciones comunitarias
        └── walletService.ts    # Transacciones auditadas y recargas
```

---

## 🔌 Integración con el Backend y Seguridad (Rúbrica 2.1)

El consumo de servicios HTTP se gestiona a través de la capa de servicios centralizada en [api.ts](src/services/api.ts):

* **Consumo Exclusivo del Backend:** Toda la lógica de negocio (reservas, billetera, cocheras, estados) proviene de la API REST desarrollada en Spring Boot 3.2.
* **Resolución Dinámica de Host:** Detecta automáticamente la dirección IP local de la computadora mediante `Constants.expoConfig?.hostUri` para comunicarse fluidamente desde dispositivos móviles físicos vía Wi-Fi, o mediante `10.0.2.2` en emulador Android.
* **Persistencia Segura (JWT):** Los tokens se encriptan mediante **Expo SecureStore**, evitando almacenamiento inseguro en texto plano.
* **Interceptor de Peticiones:** Inyecta automáticamente el token JWT en las cabeceras `Authorization: Bearer <token>`.
* **Interceptor de Respuestas (Refresh Token):** Ante respuestas `401 Unauthorized`, solicita automáticamente un nuevo access token a `/api/v1/auth/refresh-token` y reintenta la solicitud fallida de manera transparente.
* **Métodos HTTP Completos:** Implementa `GET`, `POST`, `PUT`, `DELETE` y compatibilidad con `PATCH`.

---

## 📡 Sensores de Hardware y APIs Externas (Rúbrica 2.3)

La aplicación integra de forma óptima el hardware del teléfono móvil y APIs externas:

1. **Sensor GPS (`expo-location`):**
   * **Propósito:** Obtiene la posición física en tiempo real del conductor para buscar cocheras cercanas mediante `ST_DWithin` en PostGIS.
   * **Permisos y Fallback:** Solicita permisos en primer plano con mensajes amigables. Si el usuario rechaza los permisos, la aplicación activa un fallback automático centrando el mapa en Miraflores / San Isidro.

2. **Cámara Nativa y Escáner QR (`expo-camera` / `expo-image-picker`):**
   * **Propósito:** El `HOST` puede escanear en tiempo real el código QR del conductor mediante `CameraView` para procesar el Check-In o Check-Out físico. Cuenta con retroalimentación háptica (`Vibration.vibrate`) y fallback manual por teclado si la cámara no está disponible.
   * **Fotos de Cochera:** Al registrar una cochera, el anfitrión puede tomar una foto con la cámara o seleccionarla de la galería.

3. **APIs Externas Relevantes:**
   * **Mapas Nativos:** Apple Maps en iOS y Google Maps en Android para visualización satelital y navegación.
   * **Open-Meteo Weather API:** Consulta meteorológica en tiempo real (`externalApiService.ts`) mostrando el clima actual sobre la cochera seleccionada antes de reservar.

---

## ⚠️ Manejo de Errores y Experiencia de Carga (Rúbrica 2.4)

* **Try-Catch Exhaustivo:** Cada operación de red se encuentra resguardada para prevenir bloqueos o caídas inesperadas de la aplicación.
* **Mensajes Amigables:** Notificaciones claras al usuario en español en lugar de códigos técnicos crudos.
* **Retry Logic:** El interceptor de Axios reintenta automáticamente solicitudes fallidas ante errores temporales de red.
* **Estados de Carga Visuales:** Indicadores nativos `ActivityIndicator` y spinners en todas las acciones asíncronas.
* **Prevención de Doble Envío:** Deshabilitación de botones (`disabled={isSubmitting}`) durante recargas y confirmaciones de reserva.

---

## 🛠️ Instalación y Uso Local

```bash
# 1. Clonar repositorio
git clone https://github.com/Steven-Norena/cocheraya-mobile.git
cd cocheraya-mobile

# 2. Instalar dependencias
npm install

# 3. Iniciar entorno de desarrollo Expo
npx expo start
```

* Presione **`a`** para abrir el emulador de Android.
* Presione **`i`** para abrir el simulador de iOS.
* Presione **`w`** para previsualizar en navegador Web.
* O escanee el código QR desde la aplicación **Expo Go** en su smartphone físico (asegúrese de que el teléfono y la computadora compartan la misma red Wi-Fi).
