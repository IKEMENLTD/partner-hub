#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running seed..."
npm run seed || echo "Seed failed or already seeded"

echo "Starting application..."
exec npm run start:dev
