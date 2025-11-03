# Supported AI Models

ToCry integrates with z.ai to provide various AI models for note refinement and editing. Each model has different capabilities, performance characteristics, and pricing.

## Default Model

### glm-4.5-flash

**ToCry's default choice** - Balanced performance and cost-effective solution.

**Characteristics**:
- Fast response times
- Good for general text processing
- **Free to use** as of this writing (see [z.ai pricing](https://docs.z.ai/guides/overview/pricing))
- Strong English and multilingual capabilities

**Best For**:
- Grammar and style corrections
- Text summarization
- Basic content enhancement
- Everyday note refinement

## Available Models

### GLM Series

#### glm-4
The standard GLM model with balanced capabilities.

- **Use Case**: General text processing and editing
- **Performance**: Good quality, reasonable speed
- **Cost**: Moderate pricing

#### glm-4-flash
Fast and lightweight version of GLM-4.

- **Use Case**: Quick edits and real-time processing
- **Performance**: Faster responses, slightly reduced quality
- **Cost**: Lower pricing tier


## Model Selection Guide

### For Personal Use

**Recommended**: `glm-4.5-flash` (default)

- Cost-effective for regular use
- Good enough quality for most tasks
- Fast response times

### For Professional/Team Use

**Recommended**: `glm-4`

- Higher quality output
- Better understanding of context
- More sophisticated editing capabilities

### For High-Volume Applications

**Recommended**: `glm-4-flash`

- Lowest cost per request
- Fastest processing times
- Suitable for bulk operations

## Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|-----------|
| glm-4.5-flash | Fast | Good | Low | Daily use, quick edits |
| glm-4 | Medium | Very Good | Medium | Professional editing |
| glm-4-flash | Very Fast | Good | Very Low | Bulk processing |

## How to Change Models

### Command Line

```bash
# Use a different model
tocry --ai-model=glm-4

# Start with faster model for quick editing
tocry --ai-model=glm-4-flash

# Use higher quality model for professional editing
tocry --ai-model=glm-4
```

### Environment Configuration

```bash
# Set model in environment
export TOCRY_AI_MODEL="glm-4"
./tocry
```

### Docker Configuration

```yaml
services:
  tocry:
    image: tocry:latest
    environment:
      - Z_AI_API_KEY=${Z_AI_API_KEY}
    command: ["--ai-model=glm-4"]
    ports:
      - "3000:3000"
```

## Model-Specific Considerations

### Response Format

All models are configured to return responses that can directly replace the original note text. The system prompt ensures:

- Valid Markdown output
- Direct text replacement capability
- Preservation of formatting when appropriate

### Rate Limits

Different models may have different rate limits:
- **Flash models**: Higher rate limits, suitable for frequent requests
- **Premium models**: Lower rate limits, consider batching requests
- **Check your z.ai dashboard** for specific limits based on your plan

### Language Support

Most models support multiple languages, but performance may vary:
- **English**: Best performance across all models
- **Other languages**: Varies by model, GLM series often strong in Asian languages
- **Technical content**: GLM-4 generally better for specialized domains

## Cost Optimization

### Best Practices

1. **Use the default model** (`glm-4.5-flash`) for most tasks
2. **Upgrade only when needed** for complex editing requirements
3. **Monitor usage** in your z.ai dashboard
4. **Batch similar requests** to reduce API calls
5. **Use appropriate models** for different use cases

### Cost Estimation

Check the [z.ai pricing guide](https://docs.z.ai/guides/overview/pricing) for current rates. Typical usage patterns:

- **Light users**: $1-5/month with glm-4.5-flash
- **Regular users**: $5-15/month with glm-4
- **Power users**: $15-30/month with glm-4 for higher quality

## Troubleshooting

### Model Not Available

**Error**: `Model not found or not available`

**Solutions**:
1. Verify model name spelling
2. Check if your API plan includes the model
3. Try the default model: `glm-4.5-flash`

### Performance Issues

**Symptoms**: Slow responses or timeouts

**Solutions**:
1. Switch to a faster model (glm-4-flash)
2. Check network connectivity
3. Reduce request size if processing long text
4. Monitor rate limits in z.ai dashboard
