# OPIC — Open Integrated Cosmos (Cosmos Integrado Abierto)

<div align="center">
  <img src="../public/LOGO/logolwBG.svg" alt="OPIC Logo" width="300">
</div>

**Un sistema de visualización del universo a múltiples escalas e integración de datos astronómicos basado en Web**

[English](../README_EN.md) | [中文](../README.md) | [日本語](./README_JA.md) | [한국어](./README_KO.md) | [Français](./README_FR.md) | [Deutsch](./README_DE.md) | [Русский](./README_RU.md)

---

## Introducción al Proyecto

OPIC es una aplicación interactiva de visualización del universo construida con Three.js, Cesium y Next.js. A través de datos astronómicos reales y cálculos orbitales precisos, presenta una simulación dinámica desde la superficie de la Tierra hasta el borde del universo observable.

El proyecto está evolucionando hacia una arquitectura de plugins modular (MOD Manager), que permite cargar, configurar y cambiar funciones de forma independiente en tiempo de ejecución, sin necesidad de reiniciar la aplicación.

### Demostración

<div align="center">
  <img src="./images/earth-to-universe-zoom.gif" alt="Demostración de zoom desde la Tierra al universo" width="300">
  <p><em>Experiencia de zoom sin interrupciones desde edificios en la superficie terrestre hasta el panorama del universo</em></p>
</div>

## Características Principales

### Visualización de la Tierra (Integración con Cesium)

- Tierra de alta precisión con teselas: renderizado global de terreno e imágenes basado en Cesium
- Cambio de mapas de múltiples fuentes: soporte para Bing Maps, OpenStreetMap, ArcGIS, Tianditu y otras fuentes de imágenes
- Datos reales de elevación del terreno terrestre
- Adaptación automática según distancia: teselas de Cesium en distancias cercanas, cambio a esfera Three.js en distancias lejanas, transición suave
- Sincronización en tiempo real del estado de la cámara entre Three.js y Cesium

### Simulación del Sistema Solar

- Sistema de efemérides de alta precisión: basado en datos de efemérides NASA JPL DE440
- 27 cuerpos celestes: cálculo preciso de posiciones de 8 planetas principales + 19 satélites principales
- Control de tiempo: rango de tiempo de alta precisión 2009-2109, soporte para avance rápido y retroceso
- Fuente de datos dinámica: cambio automático entre efemérides de alta precisión ↔ modelo analítico

### Seguimiento de Satélites Artificiales

- Seguimiento en tiempo real: basado en datos TLE de CelesTrak y modelo orbital SGP4
- Búsqueda de satélites: explorar y buscar satélites artificiales en órbita
- Visualización de órbitas: mostrar trayectorias orbitales y movimiento de satélites
- Información detallada: ver parámetros de satélites, elementos orbitales y estado

<div align="center">
  <img src="./images/satellite-tracking-demo.gif" alt="Demostración de seguimiento de satélites" width="300">
  <p><em>Seguimiento de órbitas de satélites en tiempo real y visualización de información</em></p>
</div>

### Visualización del Universo a Múltiples Escalas

Explore 9 niveles de escala del universo mediante zoom:

| Escala | Rango de Distancia | Fuente de Datos |
|--------|-------------------|-----------------|
| Tierra | 0 - 100,000 km | Teselas Cesium |
| Sistema Solar | 0.1 - 100 AU | NASA JPL DE440 |
| Estrellas Cercanas | 0 - 100 años luz | ESA Gaia DR3 |
| Vía Láctea | 100 - 50,000 años luz | ESA Gaia |
| Grupo Local | 50k - 1M años luz | McConnachie 2012 |
| Grupos de Galaxias Cercanas | 1M - 10M años luz | Karachentsev 2013 |
| Supercúmulo de Virgo | 10M - 50M años luz | 2MRS Survey |
| Supercúmulo Laniakea | 50M - 500M años luz | Cosmicflows-3 |
| Universo Observable | 500M+ años luz | Estructura de Red Cósmica |

### Sistema MOD Manager (En Desarrollo)

