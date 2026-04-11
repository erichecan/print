FROM google/cloud-sdk:slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gnupg lsb-release \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-17 \
    && rm -rf /var/lib/apt/lists/*
COPY scripts/neon-backup.sh /app/scripts/neon-backup.sh
RUN chmod +x /app/scripts/neon-backup.sh
CMD ["/app/scripts/neon-backup.sh"]
