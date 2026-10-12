# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_12_140200) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "comments", force: :cascade do |t|
    t.bigint "ticket_id", null: false
    t.bigint "author_id"
    t.text "body", null: false
    t.boolean "internal", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_comments_on_author_id"
    t.index ["ticket_id"], name: "index_comments_on_ticket_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "ticket_events", force: :cascade do |t|
    t.bigint "ticket_id", null: false
    t.bigint "actor_id"
    t.string "kind", null: false
    t.string "message", null: false
    t.jsonb "data", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_ticket_events_on_actor_id"
    t.index ["kind"], name: "index_ticket_events_on_kind"
    t.index ["ticket_id"], name: "index_ticket_events_on_ticket_id"
  end

  create_table "tickets", force: :cascade do |t|
    t.string "subject", null: false
    t.text "description", null: false
    t.string "requester_name", null: false
    t.string "requester_email", null: false
    t.string "priority", default: "normal", null: false
    t.string "status", default: "new", null: false
    t.bigint "assignee_id"
    t.string "access_token", null: false
    t.datetime "first_reply_due_at", null: false
    t.datetime "first_reply_risk_at", null: false
    t.datetime "first_replied_at"
    t.datetime "risk_notified_at"
    t.datetime "breach_notified_at"
    t.datetime "solved_at"
    t.datetime "closed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["access_token"], name: "index_tickets_on_access_token", unique: true
    t.index ["assignee_id"], name: "index_tickets_on_assignee_id"
    t.index ["first_reply_due_at"], name: "index_tickets_on_first_reply_due_at"
    t.index ["first_reply_risk_at"], name: "index_tickets_on_first_reply_risk_at"
    t.index ["status"], name: "index_tickets_on_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "on_shift_until"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "comments", "tickets"
  add_foreign_key "comments", "users", column: "author_id"
  add_foreign_key "sessions", "users"
  add_foreign_key "ticket_events", "tickets"
  add_foreign_key "ticket_events", "users", column: "actor_id"
  add_foreign_key "tickets", "users", column: "assignee_id"
end
