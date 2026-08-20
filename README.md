# Nitro React (Habbten Client)

Cliente web moderno para Habbten basado en React, TypeScript y Nitro Renderer.

---

## 🛠️ Guía de Personalización: Vistas, Diseños, Textos y Páginas

Esta sección documenta dónde y cómo modificar cada capa del cliente de juego.

### 1. Vistas y Componentes del Juego (React / TypeScript)
Todas las interfaces del cliente están estructuradas como componentes de React en `src/components/`:
- **Catálogo:** `src/components/catalog/`
- **Inventario:** `src/components/inventory/`
- **Navegador de Salas:** `src/components/navigator/`
- **Perfil de Usuario:** `src/components/user-profile/`
- **Logros y Placas:** `src/components/achievements/`
- **Centro HC (Habbten Club):** `src/components/hc-center/`
- **Infostand (Widgets de sala/furnis):** `src/components/room/widgets/avatar-info/`
- **Chat y Consola:** `src/components/chat/`, `src/components/friends/`
- **Herramientas de Moderación:** `src/components/mod-tools/`

Cada componente cuenta con su archivo de estilos SCSS asociado o estilos globales en `src/assets/styles/`.

---

### 2. Textos, Traducciones y Mensajes del Juego (Gamedata)
Los textos del juego se cargan a través del endpoint dinámico del CMS que fusiona los diccionarios estáticos con las anulaciones en base de datos:
- **Diccionarios Estáticos:**
  - `nitro/nitro-assets/gamedata/UITexts.json`: Textos de interfaz, botones, descripciones de logros y recompensas.
  - `nitro/nitro-assets/gamedata/ExternalTexts.json`: Textos generales de la flash interface original de Habbo.
- **Anulaciones desde Base de Datos (Housekeeping):**
  - Tabla `cms_external_texts` en MySQL o desde el panel de Housekeeping en la sección *"Textos y traducciones"*.
- **Endpoint del CMS:**
  - `http://127.0.0.1:8083/game/api/external_texts.json`

---

### 3. Nombres, Descripciones y Propiedades de Furnis
- **Definición de Furnis:** `nitro/nitro-assets/gamedata/FurnitureData.json`
- Contiene los nombres, descripciones y tipos de interacción de todos los ítems de sala (`roomitemtypes`) y pared (`wallitemtypes`).

---

### 4. Páginas de Ayuda y Terminales de Información (Nitropedia / HabbtenPages)
Las páginas internas que se abren mediante `habbtenpages/[ruta]` (o enlaces como `habbopages/[ruta]`, por ejemplo en la Terminal de Información o los botones del Centro HC) se procesan en el backend del CMS:
- **Archivo de Rutas:** `cms/src/index.js` bajo el endpoint `/habbtenpages/*` y `/habbopages/*`.
- **Formato Oficial de Nitropedia:**
  ```text
  Título de la Ventana|ancho;alto
  <HTML con contenido y estilos limpios>
  ```
  *Nota:* No incluir `<!DOCTYPE html>`, `<html>` o etiquetas `<style>` globales con selectores como `table` o `body`, ya que Nitropedia inyecta el contenido directamente en el DOM de React.

---

## 🚀 Entorno de Desarrollo y Construcción

### Desarrollo (Dev Container / Docker)
Ejecutar dentro del contenedor de Nitro:
```bash
docker exec -it habbten-nitro yarn start
```

### Producción
Para compilar la versión optimizada de producción:
```bash
docker exec -it habbten-nitro yarn build:prod
```
Los archivos generados se ubicarán en `dist/`.
