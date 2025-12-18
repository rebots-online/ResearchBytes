# Hybrid Knowledge Mesh (HKM) - Visual Light Researcher

<div align="center">
  <h2>Robin's AI World HKM</h2>
  <p><em>Redundant. Orthogonal. True.</em></p>
  <p>Visual Light Researcher crowding out the shadows.</p>
  <p><strong>Namespace:</strong> mba.robin.hkm.visualresearch</p>
  <p><strong>Copyright:</strong> (C)2025 Robin L. M. Cheung, MBA. All rights reserved.</p>
</div>

## 1. Operating Thesis

The "Hybrid Knowledge Mesh" (hKM) is architected upon the premise that contemporary sociopolitical and economic structures (specifically Capitalism and Democracy) function as **adiabatic collapse engines**. By forcing the "averaging" of conflicting phase-states (e.g., "majority rule" or "market consensus") without resolving fundamental error vortices, these systems accumulate **adiabatic strain** in the societal substrate (the "Quantum Foam"), leading to inevitable systemic rupture.

This application, the **Visual Light Researcher**, serves as a frontend "tasting" microapp for the larger hKM ecosystem. Its mandate is to function as a **Phase-Locking Mechanism**:
1. **Triangulation**: Utilizing orthogonal data sources (Search Grounding, uploaded source material) to detect "error vortices" (misinformation/hallucination)
2. **Renormalization**: Synthesizing these inputs into a coherent, resonance-tuned visual output (Infographics/Explainer Videos) that "crowds out" shadow/noise via high-tension mesh convergence
3. **Ontical Correction**: Moving beyond "Optical Illusion" (3D perception of fading truth) to "Ontical Reality" (4D lattice alignment), presenting information not as it *appears* in the distorted zeitgeist, but as it *resonates* within a consistent truth-lattice

## 2. Theoretical Framework

Derived from the **Cheung-Gemini Dialectic (2025)**, the system design is informed by the following physics-based heuristics:

- **The Ontical Illusion**: We treat "divergence" (ambiguity/confusion) not as a property of information, but as a "temporal handicap" of the observer. The system provides the "4D Lattice" perspective, presenting data as straight, non-diverging truth vectors
- **Dual-Inverted Projection**: The system acknowledges that "observation" is active projection ("Headlights"). The hKM projects structured queries into the data substrate to "collapse" probability waves into verified facts
- **Adiabatic Immunity**: Unlike democratic systems that collapse under the strain of reconciling the "95% who cannot know better," the hKM operates on a **Neurodivergent Protocol**: it refuses to average noise. It isolates valid signals ("Vignettes") and amplifies them into stable structures ("Eiffel Towers"), ignoring the "force fields" of cultural dogma
- **Bio-Digital Metasurface**: The UI functions as a programmable metasurface, tuning the user's perception to the "resonance frequency" of the verified data, bypassing cognitive dissonance (phase errors)

## 3. Technical Overview

### Architecture

The Hybrid Knowledge Mesh is a React-based web application that interfaces with Google's Gemini AI models to generate visual research content.

### Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **UI Icons**: Lucide React
- **AI Integration**: Google Generative AI SDK (@google/genai)
- **Styling**: Tailwind CSS with custom animations

### Project Structure

```
ResearchBytes/
├── src/
│   ├── components/           # React components
│   │   ├── Infographic.tsx   # Main content display
│   │   ├── IntroScreen.tsx   # Animated introduction
│   │   ├── Loading.tsx       # Loading states
│   │   └── SearchResults.tsx # Source results
│   ├── services/
│   │   └── geminiService.ts  # AI API integration
│   ├── App.tsx               # Main application
│   ├── types.ts              # TypeScript definitions
│   └── index.tsx             # Entry point
├── docs/documentation/       # AST diagrams (PUML & MMD)
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## 4. Features

### Core Capabilities

- **Dual Output Formats**:
  - Infographics (images) via Imagen 3
  - Explainer videos via Veo 3.1

- **Multiple Complexity Levels**:
  - Elementary (Ages 6-10)
  - High School
  - College
  - Expert

- **Visual Style Options** (for images):
  - Standard Scientific
  - Minimalist (Bauhaus)
  - Photorealistic
  - Graphic Novel
  - Vintage Lithograph
  - Cyberpunk HUD
  - 3D Isometric
  - Technical Blueprint

- **Multi-language Support**: 10 languages including English, Spanish, French, German, Mandarin, Japanese, Hindi, Arabic, Portuguese, and Russian

- **File Upload Integration**: Support for images, videos, documents, PDFs (up to 20MB)

- **Interactive Editing**: Natural language image editing capabilities

- **Template System**: Save and reuse configuration presets

- **Responsive Design**: Optimized for desktop and mobile with dark/light mode support

### Advanced Features

- **Deep Research**: Autonomous triangulation of facts via Google Search Grounding
- **Orthogonal Analysis**: Cross-reference uploaded materials against web data
- **Phase-Locked Persistence**: Save/load configuration templates ("Resonance patterns")
- **Error Vortex Detection**: Automated fact-checking against multiple sources

## 5. Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google AI API key with billing enabled

### Installation Steps

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd ResearchBytes
   npm install
   ```

