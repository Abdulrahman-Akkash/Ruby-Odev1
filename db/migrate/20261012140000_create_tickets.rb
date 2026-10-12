class CreateTickets < ActiveRecord::Migration[8.1]
  def change
    create_table :tickets do |t|
      t.string :subject, null: false
      t.text :description, null: false
      t.string :requester_name, null: false
      t.string :requester_email, null: false
      t.string :priority, null: false, default: "normal"
      t.string :status, null: false, default: "new"
      t.references :assignee, foreign_key: { to_table: :users }
      t.string :access_token, null: false

      # Zaman kuralları
      t.datetime :first_reply_due_at, null: false
      t.datetime :first_reply_risk_at, null: false
      t.datetime :first_replied_at
      t.datetime :risk_notified_at
      t.datetime :breach_notified_at
      t.datetime :solved_at
      t.datetime :closed_at

      t.timestamps
    end
    add_index :tickets, :access_token, unique: true
    add_index :tickets, :status
    add_index :tickets, :first_reply_due_at
    add_index :tickets, :first_reply_risk_at
  end
end
