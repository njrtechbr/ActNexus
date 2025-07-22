#!/bin/bash

# =============================================================================
# ActNexus Backend - Setup Script
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python version
check_python() {
    if command_exists python3; then
        PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
        REQUIRED_VERSION="3.10"
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Python $PYTHON_VERSION found"
            return 0
        else
            print_error "Python $REQUIRED_VERSION or higher required. Found: $PYTHON_VERSION"
            return 1
        fi
    else
        print_error "Python 3 not found"
        return 1
    fi
}

# Check if PostgreSQL is running
check_postgres() {
    if command_exists psql; then
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            print_success "PostgreSQL is running"
            return 0
        else
            print_warning "PostgreSQL is not running or not accessible"
            return 1
        fi
    else
        print_warning "PostgreSQL client not found"
        return 1
    fi
}

# Check if MinIO is running
check_minio() {
    if curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; then
        print_success "MinIO is running"
        return 0
    else
        print_warning "MinIO is not running or not accessible"
        return 1
    fi
}

# Setup virtual environment
setup_venv() {
    print_info "Setting up Python virtual environment..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt
    print_success "Dependencies installed"
}

# Setup environment file
setup_env() {
    print_info "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Environment file created from template"
        print_warning "Please edit .env file with your configuration"
    else
        print_info "Environment file already exists"
    fi
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if we can connect to PostgreSQL
    if check_postgres; then
        # Try to create database
        print_info "Creating database if it doesn't exist..."
        
        # Source environment variables
        if [ -f ".env" ]; then
            export $(grep -v '^#' .env | xargs)
        fi
        
        # Extract database info from DATABASE_URL
        DB_NAME="actnexus"
        DB_USER="actnexus_user"
        DB_PASS="your_password"
        
        # Create database and user (ignore errors if they already exist)
        psql -h localhost -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
        psql -h localhost -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
        psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
        
        print_success "Database setup completed"
        
        # Run migrations
        print_info "Running database migrations..."
        source venv/bin/activate
        alembic upgrade head
        print_success "Migrations completed"
    else
        print_warning "Skipping database setup - PostgreSQL not available"
        print_info "You can run migrations later with: alembic upgrade head"
    fi
}

# Setup directories
setup_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p /tmp/actnexus_uploads
    mkdir -p langflow_exports
    
    print_success "Directories created"
}

# Setup Docker services
setup_docker() {
    if command_exists docker && command_exists docker-compose; then
        print_info "Docker found. You can use docker-compose to start services:"
        echo "  docker-compose up -d postgres minio redis"
        echo "  docker-compose up -d langflow  # Optional"
    else
        print_warning "Docker not found. Please install Docker to use containerized services"
    fi
}

# Main setup function
main() {
    print_header "ActNexus Backend Setup"
    
    # Check prerequisites
    print_header "Checking Prerequisites"
    
    if ! check_python; then
        print_error "Python check failed. Please install Python 3.10 or higher"
        exit 1
    fi
    
    # Setup project
    print_header "Setting Up Project"
    
    setup_directories
    setup_env
    setup_venv
    
    # Check services
    print_header "Checking Services"
    
    check_postgres
    check_minio
    
    # Setup database if PostgreSQL is available
    if check_postgres; then
        setup_database
    fi
    
    # Docker information
    print_header "Docker Services"
    setup_docker
    
    # Final instructions
    print_header "Setup Complete!"
    
    print_success "ActNexus Backend setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Edit .env file with your configuration"
    echo "  2. Start required services (PostgreSQL, MinIO, LangFlow)"
    echo "  3. Run migrations: source venv/bin/activate && alembic upgrade head"
    echo "  4. Start the development server: source venv/bin/activate && python -m app.main"
    echo ""
    print_info "Using Docker (recommended for development):"
    echo "  1. docker-compose up -d postgres minio redis"
    echo "  2. source venv/bin/activate && alembic upgrade head"
    echo "  3. python -m app.main"
    echo ""
    print_info "API will be available at: http://localhost:8000"
    print_info "API documentation: http://localhost:8000/docs"
    echo ""
}

# Run main function
main "$@"