# Development

ToCry is open source and welcomes contributions! The main repository is at [github.com/ralsina/tocry](https://github.com/ralsina/tocry).

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/tocry.git
   cd tocry
   ```
3. **Install dependencies**:
   ```bash
   shards install
   cd src/js && npm install
   ```
4. **Run the application**:
   ```bash
   crystal run src/main.cr -- --port 3000
   ```

## Building

```bash
# Development build
crystal run src/main.cr

# Production build
shards build

# Run tests
make test
```

## Testing

ToCry includes comprehensive test suites:

- **Unit Tests**: Crystal backend tests (`crystal spec`)
- **JavaScript Tests**: Frontend tests (`cd src/js && npm test`)
- **E2E Tests**: End-to-end integration tests with Playwright (`cd src/js && npm run test:e2e`)

Run all tests with `make test` or individual test suites as shown above.

## Contributing

Feel free to submit issues and pull requests. The project follows standard Crystal conventions and includes pre-commit hooks to ensure code quality.
