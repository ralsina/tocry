# Performance Benchmarks

Performance benchmarks for ToCry across different hardware platforms with real-world usage data and capacity estimates.

The testing focuses on two representative hardware configurations that are readily available to the project maintainers: a Raspberry Pi 4 (representing low-cost ARM64 deployment) and an AMD Ryzen 5600H mini PC (representing standard x86_64 performance). These configurations provide insight into ToCry's performance across different architectures and help users make informed deployment decisions based on their available hardware and performance requirements.

## Test Results (November 2025)

### Hardware Configurations

| Platform           | CPU                              | RAM   | Workers | Test Date |
|--------------------|----------------------------------|-------|---------|-----------|
| **Raspberry Pi 4** | ARM Cortex-A72 @ 1.5GHz          | 4GB   | 2       | Nov 2025  |
| **AMD Ryzen 5600H**| 6 cores, 12 threads @ 3.3GHz     | 23GB  | 4       | Nov 2025  |

### Performance Metrics

| Metric | **Pi 4** | **Ryzen 5600H** | **Ratio** |
|--------|---------|---------------|----------|
| **Peak RPS** | ~954 | ~3,000 | 3.1x |
| **Sustained RPS** | 832 | 3,068 | 3.7x |
| **Burst Load** | 827 | 2,937 | 3.6x |
| **Mixed Workload** | 1,234 | 3,728 | 3.0x |

### Response Times

| Concurrent Users | **Pi 4** (ms) | **Ryzen 5600H** (ms) |
|-----------------|--------------|-------------------|
| 1 user | 1.2 | 0.4 |
| 25 users | 15.3 | 8.0 |
| 50 users | 30.9 | 14.7 |
| 100 users | 84.1 | 30.0 |

## Platform Analysis

### Raspberry Pi 4 (ARM64)
**Strengths:**
- Energy efficient: 5-15W power consumption
- Cost effective: ~$75 total hardware cost
- Production ready: 100% reliability under load
- Consistent performance with 2 workers
- Excellent for edge deployments

**Limitations:**
- Performance plateaus after 20-30 concurrent users
- 4GB RAM limits maximum concurrency
- ARM architecture has lower single-thread performance

**Best Use Cases:**
- Personal projects (1-5 users)
- Small teams (5-15 users)
- Edge computing and IoT deployments
- Budget-constrained installations

### AMD Ryzen 5600H (x86_64)
**Strengths:**
- High performance: 3,000+ RPS peak throughput
- Excellent scalability: Linear to 50+ concurrent users
- Resource abundance: 23GB RAM provides headroom
- Superior multi-threading with 4 workers
- Sub-10ms response times for typical loads

**Considerations:**
- Higher power consumption: 45-65W
- Higher hardware cost: ~$490 total
- Overkill for small deployments

**Best Use Cases:**
- Medium teams (15-50 users)
- High-concurrency applications (50+ users)
- Performance-critical deployments
- Enterprise environments

## User Capacity Estimates

### Concurrent Users Supported

| Platform | **Excellent** (<10ms) | **Good** (<30ms) | **Acceptable** (<50ms) |
|---------|----------------------|-----------------|----------------------|
| **Pi 4** | 20 users | 50 users | 80 users |
| **Ryzen 5600H** | 40 users | 100 users | 150+ users |

### Total User Capacity (24-hour)

| Platform | **Light Usage** | **Medium Usage** | **Heavy Usage** |
|---------|----------------|-----------------|----------------|
| **Pi 4** | 400-500 users | 250-350 users | 150-200 users |
| **Ryzen 5600H** | 1,200-1,500 users | 800-1,000 users | 500-700 users |

*Based on typical 5-15% concurrent user ratios*

## Deployment Recommendations

### Choose Raspberry Pi 4 When:
- Budget is primary constraint (~$75 vs ~$490)
- User base < 50 active users
- Energy efficiency is important
- Edge deployment scenarios
- Small team collaboration (5-15 users)

### Choose AMD Ryzen 5600H When:
- Performance is critical priority
- User base > 50 active users
- Sub-second response times required
- Large team collaboration (15+ users)
- Enterprise-grade reliability needed

## Cost-Performance Analysis

| Metric | Raspberry Pi 4 | AMD Ryzen 5600H | **Winner** |
|--------|---------------|-----------------|-----------|
| **Hardware Cost** | ~$75 | ~$490 | Pi 4 (6.5x cheaper) |
| **Peak RPS** | ~954 | ~3,000 | AMD (3.1x faster) |
| **RPS per Dollar** | 12.7 | 6.1 | **Pi 4 (2.1x better value)** |
| **Power Efficiency** | 63.6 RPS/W | 46.2 RPS/W | **Pi 4 (1.4x better)** |

## Technical Notes

### Testing Methodology
- **Tool**: Hey HTTP load testing
- **Test Pattern**: Incremental concurrency (1→100 users)
- **Duration**: 200 requests per concurrency level
- **Endpoints**: Boards API (70%) + Home page (30%)
- **Configuration**: Static builds with optimized worker counts

### Key Insights
1. **Performance Gap**: AMD provides 3x better raw performance
2. **Value Proposition**: Pi 4 delivers 2x better cost efficiency
3. **Response Times**: Both platforms achieve sub-20ms for typical loads
4. **Scaling**: Pi 4 plateaus at 30 users, AMD scales linearly to 50+
5. **Production Ready**: Both platforms maintain 100% reliability

---

*Last updated: November 2025*
*Test methodology: Hey HTTP load testing tool without artificial delays*
*Hardware: Raspberry Pi 4 (4GB ARM, 2 workers) and AMD Ryzen 5600H (23GB x86_64, 4 workers)*

**Note**: These tests use synthetic load patterns that may not reflect real-world usage. The `/api/v1/boards` endpoint tested is relatively lightweight compared to typical user interactions that include note creation, editing, file uploads, and WebSocket operations. Further testing with realistic workloads is recommended for production deployment planning.
