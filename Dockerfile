FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

# Layer 1: TeX Live + system fonts (~2-3GB, cached unless base image changes)
# Pre-accept Microsoft fonts EULA for non-interactive install
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" \
    | debconf-set-selections

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-base \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-bibtex-extra \
    texlive-plain-generic \
    ttf-mscorefonts-installer \
    fontconfig \
    && fc-cache -f \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# Layer 2: Python deps (cached unless requirements.txt changes)
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: Application code
WORKDIR /app
COPY backend/ /app/backend/

# Non-root user + writable data dirs
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser \
    && mkdir -p /app/backend/user_data/versions \
    && chown -R appuser:appuser /app/backend/user_data \
    && rm -rf /app/backend/venv /app/backend/__pycache__ /app/backend/tests \
              /app/backend/.env /app/backend/.env.example /app/backend/.pytest_cache \
    && find /app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

USER appuser
WORKDIR /app/backend
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
