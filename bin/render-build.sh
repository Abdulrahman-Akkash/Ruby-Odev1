#!/usr/bin/env bash
# Render build adımı (render.yaml -> buildCommand).
set -o errexit

bundle install
bin/rails assets:precompile
bin/rails assets:clean
bin/rails db:migrate
# Veritabanı boşsa demo verisini kurar; doluysa dokunmaz.
bin/rails db:seed
