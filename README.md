# GenioFacultad 🧠

Tu asistente de estudio con IA para convertirte en un genio de la facultad.

## Características

- 📄 **Upload inteligente** - Sube PDFs, imágenes o documentos de texto
- 🧠 **Análisis con IA** - Resúmenes, puntos clave, flashcards automáticas
- 🎴 **Spaced Repetition** - Sistema de memorización efectivo
- 💬 **Chat con Tutor IA** - Pregunta lo que quieras sobre el material
- 📝 **Quiz interactivo** - Practica con preguntas generadas automáticamente
- 🎯 **Simular Examen** - Exámenes con corrección automática y nota del 1 al 10

## Tecnologías

- Next.js 16 (App Router)
- React 19 + TypeScript
- TailwindCSS 4
- OpenRouter API (Qwen 2.5 VL - gratuito)
- localStorage para persistencia

## Instrucciones de Desarrollo

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/sant1200/proyecto-facultad.git
cd proyecto-facultad

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

### Configurar API Key

Crea un archivo `.env.local` en la raíz del proyecto:

```env
OPENROUTER_API_KEY=tu-api-key-aqui
```

Obtén tu API key gratuita en: https://openrouter.ai/settings/keys

### Build para producción

```bash
npm run build
# Si hay errores de swc en Windows:
npm run build -- --webpack
```

## Deploy en Vercel (1 clic)

1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Importa el repositorio `sant1200/proyecto-facultad`
4. Añade las variables de entorno:
   - `OPENROUTER_API_KEY` (tu API key)
5. Deploy automático!

## Uso

1. **Sube un archivo** (PDF, imagen, txt)
2. La IA analiza y genera contenido de estudio
3. Estudia con resumen, flashcards o quiz
4. Chatea con el tutor IA para dudas
5. Simula exámenes para practicar

## Estructura del Proyecto

```
proyecto-facultad/
├── src/
│   ├── app/
│   │   ├── page.tsx       # App principal
│   │   ├── layout.tsx     # Layout
│   │   └── globals.css    # Estilos
│   ├── lib/
│   │   ├── ai.ts          # Funciones de IA
│   │   └── storage.ts     # Persistencia
│   └── types/
│       └── index.ts       # Tipos TypeScript
├── .env.local             # Variables de entorno
└── package.json
```

## License

MIT