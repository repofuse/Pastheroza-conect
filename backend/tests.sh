#!/usr/bin/env bash

set -u

# Colors
GRAY='\033[90m'
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

# Default values
STOP_ON_ERROR=false
VERBOSE=false
API_HOST=""

# Load .env if exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Build API URL from host
build_api_url() {
    local host="$1"
    if [[ "$host" == "localhost" || "$host" == "127.0.0.1" ]]; then
        echo "http://${host}:${PORT:-3000}"
    else
        echo "https://${host}"
    fi
}

show_help() {
    cat << EOF
conect API Test Suite

Usage: ./tests.sh [OPTIONS] [HOST|all]

Options:
  -h, --help              Show this help message
  -e, --stop-on-error     Stop tests immediately when one fails
  -v, --verbose           Show curl calls and JSON responses

Arguments:
  HOST                    API host (default: conect.api.hurated.com)
                          Examples: localhost, 127.0.0.1, conect.api.hurated.com
  all                     Run all tests against default host

Examples:
  ./tests.sh                    Show this help
  ./tests.sh all                Run all tests
  ./tests.sh localhost          Test local instance
  ./tests.sh -v all             Verbose output
  ./tests.sh -ve all            Verbose + stop on error

EOF
}

# Parse arguments
parse_args() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    while [ $# -gt 0 ]; do
        case "$1" in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--stop-on-error)
                STOP_ON_ERROR=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -*)
                opts="${1#-}"
                shift
                while [ -n "$opts" ]; do
                    case "${opts:0:1}" in
                        e) STOP_ON_ERROR=true ;;
                        v) VERBOSE=true ;;
                        *)
                            echo -e "${RED}Unknown option: -${opts:0:1}${RESET}"
                            exit 1
                            ;;
                    esac
                    opts="${opts:1}"
                done
                ;;
            all)
                API_HOST="conect.api.hurated.com"
                shift
                ;;
            *)
                API_HOST="$1"
                shift
                ;;
        esac
    done
    
    if [ -z "$API_HOST" ]; then
        show_help
        exit 0
    fi
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Track repos added for cleanup
ADDED_REPO_IDS=()

# Cleanup function
cleanup() {
    if [ ${#ADDED_REPO_IDS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}Cleaning up test data...${RESET}"
        for id in "${ADDED_REPO_IDS[@]}"; do
            curl -s -X DELETE "$API_URL/api/repos/$id" > /dev/null 2>&1
        done
        # Final reset to ensure clean state
        curl -s -X POST "$API_URL/api/reset" > /dev/null 2>&1
        echo -e "${GREEN}✓ Cleanup complete${RESET}"
    fi
}

trap cleanup EXIT

# GET test function
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    local validate_field="${4:-}"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: $test_name${RESET}"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}GET $API_URL$endpoint${RESET}"
    fi
    
    response=$(curl -s -w '\n%{http_code}' "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}$body${RESET}"
    fi
    
    local passed=true
    local fail_reason=""
    
    if [ "$http_code" -ne "$expected_status" ]; then
        passed=false
        fail_reason="Expected: $expected_status, Got: $http_code"
    elif [ -n "$validate_field" ] && [ "$expected_status" -eq 200 ]; then
        if ! echo "$body" | grep -q "\"$validate_field\""; then
            passed=false
            fail_reason="Missing field: $validate_field"
        fi
    fi
    
    if [ "$passed" = true ]; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED ($fail_reason)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ "$STOP_ON_ERROR" = true ]; then
            print_summary
            exit 1
        fi
    fi
}

# POST test function
run_post_test() {
    local test_name="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="${4:-200}"
    local validate_field="${5:-}"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: $test_name${RESET}"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}POST $API_URL$endpoint${RESET}"
        echo -e "${GRAY}Data: $data${RESET}"
    fi
    
    response=$(curl -s -w '\n%{http_code}' -X POST "$API_URL$endpoint" \
        -H "Content-Type: application/json" -d "$data")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}$body${RESET}"
    fi
    
    local passed=true
    local fail_reason=""
    
    if [ "$http_code" -ne "$expected_status" ]; then
        passed=false
        fail_reason="Expected: $expected_status, Got: $http_code"
    elif [ -n "$validate_field" ]; then
        if ! echo "$body" | grep -q "\"$validate_field\""; then
            passed=false
            fail_reason="Missing field: $validate_field"
        fi
    fi
    
    if [ "$passed" = true ]; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        # Return body for further processing
        echo "$body"
    else
        echo -e "${RED}✗ FAILED ($fail_reason)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ "$STOP_ON_ERROR" = true ]; then
            print_summary
            exit 1
        fi
    fi
}

# DELETE test function
run_delete_test() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: $test_name${RESET}"
    
    if [ "$VERBOSE" = true ]; then
        echo -e "${GRAY}DELETE $API_URL$endpoint${RESET}"
    fi
    
    response=$(curl -s -w '\n%{http_code}' -X DELETE "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (Expected: $expected_status, Got: $http_code)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ "$STOP_ON_ERROR" = true ]; then
            print_summary
            exit 1
        fi
    fi
}

# Print summary
print_summary() {
    echo -e "\n${YELLOW}========================================${RESET}"
    echo -e "${YELLOW}Test Summary${RESET}"
    echo -e "${YELLOW}========================================${RESET}"
    echo -e "Total tests: $TESTS_RUN"
    echo -e "${GREEN}Passed: $TESTS_PASSED${RESET}"
    echo -e "${RED}Failed: $TESTS_FAILED${RESET}"
    
    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed!${RESET}"
    else
        echo -e "\n${RED}Some tests failed!${RESET}"
    fi
}

