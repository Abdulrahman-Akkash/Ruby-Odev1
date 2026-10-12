class CreateTicketEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :ticket_events do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :actor, foreign_key: { to_table: :users }
      t.string :kind, null: false
      t.string :message, null: false
      t.jsonb :data, null: false, default: {}

      t.timestamps
    end
    add_index :ticket_events, :kind
  end
end
