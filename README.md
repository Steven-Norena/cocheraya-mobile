# 📱 CocheraYa — Aplicación Móvil (React Native + Expo + TypeScript)

## 📑 Portada
* **Proyecto:** CocheraYa — Cliente Móvil Nativo
* **Curso:** CS 2031 Desarrollo Basado en Plataforma
* **Institución:** Universidad de Ingeniería y Tecnología (UTEC) — Lima, Perú
* **Enlace de Publicación (Expo Go):** [Escanea el QR en Expo (EAS Update)]()

---

## 🚀 Tecnologías Principales

- **React Native & Expo:** Plataforma de desarrollo híbrido nativo para dispositivos Android y iOS.
- **Expo Router:** Enrutamiento nativo basado en archivos, brindando transiciones fluidas de pantalla.
- **Expo SecureStore:** Almacenamiento seguro en hardware encriptado de claves y tokens JWT.
- **Expo Location:** Acceso nativo al sensor GPS del dispositivo.
- **Expo Image Picker & Camera:** Acceso a la cámara nativa y galería de fotos.
- **React Native Maps:** Integración nativa con Apple Maps y Google Maps.
- **Axios:** Cliente HTTP para comunicación y sincronización transaccional con el backend.
- **Context API:** Manejo centralizado de sesión y autenticación persistente.

---

## 🧩 Arquitectura Móvil y Estructura

La aplicación móvil está estructurada siguiendo el patrón de diseño de separación de responsabilidades:

```text
mobile-parkshare/
├── assets/         # Recursos del sistema (iconos, splash screens, tipografías)
└── src/
    ├── app/        # Estructura de vistas nativas (Expo Router)
    │   ├── (auth)/   # Registro e Inicio de sesión
    │   ├── (driver)/ # Vistas exclusivas del conductor (Billetera nativa, Historial)
    │   └── (host)/   # Vistas exclusivas del anfitrión (Dashboard, Publicar cochera, Ganancias)
    ├── components/ # Componentes de interfaz de usuario reutilizables (inputs, botones, modales)
    ├── context/    # Manejo del estado global (`AuthContext`)
    └── services/   # Capa de consumo de API REST
        ├── api.ts          # Cliente Axios centralizado e interceptores
        ├── secureStore.ts  # Adaptador seguro para Expo SecureStore
        └── ...             # Servicios de negocio (reservas, billetera, espacios)
```

---

## 🔌 Integración con el Backend y Seguridad (Rubric 2.1)