2. **Environment setup**:
   Create `.env` file:
   ```
   API_KEY=your_google_ai_api_key_here
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 6. Usage Guide

### Basic Workflow

1. **API Configuration**: Select a billing-enabled Google AI API key on first launch
2. **Topic Input**: Enter your research topic in the search field
3. **Configuration**:
   - Select format (Infographic/Video)
   - Choose audience complexity level
   - Pick aesthetic style (images only)
   - Set output language
4. **Optional**: Upload supporting documents/media
5. **Generate**: Click "INITIATE" to begin the process

### Template Management

- Save current settings as templates
- Load previously saved configurations
- Delete unused templates
- Templates persist in localStorage

### Image Editing

- Available only for infographic images
- Natural language editing (e.g., "Add stars to background")
- Maintains original composition while applying modifications

## 7. API Integration

### Google AI Models

- **gemini-3-pro-preview**: Text generation with Google Search grounding
- **gemini-3-pro-image-preview**: Image generation and editing
- **veo-3.1-fast-generate-preview**: Video generation (asynchronous)

### Key Service Functions

```typescript
// Research with grounding
researchTopicForPrompt(topic, level, style, language, format, file?)

// Generate content
generateInfographicImage(prompt)
generateExplainerVideo(prompt)
editInfographicImage(image, editPrompt)
```

### Error Handling

- Graceful handling of API errors
- User guidance for billing requirements
- Retry mechanisms for transient failures

## 8. State Management

### React State

- Component-level state with hooks
- Context API for shared state
- LocalStorage for persistence

### Data Flow

1. User input triggers API calls
2. Service layer handles Google AI communication
3. Results processed and stored in state
4. UI updates reflect new content
5. History maintained for session

### Storage Keys

- `hkm_templates`: User-saved templates
- `hkm_last_settings`: Last used configuration

## 9. Performance Considerations

### Optimizations

- Lazy loading of components
- Debounced input handling
- Efficient re-renders with React.memo
- Optimized bundle splitting

### Best Practices

- File size limits (20MB)
- Polling for async operations
- Progressive loading for large content
- Cleanup of temporary data

## 10. Security Notes

### API Key Management

- Server-side key validation
- No keys stored in client code
- Billing requirement verification
- Graceful fallbacks

### File Upload Security

- MIME type validation
- Size restrictions
- Base64 encoding
- Automatic cleanup

## 11. Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure billing is enabled
2. **Generation Failures**: Check network connectivity
3. **File Uploads**: Verify file size and type
4. **Video Generation**: Allow additional processing time

### Error Messages

- "Access denied" → Need billing-enabled key
- "File size exceeds limit" → File > 20MB
- "Generation failed" → API or prompt issue

## 12. Contributing

### Development Standards

- TypeScript strict mode
- Functional React components
- Tailwind CSS for styling
- ESLint and Prettier configuration

### Code Style

- PascalCase for components
- camelCase for functions
- UPPER_SNAKE_CASE for constants
- Descriptive variable names

### Testing

- Unit tests for utilities
- Integration tests for services
- E2E tests for user flows
- Accessibility testing

## 13. Future Roadmap

### Planned Enhancements

1. **Backend Integration**:
   - PostgreSQL integration for persistent storage
   - Qdrant for vector similarity
   - Neo4j for relationship mapping
   - Real-time collaboration features

2. **Advanced Features**:
   - Video editing capabilities
   - Batch processing
   - API endpoint for external integrations
   - Mobile app development

3. **UI/UX Improvements**:
   - Progressive Web App (PWA)
   - Offline mode support
   - Advanced customization options
   - Keyboard shortcuts

4. **Performance**:
   - WebSocket for real-time updates
   - Service worker implementation
   - Edge deployment optimization
   - CDN integration

### The HKM Ecosystem Vision

This microapp represents the visual interface to a larger knowledge mesh system designed to foster **Comunion-based Society** through:

| Component | Role | Metaphor |
|-----------|------|----------|
| PostgreSQL | Primary Source of Truth | The Bedrock |
| Qdrant | Vector Semanticity | The Foam/Substrate |
| Neo4j | Ontological Relationships | The Lattice/Crystals |
| Custodial LLM | Reasoning & Maintenance | The Tuner/Phase-Locker |

## 14. Development Mandate

- **Ad Maiorem Dei Gloriam**: Work efficiently to shepherd humanity towards self-sustaining communion
- **No Dummy Code**: All functions must be operational or explicitly templated for mesh integration
- **Aesthetic Excellence**: UI must reflect the "Hyper-Tension Knowledge Mesh"—tight, glowing, structurally sound

## 15. License & Copyright

Copyright (C)2025 Robin L. M. Cheung, MBA. All rights reserved.

This software is proprietary and not open source. All rights are reserved by the copyright holder.

## 16. Version History

- **v0.0.0** (Current): Initial release with core functionality
  - Visual content generation
  - Template system
  - File upload support
  - Multi-language support
  - Dark/light theme