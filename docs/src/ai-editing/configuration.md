# Configuration

ToCry's AI features require proper configuration to work with z.ai's API.

## Environment Variables

### Z_AI_API_KEY

**Required**: The API key for accessing z.ai's services.

```bash
export Z_AI_API_KEY="your-zai-api-key-here"
```

**How to get an API key**:
1. Create an account at [z.ai](https://z.ai)
2. Navigate to your account settings or API section
3. Generate a new API key
4. Copy and securely store the key

**Security Notes**:
- Keep your API key confidential and never commit it to version control
- Use environment variables or secure configuration management
- Rotate API keys regularly for security

## Command Line Options

### --ai-model

**Optional**: Specify which AI model to use for text processing.

```bash
# Use default model (glm-4.5-flash)
tocry

# Specify a different model
tocry --ai-model=glm-4
tocry --ai-model=glm-4.5-flash
```

**Available Models**: See [z.ai pricing guide](https://docs.z.ai/guides/overview/pricing) for current model options and pricing.

**Default Model**: `glm-4.5-flash` (balanced performance and cost)

## Configuration Examples

### Basic Setup

```bash
# Set API key
export Z_AI_API_KEY="your-api-key"

# Start ToCry with default AI model
./tocry --port 3000
```

### Custom Model

```bash
# Set API key
export Z_AI_API_KEY="your-api-key"

# Start ToCry with specific AI model
./tocry --ai-model=gpt-4o-mini --port 3000
```

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  tocry:
    image: tocry:latest
    environment:
      - Z_AI_API_KEY=${Z_AI_API_KEY}
    command: ["--ai-model=glm-4.5-flash"]
    ports:
      - "3000:3000"
```

## Troubleshooting

### API Key Issues

**Error**: `Z_AI_API_KEY environment variable not set`

**Solution**: Ensure the environment variable is properly set before starting ToCry:

```bash
echo $Z_AI_API_KEY  # Should show your API key
```

### Model Availability

**Error**: `Invalid model specified` or `Model not available`

**Solution**:
1. Check the [z.ai documentation](https://docs.z.ai/guides/overview/pricing) for available models
2. Verify the model name spelling is correct
3. Ensure your API key has access to the specified model

### Connection Issues

**Error**: `Error calling z.ai API` or timeout errors

**Solutions**:
1. Verify internet connectivity
2. Check if z.ai services are operational
3. Validate API key is valid and active
4. Check rate limits and billing status

## Rate Limiting

AI requests are subject to rate limiting based on your z.ai plan:
- Monitor your API usage in the z.ai dashboard
- Implement appropriate delays between requests if needed
- Consider upgrading your plan for higher limits