El consumo de servicios HTTP se gestiona exclusivamente a través de un cliente centralizado de **Axios** en [api.ts](file:///c:/DBP/proyecto-1-parkshare/mobile-parkshare/src/services/api.ts):

* **Configuración Dinámica de Host:** Determina automáticamente la dirección IP local de desarrollo mediante `Constants.expoConfig?.hostUri` para enlazar el emulador Android, simulador iOS o dispositivo físico de manera transparente.
* **Persistencia Segura (JWT):** Los tokens de autenticación JWT se guardan en el dispositivo utilizando la biblioteca nativa **Expo SecureStore** en lugar de almacenamiento persistente no seguro (evitando fugas en texto plano).
* **Interceptor de Peticiones:** Captura de forma asíncrona el JWT de `SecureStore` y lo inyecta como cabecera `Authorization: Bearer` en cada llamada.
* **Interceptor de Respuestas (Refresh Token):** Ante un error de sesión expirada (`401 Unauthorized`), el interceptor solicita un nuevo token a través de `/auth/refresh-token` en segundo plano utilizando el token de refresco, lo actualiza de forma transparente en `SecureStore` y repite la petición original sin interrumpir el flujo del usuario.

---

## 📡 Sensores de Hardware y APIs Externas (Rubric 2.3)

La aplicación móvil aprovecha las API y el hardware nativo de los dispositivos móviles para enriquecer la experiencia de usuario:

1. **Cámara Nativa y Fotos (`expo-image-picker` / `expo-camera`):**
   * **Propósito:** El anfitrión (`HOST`) puede capturar fotos de las cocheras al subirlas al sistema.
   * **Gestión de Permisos:** Se solicitan los permisos nativos del sistema operativo de forma explícita al usuario, mostrando explicaciones claras de por qué se necesita la cámara.
   * **Fallback:** Si el usuario deniega el permiso de la cámara, la aplicación activa un fallback automático que le permite seleccionar un archivo de imagen existente desde su galería de fotos local.

2. **Sensor GPS y Geolocalización (`expo-location`):**
   * **Propósito:** Permite ubicar la posición física en tiempo real del conductor para buscar cocheras cercanas en un radio espacial definido.
   * **Gestión de Permisos:** Solicita permisos de ubicación fina (`Location.requestForegroundPermissionsAsync`).
   * **Fallback:** Si el usuario no otorga el permiso del GPS, el sistema muestra un mensaje de advertencia y centra el mapa de manera predeterminada en coordenadas céntricas preestablecidas (ej. San Isidro / Miraflores), permitiendo realizar la búsqueda geoespacial de forma manual.

3. **Mapas Interactivos (`react-native-maps`):**
   * **Propósito:** Integrar el mapa nativo (Google Maps en Android y Apple Maps en iOS) para marcar visualmente la posición del conductor y la ubicación exacta de las cocheras disponibles, permitiendo al usuario interactuar y seleccionar marcadores directamente en la pantalla.

---

## ⚠️ Manejo de Errores y Experiencia de Carga (Rubric 2.4)

* **Robustez en Llamadas API:** Todas las interacciones con el backend están resguardadas en bloques `try-catch`, previniendo detenciones abruptas de la interfaz (crashes).
* **Mensajes de Usuario Amigables:** Muestra alertas emergentes nativas explicando el problema (ej: *"Saldo insuficiente para realizar el Check-out"*, *"Verifique su conexión a Internet"*).
* **Estados de Carga Visuales:** Implementación de spinners (`ActivityIndicator`) y skeletons personalizados en pantallas de carga de reservas e historial para evitar que el usuario interactúe con elementos vacíos.
* **Prevención de Solicitudes Duplicadas:** Deshabilitación de botones al procesar recargas financieras u operaciones críticas para evitar el doble envío.
* **Clipboard API (`expo-clipboard`):** Permite copiar directamente al portapapeles el UUID simulado de las reservas en la pantalla móvil con un botón interactivo de éxito visual (feedback rápido).

---

## 🛠️ Instalación y Uso Local

1. **Instalar Dependencias:**
   ```bash
   npm install
   ```

2. **Configurar el Endpoint:**
   La aplicación utiliza `expo-constants` para enlazar la dirección IP local de tu computador de forma dinámica. Si ejecutas en un entorno de red específico, verifica que tu dispositivo móvil y computador estén conectados a la misma red Wi-Fi.

3. **Iniciar Servidor de Desarrollo:**
   ```bash
   npx expo start
   ```

4. **Ejecución en Dispositivo / Emulador:**
   - Presione `a` para emulador de Android.
   - Presione `i` para simulador de iOS.
   - Escanee el código QR que se muestra en la consola utilizando la aplicación **Expo Go** en su celular.

---

## 🗺️ Guía Técnica de Pruebas Móviles (Flujo Completo)

Realice los siguientes pasos para certificar que el flujo integrado de extremo a extremo funcione correctamente desde el teléfono móvil:

1. **Autenticación:**
   * Inicie sesión en la app con un usuario previamente registrado. Valide que la redirección a las vistas nativas se ejecuta inmediatamente según el rol del perfil.
2. **Publicar Espacio con Foto de Cámara (Rol HOST):**
   * Logueado como `HOST`, navegue a "Agregar Cochera".
   * Presione "Subir Imagen", permita el acceso de permisos nativos del sistema y capture una foto de prueba. Rellene el formulario de ubicación. Guarde el registro.
3. **Flujo de Reserva en Tiempo Real (Rol DRIVER):**
   * Acceda como `DRIVER` a la aplicación.
   * Navegue en la vista de mapa, valide que visualiza su posición GPS actual (gracias a `expo-location`) y que puede observar en el mapa el marcador de la cochera registrada.
   * Realice la reserva del espacio. El mapa actualizará visualmente el estado.
4. **Validación Transaccional y Auditoría (Check-In / Out):**
   * En la pestaña de reservas de conductor, pulse el botón para copiar el UUID de la reserva.
   * Simule la entrada y salida de la cochera.
   * Valide que en el panel de Ganancias del `HOST` en la app móvil se muestra de forma desglosada y auditada: duración, ID de reserva, montos y horas exactas asociadas a la transacción.
