#!/bin/bash

set -euo pipefail

# Colors for output
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
NC=$'\033[0m' # No Color

# Script information
REPO="ralsina/tocry"
BINARY_NAME="tocry"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
DATA_DIR="${DATA_DIR:-/opt/tocry}"
SERVICE_USER="${SERVICE_USER:-tocry}"
SERVICE_NAME="tocry"

# Version information
LATEST_VERSION=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | cut -d '"' -f 4 | tr -d 'v')
if [[ -z "$LATEST_VERSION" ]]; then
    echo -e "${RED}Error: Could not fetch latest version${NC}" >&2
    exit 1
fi

# Detect architecture
detect_arch() {
    local arch
    arch=$(uname -m)
    case $arch in
        x86_64|amd64)
            echo "amd64"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            echo -e "${RED}Error: Unsupported architecture: $arch${NC}" >&2
            exit 1
            ;;
    esac
}

# Detect OS
detect_os() {
    local os
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    if [[ "$os" != "linux" ]]; then
        echo -e "${RED}Error: This installer only supports Linux${NC}" >&2
        exit 1
    fi
    echo "$os"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}Warning: Running as root. Installation will be system-wide.${NC}"
    else
        echo -e "${BLUE}Running as non-root user. Will install to user directory if system-wide installation fails.${NC}"
    fi
}

# Check dependencies
check_dependencies() {
    local missing=()

    # Always need curl and tar
    for cmd in curl tar; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}Error: Missing required dependencies: ${missing[*]}${NC}" >&2
        echo -e "${YELLOW}Please install them and try again.${NC}" >&2
        exit 1
    fi
}

# Download binary
download_binary() {
    local version="$1"
    local arch="$2"
    local os="$3"
    local url="https://github.com/${REPO}/releases/download/v${version}/${BINARY_NAME}-static-linux-${arch}"
    local temp_file="/tmp/${BINARY_NAME}-${version}-${arch}"

    echo -e "${BLUE}Downloading ${BINARY_NAME} v${version} for ${arch}...${NC}" >&2

    if ! curl -sSL -f "$url" -o "$temp_file"; then
        echo -e "${RED}Error: Failed to download binary${NC}" >&2
        rm -f "$temp_file"
        exit 1
    fi

    if ! chmod +x "$temp_file"; then
        echo -e "${RED}Error: Failed to make binary executable${NC}" >&2
        rm -f "$temp_file"
        exit 1
    fi

    echo "$temp_file"
}

# Install binary system-wide
install_system_wide() {
    local binary_path="$1"
    local install_path="${INSTALL_DIR}/${BINARY_NAME}"

    if [[ ! -w "$INSTALL_DIR" ]]; then
        echo -e "${YELLOW}Cannot write to $INSTALL_DIR, trying user installation${NC}" >&2
        return 1
    fi

    mkdir -p "$INSTALL_DIR"
    mv "$binary_path" "$install_path"
    echo -e "${GREEN}✓ Installed to $install_path${NC}" >&2
    return 0
}

# Install binary for user
install_user() {
    local binary_path="$1"
    local user_bin="${HOME}/.local/bin"
    local install_path="${user_bin}/${BINARY_NAME}"

    mkdir -p "$user_bin"
    mv "$binary_path" "$install_path"

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$user_bin:"* ]]; then
        echo -e "${YELLOW}Adding $user_bin to PATH${NC}" >&2
        echo "export PATH=\"$user_bin:\$PATH\"" >> "$HOME/.bashrc"
        echo -e "${YELLOW}Run 'source ~/.bashrc' or restart your shell to use the new PATH${NC}" >&2
    fi

    echo -e "${GREEN}✓ Installed to $install_path${NC}" >&2
    return 0
}

# Create data directory
create_data_dir() {
    if [[ $EUID -eq 0 ]]; then
        mkdir -p "$DATA_DIR"
        chown -R "${SERVICE_USER}:${SERVICE_USER}" "$DATA_DIR" 2>/dev/null || true
        echo -e "${GREEN}✓ Data directory created at $DATA_DIR${NC}" >&2
    else
        local user_data="${HOME}/.local/share/tocry"
        mkdir -p "$user_data"
        echo -e "${GREEN}✓ Data directory created at $user_data${NC}"
        DATA_DIR="$user_data"
    fi
}

