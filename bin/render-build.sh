#!/usr/bin/env bash
# Render build adımı (render.yaml -> buildCommand, ya da elle: ./bin/render-build.sh).
set -o errexit

if [ -z "$DATABASE_URL" ]; then
  echo "HATA: DATABASE_URL tanımlı değil." >&2
  echo "Render'da bir PostgreSQL oluşturup 'Internal Database URL' değerini bu web servisine" >&2
  echo "DATABASE_URL ortam değişkeni olarak ekleyin (ya da New -> Blueprint ile render.yaml'ı kullanın)." >&2
  exit 1
fi

bundle install
# Asset derlemesi gerçek bir gizli anahtar gerektirmez.
SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
SECRET_KEY_BASE_DUMMY=1 bin/rails assets:clean
bin/rails db:migrate
# Veritabanı boşsa demo verisini kurar; doluysa dokunmaz.
bin/rails db:seed
