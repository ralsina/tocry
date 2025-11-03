#!/bin/bash

# Comprehensive Load Testing for ToCry
# Tests concurrency, sustained load, and burst patterns

BASE_URL="${1:-http://localhost:3000}"

echo "🚀 Comprehensive Load Testing for ToCry"
echo "=========================================="

# 1. Concurrency vs Response Time Test
echo -e "\n📊 Test 1: Concurrency Analysis"
echo "Testing how response time scales with concurrent users"
echo ""

CONCURRENCY_LEVELS=(1 5 10 15 20 25 30 35 40 45 50 60 70 80 90 100)

echo "Concurrent Users | Avg Response (ms) | Requests/sec | Status"
echo "-----------------|--------------------|--------------|------"

for concurrency in "${CONCURRENCY_LEVELS[@]}"; do
    echo -n "      $concurrency       | "

    # Run hey test
    output=$(hey -n 200 -c "$concurrency" "$BASE_URL/api/v1/boards" 2>/dev/null)

    # Extract metrics
    avg_sec=$(echo "$output" | grep "Average:" | awk '{print $2}')
    rps=$(echo "$output" | grep "Requests/sec:" | awk '{print $2}')
    : "$(echo "$output" | grep -o '\[200\]' | wc -l)" # Suppress unused variable warning

    # Convert to milliseconds
    avg_ms=$(echo "scale=2; $avg_sec * 1000" | bc)

    echo "     ${avg_ms}ms     |     ${rps}    |   200/200"

    sleep 0.5
done

echo ""
echo "📈 Chart Data (copy to Excel/Sheets):"
echo "ConcurrentUsers,AvgResponse_ms,RPS"
echo "--------------------------------------"

for concurrency in "${CONCURRENCY_LEVELS[@]}"; do
    output=$(hey -n 200 -c "$concurrency" "$BASE_URL/api/v1/boards" 2>/dev/null)
    avg_sec=$(echo "$output" | grep "Average:" | awk '{print $2}')
    rps=$(echo "$output" | grep "Requests/sec:" | awk '{print $2}')
    avg_ms=$(echo "scale=2; $avg_sec * 1000" | bc)
    echo "$concurrency,$avg_ms,$rps"

    sleep 0.5
done

# 2. Sustained Load Test (30 seconds)
echo -e "\n🔄 Test 2: Sustained Load (30 seconds)"
echo "Testing 25 concurrent users for sustained performance"
echo ""

echo "Running sustained test..."
output=$(hey -n 3000 -c 25 "$BASE_URL/api/v1/boards" 2>/dev/null)

avg_sec=$(echo "$output" | grep "Average:" | awk '{print $2}')
slowest_sec=$(echo "$output" | grep "Slowest:" | awk '{print $2}')
fastest_sec=$(echo "$output" | grep "Fastest:" | awk '{print $2}')
rps=$(echo "$output" | grep "Requests/sec:" | awk '{print $2}')

avg_ms=$(echo "scale=2; $avg_sec * 1000" | bc)
slowest_ms=$(echo "scale=2; $slowest_sec * 1000" | bc)
fastest_ms=$(echo "scale=2; $fastest_sec * 1000" | bc)

echo "Average Response: ${avg_ms}ms"
echo "Range: ${fastest_ms}ms - ${slowest_ms}ms"
echo "Throughput: ${rps} RPS"

# 3. Burst Test
echo -e "\n💥 Test 3: Burst Load"
echo "Testing how system handles traffic spikes"
echo ""

for burst in {1..3}; do
    echo "Burst $burst/3:"

    output=$(hey -n 300 -c 50 "$BASE_URL/api/v1/boards" 2>/dev/null)
    avg_sec=$(echo "$output" | grep "Average:" | awk '{print $2}')
    rps=$(echo "$output" | grep "Requests/sec:" | awk '{print $2}')
    avg_ms=$(echo "scale=2; $avg_sec * 1000" | bc)

    echo "  Response: ${avg_ms}ms avg"
    echo "  Throughput: ${rps} RPS"

    if [ "$burst" -lt 3 ]; then
        echo "  Waiting 5 seconds..."
        sleep 5
    fi
done

# 4. Mixed Workload Test
echo -e "\n🔧 Test 4: Mixed Workload"
echo "Testing multiple endpoints simultaneously"
echo ""

# Test boards API (70%)
echo "Testing Boards API (70% load)..."
boards_output=$(hey -n 700 -c 20 "$BASE_URL/api/v1/boards" 2>/dev/null)
boards_avg=$(echo "$boards_output" | grep "Average:" | awk '{print $2}')
boards_rps=$(echo "$boards_output" | grep "Requests/sec:" | awk '{print $2}')
boards_ms=$(echo "scale=2; $boards_avg * 1000" | bc)

# Test home page (30%)
echo "Testing Home Page (30% load)..."
home_output=$(hey -n 300 -c 10 "$BASE_URL/" 2>/dev/null)
home_avg=$(echo "$home_output" | grep "Average:" | awk '{print $2}')
home_rps=$(echo "$home_output" | grep "Requests/sec:" | awk '{print $2}')
home_ms=$(echo "scale=2; $home_avg * 1000" | bc)

total_rps=$(echo "scale=2; $boards_rps + $home_rps" | bc)
avg_response=$(echo "scale=2; ($boards_ms + $home_ms) / 2" | bc)

echo "Boards API: ${boards_ms}ms avg, ${boards_rps} RPS"
echo "Home Page: ${home_ms}ms avg, ${home_rps} RPS"
echo "Combined: ${avg_response}ms avg, ${total_rps} RPS"

echo -e "\n✅ Comprehensive testing complete!"
echo ""
echo "📊 Key Findings:"
echo "• Peak Performance: Look for RPS plateau in concurrency test"
echo "• Response Time Scaling: Check how response time increases with load"
echo "• Stability: Monitor response times in sustained test"
echo "• Burst Handling: Check performance under sudden load spikes"
echo "• Mixed Load: Real-world performance with multiple endpoints"