# Create systemd service (optional)
create_systemd_service() {
    if [[ $EUID -ne 0 ]]; then
        return 0
    fi

    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"

    cat > "/tmp/${SERVICE_NAME}.service" << EOF
[Unit]
Description=ToCry Kanban Board
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${DATA_DIR}
ExecStart=${INSTALL_DIR}/${BINARY_NAME} --data-path ${DATA_DIR}
Restart=always
RestartSec=3
Environment=PATH=/usr/bin:/usr/local/bin
Environment=TOCRY_DATA_DIR=${DATA_DIR}

[Install]
WantedBy=multi-user.target
EOF

    if sudo mv "/tmp/${SERVICE_NAME}.service" "$service_file"; then
        sudo systemctl daemon-reload
        sudo systemctl enable "${SERVICE_NAME}" 2>/dev/null || true
        echo -e "${GREEN}✓ Systemd service created${NC}" >&2
        echo -e "${BLUE}You can start the service with: sudo systemctl start ${SERVICE_NAME}${NC}" >&2
    fi
}

# Show post-install instructions
show_instructions() {
    echo -e "\n${GREEN}🎉 ToCry has been successfully installed!${NC}"
    echo -e "\n${BLUE}Quick Start:${NC}"
    echo -e "  Run: ${BINARY_NAME}"
    echo -e "  This will start the server on http://localhost:3000"

    echo -e "\n${BLUE}Data Directory:${NC}"
    echo -e "  For non-root users: ~/.local/share/tocry"
    echo -e "  For root users: data (or use --data-path)"

    echo -e "\n${BLUE}Configuration:${NC}"
    echo -e "  You can set environment variables for authentication:"
    echo -e "  - Google OAuth: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo -e "  - Basic Auth: TOCRY_AUTH_USER and TOCRY_AUTH_PASS"

    if [[ $EUID -eq 0 ]] && [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
        echo -e "\n${BLUE}Service Management:${NC}"
        echo -e "  Start: sudo systemctl start ${SERVICE_NAME}"
        echo -e "  Stop: sudo systemctl stop ${SERVICE_NAME}"
        echo -e "  Status: sudo systemctl status ${SERVICE_NAME}"
        echo -e "  Logs: sudo journalctl -u ${SERVICE_NAME}"
    fi

    echo -e "\n${YELLOW}To uninstall, run: curl -sSL https://github.com/${REPO}/raw/main/install.sh | bash -s -- --uninstall${NC}"
}

# Uninstall function
uninstall() {
    echo -e "${BLUE}Uninstalling ${BINARY_NAME}...${NC}"

    # Remove binary
    if [[ -f "${INSTALL_DIR}/${BINARY_NAME}" ]]; then
        if [[ $EUID -eq 0 ]]; then
            sudo rm -f "${INSTALL_DIR}/${BINARY_NAME}"
        else
            rm -f "${HOME}/.local/bin/${BINARY_NAME}"
        fi
        echo -e "${GREEN}✓ Binary removed${NC}"
    fi

    # Remove systemd service
    if [[ $EUID -eq 0 ]] && [[ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]]; then
        sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
        sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        sudo systemctl daemon-reload
        echo -e "${GREEN}✓ Systemd service removed${NC}"
    fi

    # Remove data directory (optional)
    if [[ -d "$DATA_DIR" ]]; then
        echo -e "${YELLOW}Data directory $DATA_DIR was not removed. Remove it manually if needed.${NC}"
    fi

    echo -e "${GREEN}✓ ${BINARY_NAME} has been uninstalled${NC}"
    exit 0
}

# Main function
main() {
    # Parse command line arguments
    for arg in "$@"; do
        case $arg in
            --uninstall)
                uninstall
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --uninstall  Uninstall ToCry"
                echo "  --help       Show this help message"
                echo ""
                echo "Environment variables:"
                echo "  INSTALL_DIR   Installation directory (default: /usr/local/bin)"
                echo "  DATA_DIR      Data directory (default: /opt/tocry)"
                echo "  SERVICE_USER  Service user (default: tocry)"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $arg${NC}" >&2
                echo "Use --help for usage information" >&2
                exit 1
                ;;
        esac
    done

    echo -e "${BLUE}Installing ${BINARY_NAME} v${LATEST_VERSION}...${NC}"

    # System checks
    check_dependencies
    check_root
    local arch
    arch=$(detect_arch)
    local os
    os=$(detect_os)

    # Download
    local temp_binary
    temp_binary=$(download_binary "$LATEST_VERSION" "$arch" "$os")

    # Installation
    if ! install_system_wide "$temp_binary"; then
        install_user "$temp_binary"
    fi

    # Setup
    create_systemd_service

    # Clean up
    if [[ -f "$temp_binary" ]]; then
        rm -f "$temp_binary"
    fi

    show_instructions
}

# Run main function
main "$@"