# Main
main() {
    parse_args "$@"
    
    API_URL=$(build_api_url "$API_HOST")
    
    echo -e "${YELLOW}========================================${RESET}"
    echo -e "${YELLOW}conect API Test Suite${RESET}"
    echo -e "${YELLOW}========================================${RESET}"
    echo -e "API URL: $API_URL"
    echo -e "Stop on error: $STOP_ON_ERROR"
    echo -e "Verbose: $VERBOSE"
    
    # Ensure clean state
    echo -e "\n${YELLOW}Resetting API state...${RESET}"
    curl -s -X POST "$API_URL/api/reset" > /dev/null
    
    # ==========================================
    # Health Check
    # ==========================================
    run_test "Health Check" "/health" 200 "status"
    
    # ==========================================
    # Repository Management
    # ==========================================
    run_test "List Repos (empty)" "/api/repos" 200 "repos"
    
    # Add first repo
    local add_response=$(run_post_test "Add Repo (React)" "/api/repos" \
        '{"url":"https://github.com/bradtraversy/react-crash-2024"}' 200 "id")
    local repo1_id=$(echo "$add_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$repo1_id" ]; then
        ADDED_REPO_IDS+=("$repo1_id")
    fi
    
    # Add second repo
    add_response=$(run_post_test "Add Repo (Express)" "/api/repos" \
        '{"url":"https://github.com/bradtraversy/express-crash"}' 200 "id")
    local repo2_id=$(echo "$add_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$repo2_id" ]; then
        ADDED_REPO_IDS+=("$repo2_id")
    fi
    
    run_test "List Repos (2 repos)" "/api/repos" 200 "repos"
    
    # Test duplicate repo
    run_post_test "Add Repo (duplicate)" "/api/repos" \
        '{"url":"https://github.com/bradtraversy/react-crash-2024"}' 200 "id"
    
    # Test missing URL
    run_post_test "Add Repo (no URL)" "/api/repos" '{}' 400 "error"
    
    # ==========================================
    # Repo Analysis Agent
    # ==========================================
    run_post_test "Analyze Repos" "/api/analyze" '{}' 200 "results"
    
    # ==========================================
    # Interface Matching Agent
    # ==========================================
    run_post_test "Match Interfaces" "/api/match" '{}' 200 "matched"
    
    # ==========================================
    # Code Generation Agent
    # ==========================================
    run_post_test "Generate Code" "/api/generate" '{}' 200 "corsConfig"
    
    # ==========================================
    # Integration Agent
    # ==========================================
    run_post_test "Generate Integration" "/api/integrate" '{}' 200 "strategy"
    
    # ==========================================
    # Validation Agent
    # ==========================================
    run_post_test "Validate Integration" "/api/validate" '{}' 200 "report"
    
    # ==========================================
    # Full Pipeline (run-all)
    # ==========================================
    # Reset first
    curl -s -X POST "$API_URL/api/reset" > /dev/null
    ADDED_REPO_IDS=()
    
    # Add repos again
    add_response=$(curl -s -X POST "$API_URL/api/repos" \
        -H "Content-Type: application/json" \
        -d '{"url":"https://github.com/bradtraversy/react-crash-2024"}')
    repo1_id=$(echo "$add_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    [ -n "$repo1_id" ] && ADDED_REPO_IDS+=("$repo1_id")
    
    add_response=$(curl -s -X POST "$API_URL/api/repos" \
        -H "Content-Type: application/json" \
        -d '{"url":"https://github.com/bradtraversy/express-crash"}')
    repo2_id=$(echo "$add_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    [ -n "$repo2_id" ] && ADDED_REPO_IDS+=("$repo2_id")
    
    run_post_test "Run Full Pipeline" "/api/run-all" '{}' 200 "metrics"
    
    # Test SSE streaming endpoint
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: SSE Streaming Endpoint${RESET}"
    local sse_response=$(curl -s -N "$API_URL/api/run-all/stream" 2>&1 | head -5)
    if echo "$sse_response" | grep -q '"type":"info"'; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (No SSE data received)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Validate metrics in response
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: Metrics - Time Saved${RESET}"
    local metrics_response=$(curl -s -X POST "$API_URL/api/run-all")
    if echo "$metrics_response" | grep -q '"timeSaved"'; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (Missing timeSaved in metrics)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: Metrics - Cost Savings${RESET}"
    if echo "$metrics_response" | grep -q '"costSavings"'; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (Missing costSavings in metrics)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${YELLOW}Test $TESTS_RUN: Pipeline Logs Present${RESET}"
    if echo "$metrics_response" | grep -q '"logs"'; then
        echo -e "${GREEN}✓ PASSED${RESET}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (Missing logs in response)${RESET}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # ==========================================
    # Delete Repo
    # ==========================================
    if [ -n "$repo1_id" ]; then
        run_delete_test "Delete Repo" "/api/repos/$repo1_id" 200
    fi
    
    run_delete_test "Delete Repo (not found)" "/api/repos/nonexistent123" 404
    
    # ==========================================
    # Error Cases
    # ==========================================
    # Reset and test endpoints without repos
    curl -s -X POST "$API_URL/api/reset" > /dev/null
    ADDED_REPO_IDS=()
    
    run_post_test "Match (no repos)" "/api/match" '{}' 400 "error"
    run_post_test "Generate (no repos)" "/api/generate" '{}' 400 "error"
    run_post_test "Integrate (no repos)" "/api/integrate" '{}' 400 "error"
    run_post_test "Validate (no repos)" "/api/validate" '{}' 400 "error"
    run_post_test "Run-all (no repos)" "/api/run-all" '{}' 400 "error"
    
    # ==========================================
    # Reset
    # ==========================================
    run_post_test "Reset API" "/api/reset" '{}' 200 "success"
    
    print_summary
    
    [ "$TESTS_FAILED" -eq 0 ] && exit 0 || exit 1
}

main "$@"