Arquitectura de plugins modular que mantiene el sistema central ligero mientras permite cargar funciones opcionales dinámicamente en tiempo de ejecución:

- Manifiesto MOD declarativo con soporte de versionado semántico
- Gestión completa del ciclo de vida: registered → loaded → enabled → disabled → unloaded
- Resolución automática de dependencias con detección de dependencias circulares
- Capa API versionada: Time, Camera, Celestial, Satellite, Render API
- Aislamiento de errores: fallos de MOD no afectan al sistema central
- Persistencia de configuración entre sesiones

<div align="center">
  <img src="./images/mod-manager-interface.gif" alt="Interfaz del MOD Manager" width="300">
  <p><em>Interfaz del MOD Manager y demostración de mods de ejemplo</em></p>
</div>

### Características Visuales

- Texturas planetarias de alta calidad (Solar System Scope)
- Renderizado de estrellas basado en datos ESA Gaia
- Cámara interactiva: rotación libre, zoom y enfoque en cuerpos celestes
- Transiciones visuales sin interrupciones entre escalas
- 4 niveles de detalle, ajuste dinámico según distancia

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Framework Frontend | Next.js 16 / React 19 |
| Renderizado 3D | Three.js 0.170 + Cesium 1.139 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| Gestión de Estado | Zustand 5 |
| Cálculo Orbital | satellite.js (SGP4) |
| Compresión de Datos | pako (gzip) |
| Testing | Jest + fast-check |

## Inicio Rápido

### Requisitos del Entorno

- Node.js 20+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Visite `http://localhost:3000` para ver la aplicación.

### Construir Versión de Producción

```bash
npm run build
npm start
```

## Guía de Operación

| Operación | Función |
|-----------|---------|
| Arrastrar ratón | Rotar vista |
| Rueda del ratón | Zoom (explorar diferentes escalas del universo) |
| Clic en planeta/satélite | Enfocar objetivo |
| Control de tiempo | Ajustar velocidad de simulación y fecha |
| Cambio de mapa | Cambiar diferentes fuentes de imágenes en vista de la Tierra |
| Bloqueo de Tierra | Bloquear cámara al centro de la Tierra |

## Fuentes de Datos

### Datos de Efemérides

| Cuerpo Celeste | Fuente de Datos | Rango de Tiempo | Precisión |
|----------------|-----------------|-----------------|-----------|
| Tierra, Marte, Luna | NASA JPL DE440 | 2009-2109 | <0.1° |
| Otros Planetas | NASA JPL DE440 | 2009-2039 | <0.1° |
| Satélites de Júpiter | NASA JPL JUP365 | 2009-2039 | <0.01° |
| Satélites de Saturno | NASA JPL SAT441 | 2009-2039 | <0.01° |
| Satélites de Neptuno | NASA JPL NEP097 | 2009-2039 | <0.01° |

### Datos del Universo

- Datos de estrellas: ESA Gaia Mission (DR3)
- Grupo Local: McConnachie (2012) Local Group Catalog
- Grupos de galaxias cercanas: Karachentsev et al. (2013)
- Supercúmulo de Virgo: 2MRS Survey Data
- Supercúmulo Laniakea: Cosmicflows-3 Dataset

### Datos de Satélites

- Datos orbitales TLE: CelesTrak (NORAD)
- Metadatos de satélites: UCS (Union of Concerned Scientists) Base de datos de satélites

### Recursos Visuales

- Texturas planetarias: Solar System Scope
- Imágenes de la Vía Láctea: ESA/Gaia

## Estructura del Proyecto

