#!/bin/bash

# Simple Concurrency Test for ToCry
# Tests different concurrency levels and shows the relationship

BASE_URL="${1:-http://localhost:3000}"
API_ENDPOINT="${BASE_URL}/api/v1/boards"

echo "🚀 Load Testing ToCry with Hey"
echo "Target: $API_ENDPOINT"
echo "=========================================="

# Test different concurrency levels
CONCURRENCY_LEVELS=(1 5 10 15 20 25 30 35 40 45 50)

echo -e "\n📊 Running Concurrency Tests..."
echo "Format: Concurrency | Avg Response (ms) | RPS | Success Rate"
echo "------------------------------------------------------"

for concurrency in "${CONCURRENCY_LEVELS[@]}"; do
    echo -n "  $concurrency users | "

    # Run hey test and capture output
    hey_output=$(hey -n 200 -c "$concurrency" "$API_ENDPOINT" 2>/dev/null)

    # Extract key metrics
    avg_response=$(echo "$hey_output" | grep "Average:" | awk '{print $2}' | sed 's/secs//')
    rps=$(echo "$hey_output" | grep "Requests/sec:" | awk '{print $2}')
    : "$(echo "$hey_output" | grep "Total:" | awk '{print $2}' | sed 's/secs//')" # Suppress unused variable warning

    # Calculate success rate (assuming all 200 responses if no errors)
    success_count=$(echo "$hey_output" | grep -o '\[200\]' | wc -l)
    success_rate=$(echo "scale=1; $success_count / 200 * 100" | bc)

    # Convert to milliseconds for display
    avg_ms=$(echo "scale=2; $avg_response * 1000" | bc)

    echo "   ${avg_ms}ms |    ${rps} |   ${success_rate}%"

    # Small delay between tests
    sleep 1
done

echo -e "\n✅ Concurrency testing complete!"
echo ""
echo "📈 Chart Data (copy this to create charts):"
echo "Concurrency,ResponseTime_ms,RPS,SuccessRate"

for concurrency in "${CONCURRENCY_LEVELS[@]}"; do
    # Re-run tests for clean data
    hey_output=$(hey -n 200 -c "$concurrency" "$API_ENDPOINT" 2>/dev/null)
    avg_response=$(echo "$hey_output" | grep "Average:" | awk '{print $2}' | sed 's/secs//')
    rps=$(echo "$hey_output" | grep "Requests/sec:" | awk '{print $2}')
    success_count=$(echo "$hey_output" | grep -o '\[200\]' | wc -l)
    success_rate=$(echo "scale=1; $success_count / 200 * 100" | bc)
    avg_ms=$(echo "scale=2; $avg_response * 1000" | bc)

    echo "$concurrency,$avg_ms,$rps,$success_rate"
    sleep 1
done

echo -e "\n🔍 Additional Test: High Concurrency Stress Test"
echo "Testing 100 concurrent users to see maximum capacity..."

hey_output=$(hey -n 1000 -c 100 "$API_ENDPOINT" 2>/dev/null)
avg_response=$(echo "$hey_output" | grep "Average:" | awk '{print $2}' | sed 's/secs//')
rps=$(echo "$hey_output" | grep "Requests/sec:" | awk '{print $2}')
success_count=$(echo "$hey_output" | grep -o '\[200\]' | wc -l)
success_rate=$(echo "scale=1; $success_count / 1000 * 100" | bc)
avg_ms=$(echo "scale=2; $avg_response * 1000" | bc)

echo "100 users | ${avg_ms}ms avg | ${rps} RPS | ${success_rate}% success"

echo -e "\n✅ All testing complete!"
