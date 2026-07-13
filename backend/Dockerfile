FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2 (Postgres driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir psycopg2-binary==2.9.9

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
