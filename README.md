# Eslovenia 2026 — app de itinerario

App web (Next.js) con tu itinerario de Eslovenia. Guardado local en el navegador
(localStorage), mapa real por día (Leaflet + OpenStreetMap) con ruta calculada
entre paradas (OSRM), fotos desde tu dispositivo y días/actividades editables.

## Abrir en VSCode

1. Descomprime la carpeta del proyecto.
2. Ábrela en VSCode: `code slovenia-trip-app`
3. Instala dependencias (necesitas Node.js 18+): 
   ```
   npm install
   ```
4. Arranca el servidor de desarrollo:
   ```
   npm run dev
   ```
5. Abre http://localhost:3000

## Desplegar en Vercel

**Opción rápida (sin GitHub):**
```
npm install -g vercel
vercel
```
Sigue las preguntas en pantalla (usa la cuenta gratuita de Vercel). Al terminar
te da una URL pública tipo `https://tu-proyecto.vercel.app`.

**Opción recomendada (con GitHub, para poder seguir editando y que se
redespliegue solo):**
1. Crea un repositorio nuevo en GitHub y sube este proyecto:
   ```
   git init
   git add .
   git commit -m "Primera versión de la app de Eslovenia"
   git branch -M main
   git remote add origin TU_URL_DE_GITHUB
   git push -u origin main
   ```
2. Entra a https://vercel.com → "Add New Project" → importa el repositorio.
3. Vercel detecta que es Next.js automáticamente. Dale a "Deploy".
4. Cada vez que hagas `git push`, Vercel actualiza la app sola.

## Cómo funciona el guardado

Ahora la app usa **Firebase** (Firestore + Storage) para guardar los datos y
sincronizarlos entre dispositivos en tiempo real. Si no configuras Firebase,
la app sigue funcionando igual pero guarda todo solo en el `localStorage` del
navegador (como antes), sin sincronizar.

### Configurar Firebase (5-10 minutos)

1. Ve a https://console.firebase.google.com → "Agregar proyecto" (es gratis).
2. Dentro del proyecto, activa dos productos:
   - **Firestore Database** → "Crear base de datos" → modo de producción o de
     prueba (más abajo tienes las reglas que necesitas de todos modos).
   - **Storage** → "Comenzar" (para guardar las fotos).
3. Ve a ⚙️ (Configuración del proyecto) → pestaña "Tus apps" → añade una app
   web (icono `</>`). Te dará un objeto `firebaseConfig` con varias claves.
4. Copia `.env.local.example` como `.env.local` y pega ahí esos valores:
   ```
   cp .env.local.example .env.local
   ```
5. En Firestore, pestaña "Reglas", pega:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /trips/{tripId} {
         allow read, write: if true;
       }
     }
   }
   ```
6. En Storage, pestaña "Reglas", pega:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /activities/{fileName} {
         allow read, write: if true;
       }
     }
   }
   ```
7. Reinicia `npm run dev` (o vuelve a desplegar en Vercel, añadiendo las mismas
   variables en Project Settings → Environment Variables).

**⚠️ Nota de seguridad, léela antes de compartir el link con nadie:** estas
reglas (`allow read, write: if true`) dejan que *cualquiera* que tenga la URL
de tu app pueda leer y modificar tu itinerario — no hay usuario ni contraseña.
La `apiKey` de Firebase no es secreta (siempre queda visible en el código del
navegador), así que la seguridad depende 100% de estas reglas, no de ocultar
la clave. Para un itinerario de viaje personal (sin datos sensibles) esto es
un riesgo bajo, pero si te preocupa, el siguiente paso natural sería añadir
un login sencillo (por ejemplo, Firebase Authentication con email/contraseña
o un simple código de acceso) y restringir las reglas a ese usuario. Dímelo
cuando quieras y lo añadimos.

### Variables de entorno en Vercel

Al desplegar, añade las mismas 6 variables de `.env.local` en:
Project Settings → Environment Variables (en Vercel), para los entornos de
Production y Preview.


## Sobre el mapa y las rutas

- El mapa usa mosaicos gratuitos de OpenStreetMap (sin necesidad de API key).
- Las rutas entre paradas se calculan con el servidor de demostración pública
  de OSRM (`router.project-osrm.org`). Es gratuito pero tiene límites de uso;
  para una app con más tráfico, lo ideal sería alojar tu propio OSRM o usar un
  servicio de pago (Mapbox, Google Directions).
- La búsqueda de lugares al añadir una actividad usa Nominatim (geocoding de
  OpenStreetMap), también gratuito y con límites de uso razonables para uso
  personal.

## Estructura del proyecto

```
app/
  layout.js       → layout raíz
  page.js         → pantalla principal (toda la app vive aquí)
  globals.css     → Tailwind + estilos del "ticket" perforado
components/
  ActivityTicket.js        → tarjeta de cada actividad
  ActivityDetailSheet.js   → panel de detalle (notas + foto)
  AddActivitySheet.js      → panel para añadir actividad (con buscador de lugar)
  DayMap.js                → mapa real por día (Leaflet + OSRM)
lib/
  tripData.js       → itinerario inicial (editable)
  useTripStore.js   → estado global + sincronización con Firestore (o localStorage)
  firebase.js       → inicialización de Firebase (Firestore + Storage)
  uploadImage.js    → sube fotos a Firebase Storage
  compressImage.js  → comprime fotos antes de subirlas/guardarlas
```