```
opic/
├── src/
│   ├── app/                    # Rutas de aplicación Next.js
│   ├── components/             # Componentes React
│   │   ├── canvas/            # Componentes de canvas 3D
│   │   ├── cesium/            # Componentes relacionados con Cesium
│   │   ├── satellite/         # UI de seguimiento de satélites
│   │   ├── mod-manager/       # UI del MOD Manager (en desarrollo)
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Renderizador Three.js
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Integración con Cesium
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # Cálculos astronómicos
│   │   ├── satellite/         # Seguimiento de satélites (SGP4)
│   │   ├── mod-manager/       # Núcleo del MOD Manager (en desarrollo)
│   │   │   ├── core/          # Registro, ciclo de vida, resolución de dependencias
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # Persistencia de configuración
│   │   │   ├── error/         # Manejo y aislamiento de errores
│   │   │   └── performance/   # Monitoreo de rendimiento
│   │   ├── config/            # Archivos de configuración
│   │   ├── data/              # Cargadores de datos
│   │   ├── state/             # Gestión de estado Zustand
│   │   ├── store/             # Hooks de Zustand store
│   │   └── types/             # Tipos TypeScript
├── public/
│   ├── data/                  # Datos astronómicos
│   │   ├── ephemeris/        # Datos de efemérides NASA JPL
│   │   ├── gaia/             # Datos de estrellas Gaia
│   │   └── universe/         # Datos de estructura del universo
│   ├── textures/              # Recursos de texturas
│   └── cesium/                # Recursos estáticos de Cesium
├── scripts/                   # Scripts de generación de datos
└── docs/                      # Documentación del proyecto
```

## Desarrollo

```bash
# Ejecutar pruebas
npm test

# Verificación de código
npm run lint
npm run lint:fix

# Verificación de tipos
npm run quality:check

# Cobertura de pruebas
npm run test:coverage
```

## Optimización de Rendimiento

- 4 niveles de detalle, ajuste dinámico según distancia
- Carga bajo demanda de teselas de la Tierra, eliminación automática de teselas a larga distancia
- Teselas Cesium en distancias cercanas, esfera Three.js en distancias lejanas
- Sistema de partículas con shaders personalizados, soporte para millones de partículas
- Renderizado instanciado para reducir llamadas de dibujo
- Culling de frustum, solo renderizar objetos visibles
- Liberación automática de recursos a larga distancia
- Web Workers para procesamiento de datos no bloqueante

## Descargo de Responsabilidad

Esta aplicación es solo para fines educativos y de entretenimiento.

**Nota sobre la precisión de datos astronómicos:**

Dentro del rango de tiempo de alta precisión (2009-2109 para Tierra/Marte/Luna, 2009-2039 para otros cuerpos celestes), se utilizan datos de efemérides NASA JPL con precisión de arcosegundos. Fuera de este rango, el sistema cambia automáticamente a modelos analíticos con precisión reducida.

Para datos astronómicos precisos para investigación científica o navegación, consulte el sistema NASA JPL HORIZONS u otras instituciones astronómicas profesionales oficiales.

**Nota sobre datos orbitales de satélites:**

Los datos orbitales de satélites artificiales se basan en TLE (Two-Line Element) y el modelo SGP4, con precisión afectada por factores como resistencia atmosférica y presión de radiación solar, solo para referencia.

**Declaración de responsabilidad:**

Este software se proporciona "tal cual", sin garantías expresas o implícitas. En ningún caso los autores o titulares de derechos de autor serán responsables de ninguna reclamación, daño u otra responsabilidad.

Este software no es adecuado para entornos que requieren rendimiento a prueba de fallos. El usuario entiende y acepta expresamente que el autor no será responsable de ninguna pérdida o daño causado por el uso de este software en actividades de alto riesgo.

## Guía de Contribución

¡Todas las formas de contribución son bienvenidas! Damos la bienvenida a la colaboración de desarrolladores humanos y asistentes de IA.

- Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para saber cómo participar
- Envíe Issues para reportar bugs o sugerir nuevas funciones
- Envíe Pull Requests para contribuir código
- **Contribuciones de IA bienvenidas**: Fomentamos contribuciones asistidas por herramientas y agentes de IA

## Licencia

Este proyecto está licenciado bajo Apache License 2.0.

Características principales:
- Permite uso comercial, modificación y distribución
- Requiere mantener avisos de derechos de autor y licencia
- Proporciona concesión explícita de patentes
- Incluye descargo de responsabilidad y limitación de responsabilidad

Consulte el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **Dirección del Proyecto**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **Sitio Web**: [https://opic.cxin.tech](https://opic.cxin.tech)
