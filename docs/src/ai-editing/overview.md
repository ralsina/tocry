# AI-Powered Editing

ToCry integrates with z.ai to provide intelligent note editing and refinement capabilities. This feature leverages advanced language models to help you improve, polish, and enhance your task descriptions and documentation.

## What It Does

The AI editing feature allows you to:
- **Improve writing quality**: Fix grammar, spelling, and style issues
- **Enhance clarity**: Make complex ideas easier to understand
- **Summarize content**: Condense lengthy descriptions into concise points
- **Expand ideas**: Add detail and context to brief notes
- **Format text**: Convert between different writing styles and formats
- **Translate content**: Support for multiple languages (varies by model)

## How It Works

### 1. Direct Integration

ToCry provides a seamless editing experience directly within the note editor:

1. **Edit a note** using the standard ToCry interface
2. **Access AI options** from the editor toolbar
3. **Provide instructions** through custom prompts or templates
4. **Review suggestions** from the AI model
5. **Apply changes** with a single click

### 2. API Endpoint

The system exposes a RESTful API endpoint for AI processing:

```
POST /api/v1/z-ai/completions
```

**Request Format**:
```json
{
  "text": "Your note content here",
  "prompt": "Custom instructions for the AI"
}
```

**Response Format**:
```json
{
  "choices": [
    {
      "message": {
        "content": "Refined and improved text"
      }
    }
  ]
}
```

### 3. Smart Processing

The AI system is configured to:
- **Preserve formatting**: Maintain Markdown structure and links
- **Return direct replacements**: Output can replace the original text
- **Understand context**: Consider the full note content when making edits
- **Follow instructions**: Respect custom prompts and templates

## Use Cases

### Everyday Task Management

**Grammar and Style Correction**:
- Fix typos and grammatical errors
- Improve sentence structure and flow
- Ensure consistent tone and style

**Content Enhancement**:
- Make task descriptions clearer and more actionable
- Add missing details or context
- Improve organization and structure

### Professional Documentation

**Technical Writing**:
- Simplify complex technical concepts
- Ensure proper terminology usage
- Improve documentation clarity

**Business Communication**:
- Professionalize language and tone
- Enhance readability for stakeholders
- Ensure consistent formatting

### Creative and Content Work

**Content Creation**:
- Expand brief ideas into detailed descriptions
- Generate alternative phrasings and approaches
- Improve narrative flow and engagement

**Editing and Proofreading**:
- Comprehensive grammar and style review
- Consistency checking across related notes
- Quality assurance for important content

## User Experience

### Interface Integration

The AI editing is built directly into ToCry's note editor:

- **One-click access**: AI options available from the editor toolbar
- **Real-time processing**: Quick responses for efficient workflow
- **Preview functionality**: Review changes before applying
- **Undo support**: Revert AI changes if needed

### Prompt Management

Users can:
- **Use custom prompts**: Provide specific instructions for each edit
- **Save templates**: Create reusable prompt templates for common tasks
- **Quick actions**: Access predefined editing operations
- **Iterative refinement**: Apply multiple AI passes for complex edits

## Technical Architecture

### Backend Integration

ToCry's AI system consists of:

1. **API Endpoint** (`/api/v1/z-ai/completions`):
   - Handles HTTP requests from the frontend
   - Validates input and manages error handling
   - Communicates with z.ai's API

2. **Model Configuration**:
   - Configurable AI model selection
   - System prompt optimization for direct text replacement
   - Error handling and fallback mechanisms

3. **Rate Limiting**:
   - Integration with ToCry's rate limiting system
   - Respects z.ai API limits and user quotas
   - Provides feedback on usage and limits

### Frontend Integration

The JavaScript store manages:
- **API communication**: Secure requests to the AI endpoint
- **UI state management**: Loading states and error handling
- **Editor integration**: Seamless interaction with ToastUI editor
- **User feedback**: Clear indicators of AI processing status

## Privacy and Security

### Data Handling

- **Secure transmission**: All AI requests use HTTPS encryption
- **No data storage**: ToCry doesn't store AI requests or responses
- **API key security**: Keys are handled securely through environment variables
- **User control**: Users choose what content to send to AI services

### z.ai Integration

- **Third-party service**: AI processing handled by z.ai's infrastructure
- **Privacy policy**: Subject to z.ai's privacy terms and conditions
- **Data usage**: Note content sent for processing purposes only
- **Compliance**: Users should ensure compliance with their organizational policies

## Getting Started

### Prerequisites

1. **z.ai API Key**: Required for AI functionality
2. **Network access**: Internet connection for API communication
3. **Model selection**: Choose appropriate AI model for your needs

### Basic Usage

1. **Configure API key** in environment variables
2. **Start ToCry** with AI model selection
3. **Edit a note** in the ToCry interface
4. **Use AI features** from the editor toolbar
5. **Apply improvements** to enhance your content

For detailed setup instructions, see the [Configuration](configuration.md) section.

## Limitations and Considerations

### Technical Constraints

- **Internet dependency**: Requires active internet connection
- **API rate limits**: Subject to z.ai's usage limits and pricing
- **Response time**: Processing time varies by model and request complexity
- **Model capabilities**: Quality and features vary by selected AI model

### Usage Guidelines

- **Review carefully**: Always review AI suggestions before applying
- **Context matters**: Provide clear prompts for better results
- **Cost awareness**: Monitor usage to manage API costs
- **Quality assurance**: Use AI as a tool, not a replacement for human judgment

## Future Enhancements

Potential improvements to the AI editing system:

- **More models**: Integration with additional AI providers
- **Batch processing**: Apply AI changes to multiple notes
- **Custom templates**: Pre-built prompt templates for specific use cases
- **Advanced features**: Style guides, tone adjustment, and domain-specific editing
- **Offline capabilities**: Local AI model integration for privacy-sensitive use
