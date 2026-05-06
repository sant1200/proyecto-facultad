# Reglas del Proyecto - GenioFacultad

## Objetivo del Proyecto

Crear una aplicación web de estudio inteligente con IA que:
- Analiza documentos (PDF, imágenes, texto) automáticamente
- Genera resúmenes, flashcards, quizzes
- Proporciona chat persistente con tutor IA
- Simula exámenes con corrección automática
- Usa spaced repetition para memorización efectiva

## stack Tecnológico

| Categoría | Tecnología |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TailwindCSS 4 |
| Lenguaje | TypeScript |
| Estilos | CSS con variables + Tailwind |
| IA | OpenRouter API (Qwen 2.5 VL) |
| Persistencia | localStorage |
| Deployment | Vercel |

## Estilo de Código

### Reglas Generales
- **TypeScript strict** - Tipos explícitos siempre
- **Componentes funcionales** - Solo functional components con hooks
- **Sin comentarios** - Excepto si son absolutamente necesarios
- **Nombre descriptivo** - Funciones y variables con nombres claros en español/inglés
- **Una responsabilidad** - Cada función hace una cosa

### Estructura de Componentes
```typescript
// Tipo de props si es necesario
interface Props { ... }

// Componente principal
export default function Component({ prop }: Props) {
  // hooks
  const [state, setState] = useState()
  
  // funciones handler
  const handler = () => { ... }
  
  // return JSX
  return (...)
}
```

### Imports
- Imports de terceros: `@/` para código del proyecto
- Orden: React → types → lib → componentes

## Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Archivos | kebab-case | `ai-service.ts`, `study-session.ts` |
| Componentes | PascalCase | `StudyCard.tsx` |
| Funciones | camelCase | `handleUpload()`, `generateQuiz()` |
| Constantes | UPPER_SNAKE_CASE | `STORAGE_KEY`, `MAX_FILE_SIZE` |
| Interfaces | PascalCase | `StudySession`, `Flashcard` |

## Variables de Entorno

El proyecto usa las siguientes variables en `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Importante:** Nunca commitear API keys reales. Usar valores de placeholder en commits.

## Comandos Útiles

```bash
# Desarrollo
npm run dev                              # Modo desarrollo
npx next dev --webpack                   # Si hay problemas de swc

# Build
npm run build                            # Build producción
npm run build -- --webpack               # Si hay problemas de swc en Windows

# Linting
npm run lint                             # Verificar código
```

## Directrices para IA

### Cuando resuelvas bugs:
1. Reproducir el bug localmente
2. Identificar la causa raíz
3. Implementar fix mínimo
4. Testear que funciona

### Cuando agregues features:
1. Mantener código existente
2. No agregar dependencias innecesarias
3. Seguir el estilo del proyecto
4. Testear endevserver

### Antes de modificar:
- Leer MEMORY.md para entender contexto actual
- Leer AGENTS.md para reglas del proyecto

## Errores Conocidos

1. **Build en Windows con swc:** Usar flag `--webpack`
2. **API key de OpenRouter:** Necesita ser configurada en .env.local

---

*Este archivo debe actualizarse cuando cambien las reglas del proyecto.*
*Última actualización: Mayo 2026*