FROM python:3.11-slim

WORKDIR /app

COPY . .

EXPOSE 5173

CMD ["python", "-m", "http.server", "5173", "--bind", "0.0.0.0"]

