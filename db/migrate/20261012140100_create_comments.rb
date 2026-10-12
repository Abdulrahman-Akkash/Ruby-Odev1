class CreateComments < ActiveRecord::Migration[8.1]
  def change
    create_table :comments do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :author, foreign_key: { to_table: :users }
      t.text :body, null: false
      t.boolean :internal, null: false, default: false

      t.timestamps
    end
  end
end
