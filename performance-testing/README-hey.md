# Load Testing with Hey

This directory contains load testing scripts using [Hey](https://github.com/rakyll/hey), a simple yet powerful HTTP load testing tool.

## Installation

If you haven't installed Hey yet:

```bash
go install github.com/rakyll/hey@latest
```

## Quick Start

Make sure your ToCry server is running (default: http://localhost:3000), then run:

```bash
# Test concurrency vs response time
./test_concurrency.sh

# Test sustained load (5 minutes)
./test_sustained_load.sh

# Test traffic spikes
./test_burst_load.sh

# Test mixed workload (multiple endpoints)
./test_mixed_workload.sh
```

## Test Scripts Overview

### 1. `test_concurrency.sh` - Concurrency Analysis
- **Purpose**: Tests how response time changes with different numbers of concurrent users
- **Pattern**: 1 → 5 → 10 → 15 → 20 → 25 → 30 → 35 → 40 → 45 → 50 users
- **Output**: Chart-ready data for plotting concurrency vs response time

**Usage:**
```bash
./test_concurrency.sh [base_url]
./test_concurrency.sh http://localhost:3000
```

### 2. `test_sustained_load.sh` - Sustained Performance
- **Purpose**: Tests performance over time to check for degradation
- **Pattern**: 25 concurrent users for 5 minutes (10 samples of 30 seconds each)
- **Output**: Shows if performance degrades over time

**Usage:**
```bash
./test_sustained_load.sh [base_url]
```

### 3. `test_burst_load.sh` - Traffic Spike Testing
- **Purpose**: Tests how the system handles sudden traffic spikes
- **Pattern**: 5 bursts of 60 concurrent users for 15 seconds each
- **Output**: Peak performance under sudden load

**Usage:**
```bash
./test_burst_load.sh [base_url]
```

### 4. `test_mixed_workload.sh` - Realistic Usage Patterns
- **Purpose**: Tests multiple endpoints with realistic traffic distribution
- **Pattern**: 70% home page, 25% boards API, 5% board creation
- **Output**: Performance under realistic mixed load

**Usage:**
```bash
./test_mixed_workload.sh [base_url]
```

## Interpreting Results

### Key Metrics
- **Average Response**: Mean response time across all requests
- **95th Percentile**: 95% of requests complete faster than this
- **99th Percentile**: 99% of requests complete faster than this
- **Requests/sec**: Throughput measurement
- **Success Rate**: Percentage of successful requests

### Performance Indicators
- **Excellent**: < 20ms average, < 50ms P95
- **Good**: 20-50ms average, 50-100ms P95
- **Acceptable**: 50-100ms average, 100-200ms P95
- **Poor**: > 100ms average, > 200ms P95

## Creating Charts

The `test_concurrency.sh` script outputs CSV data at the end that you can copy into Excel, Google Sheets, or any charting tool:

```csv
Concurrency,ResponseTime,P95,P99,RPS
1,5.23,8.45,12.34,78.2
5,8.91,15.23,23.45,256.7
...
```

### Recommended Charts
1. **Concurrency vs Response Time** - Line chart
2. **Concurrency vs Throughput (RPS)** - Line chart
3. **Response Time Percentiles** - Multi-line chart (avg, P95, P99)
4. **Sustained Load Performance** - Line chart over time

## Tips for Accurate Testing

1. **Server Environment**: Run tests on the target deployment environment
2. **Network**: Test from a similar network location as real users
3. **Multiple Runs**: Run each test 2-3 times and average the results
4. **Warm-up**: Let the server warm up for a minute before testing
5. **Background Load**: Stop other applications that might affect results

## Customizing Tests

You can modify the scripts to adjust:
- Number of requests (`-n`)
- Concurrency level (`-c`)
- Test duration (`-t`)
- Request timeout (`-D`)
- Custom headers (`-H`)
- Request body (`-d`)

Example:
```bash
hey -n 1000 -c 25 -t 60s -H "Authorization: Bearer token" -d '{"test": "data"}' http://localhost:3000/api/v1/boards
```

## Troubleshooting

### Common Issues
- **Connection refused**: Make sure ToCry server is running
- **High error rates**: Check server logs for issues
- **Inconsistent results**: Run multiple tests and average

### Getting Help
```bash
hey --help
```

Happy load testing! 🚀
