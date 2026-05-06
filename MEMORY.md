# GenioFacultad - Memoria del Proyecto

## Estado Actual del Proyecto

**Última actualización:** Mayo 2026
**Estado:** FUNCIONAL - En desarrollo

### Estado Ejecutivo
- Proyecto Next.js 16 (React 19) funcionando en modo dev
- UI dark mode con glassmorphism implementada
- IA integrada con OpenRouter (Qwen 2.5 VL)
- Persistencia local con localStorage activa
- Build local tiene problemas de compatibilidad con swc en Windows (usar --webpack)

---

## Arquitectura y Decisiones Tomadas

### Stack Tecnológico
- **Framework:** Next.js 16.2.4 (App Router)
- **UI:** TailwindCSS 4 con custom CSS variables
- **IA:** OpenRouter API (modelo: qwen/qwen2.5-vl-72b-instruct:free)
- **Persistencia:** localStorage (clave: `genio-facultad-data`)
- **Estilos:** Dark mode por defecto, gradientes, glassmorphism

### Estructura de Archivos
```
proyecto-facultad/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Componente principal (todo en uno)
│   │   ├── layout.tsx      # Metadata y layout base
│   │   └── globals.css     # Estilos globales + variables
│   ├── lib/
│   │   ├── ai.ts           # Funciones de IA (análisis, chat, exámenes)
│   │   ├── storage.ts      # Persistencia localStorage
│   │   ├── openrouter.ts  # (sin usar, redundant)
│   │   └── supabase.ts     # (sin usar, placeholder)
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── .env.local              # Variables de entorno
├── package.json
├── next.config.ts
└── tsconfig.json
```

### Decisiones de Diseño
1. **Todo en page.tsx** - Single-page app con estado mode (home/upload/study/chat/exam)
2. **localStorage** - Sin backend, datos persistidos en navegador
3. **Spaced Repetition** - Algoritmo SM-2 para flashcards
4. **Dark theme** - Fondo oscuro con gradiente azul/morado

---

## Tareas Completadas

### Fase 1: Setup y Estructura
- [x] Inicializar proyecto Next.js
- [x] Configurar TailwindCSS 4
- [x] Crear tipos TypeScript
- [x] Implementar globals.css con variables dark mode

### Fase 2: Core Features
- [x] Upload de archivos (PDF, imágenes, texto)
- [x] Análisis de documentos con IA (resumen, puntos clave, flashcards, quizzes)
- [x] Sistema de estudio (resumen, flashcards, quiz)
- [x] Chat persistente con IA
- [x] Simulación de exámenes con corrección automática
- [x] Sistema de spaced repetition para flashcards

### Fase 3: Persistencia
- [x] Guardar sesiones en localStorage
- [x] Cargar estado al iniciar
- [x] Eliminar sesiones

### Fase 4: known Issues
- [x] Build local con error swc en Windows → usar `npm run build -- --webpack`
- [x] Dev server funciona correctamente

---

## Tareas Pendientes

### Alta Prioridad
1. **Deploy a Vercel** - Crear repo GitHub y hacer deploy
2. **GitHub Repository** - Necesita token del usuario para crear repo automáticamente

### Media Prioridad
1. **Mejora UI** - Animaciones más suaves, loader mejorado
2. **Errores mejorados** - Mejor manejo de errores de API
3. **Gemini como alternativa** - Implementar fallback a Gemini si OpenRouter falla

### Baja Prioridad
1. **Supabase** - Integrar si se quiere persistencia en la nube
2. **Estadísticas** - Dashboard de progreso más elaborado

---

## Instrucciones para Futuras Sesiones

### Antes de hacer cualquier cosa:
1. **LEER ESTE ARCHIVO** - MEMORY.md debe ser lo primero
2. Verificar estado actual del proyecto
3. Revisar AGENTS.md para reglas del proyecto

### Para ejecutar el proyecto:
```bash
cd proyecto-facultad
npm install  # si hay problemas de dependencias
npm run dev  # o npx next dev --webpack
```

### Para build (si hay problemas de swc):
```bash
npm run build -- --webpack
```

### Para conectar a GitHub:
- Necesita token de GitHub del usuario para crear repo automáticamente
- Alternativa: crear repo manualmente en GitHub y conectar

### Notas importantes:
- La API key de OpenRouter está en .env.local
- El modelo actual es gratuito (qwen/qwen2.5-vl-72b-instruct:free)
- Todo el estado se guarda en localStorage - no hay backend

---

## Estado del Git

```
On branch main
Cambios pendientes en proyecto-facultad/src/
Archivos no rastreados: proyecto-facultad/
```

El código NO ha sido hecho commit ni pusheado a GitHub aún.